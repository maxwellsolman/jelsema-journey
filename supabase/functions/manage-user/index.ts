// Deno Edge Function: manage-user
// Handles privileged auth operations for super-admins:
//   - create_admin   { initials, name, password, birthday?, is_super_admin }
//   - reset_password { user_id, new_password }
//   - delete_admin   { admin_id }
//   - update_email   { user_id, new_email }
//
// Deploy:   supabase functions deploy manage-user --no-verify-jwt
// Secrets:  supabase secrets set SERVICE_ROLE_KEY=<service-role-key>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!
const ANON_KEY         = Deno.env.get('SUPABASE_ANON_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function staffEmail(initials: string) {
  return `${initials.trim().toLowerCase()}@jelsema.staff`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) return json({ error: 'Invalid session' }, 401)

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const { data: callerAdmin } = await admin.from('admins')
      .select('id, is_super_admin')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!callerAdmin) return json({ error: 'Not an admin' }, 403)

    const body = await req.json()
    const action = body.action as string

    // Actions that mutate the admin team require super-admin
    const superOnly = ['create_admin', 'delete_admin']
    if (superOnly.includes(action) && !callerAdmin.is_super_admin) {
      return json({ error: 'Super-admin only' }, 403)
    }

    switch (action) {
      case 'create_admin': {
        const { initials, name, password, birthday, is_super_admin } = body
        if (!initials || !password || !name) {
          return json({ error: 'initials, name, password required' }, 400)
        }
        if (String(password).length < 6) {
          return json({ error: 'password must be at least 6 characters' }, 400)
        }
        const email = staffEmail(initials)

        const { data: created, error: signUpErr } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { role: 'admin' },
        })
        if (signUpErr) return json({ error: signUpErr.message }, 400)

        const { error: insertErr } = await admin.from('admins').insert({
          user_id: created.user.id,
          name,
          initials: String(initials).toUpperCase(),
          is_super_admin: !!is_super_admin,
          birthday: birthday || null,
        })
        if (insertErr) {
          // Roll back the auth user if the admins row failed
          await admin.auth.admin.deleteUser(created.user.id)
          return json({ error: insertErr.message }, 400)
        }
        return json({ ok: true, user_id: created.user.id, email, password })
      }

      case 'reset_password': {
        const { user_id, new_password } = body
        if (!user_id || !new_password) {
          return json({ error: 'user_id and new_password required' }, 400)
        }
        // Non-super admins can only reset kids' passwords, not other admins
        if (!callerAdmin.is_super_admin) {
          const { data: targetAdmin } = await admin.from('admins')
            .select('id').eq('user_id', user_id).maybeSingle()
          if (targetAdmin) return json({ error: 'Only super-admins can reset staff passwords' }, 403)
        }
        const { error } = await admin.auth.admin.updateUserById(user_id, { password: new_password })
        if (error) return json({ error: error.message }, 400)
        return json({ ok: true })
      }

      case 'delete_admin': {
        const { admin_id } = body
        if (!admin_id) return json({ error: 'admin_id required' }, 400)
        if (admin_id === callerAdmin.id) return json({ error: "Can't delete yourself" }, 400)

        const { data: target } = await admin.from('admins')
          .select('id, user_id').eq('id', admin_id).maybeSingle()
        if (!target) return json({ error: 'Admin not found' }, 404)

        await admin.from('admins').delete().eq('id', admin_id)
        if (target.user_id) {
          await admin.auth.admin.deleteUser(target.user_id)
        }
        return json({ ok: true })
      }

      case 'update_email': {
        // Used when changing a kid's initials (their email = initials)
        const { user_id, new_email } = body
        if (!user_id || !new_email) return json({ error: 'user_id and new_email required' }, 400)
        const { error } = await admin.auth.admin.updateUserById(user_id, {
          email: new_email,
          email_confirm: true,
        })
        if (error) return json({ error: error.message }, 400)
        return json({ ok: true })
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400)
    }
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
