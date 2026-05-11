// Deno Edge Function: delete-kid-auth
// Deletes the auth user for a kid so their initials/email can be reused.
// Invoked from ManageKids.handleDelete after the kid row is removed.
//
// Deploy:   supabase functions deploy delete-kid-auth --no-verify-jwt
// Secrets:  supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
//
// The function requires the caller to pass a logged-in admin's JWT in the
// Authorization header. It verifies the caller is an admin before deleting.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY      = Deno.env.get('SERVICE_ROLE_KEY')!
const ANON_KEY              = Deno.env.get('SUPABASE_ANON_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

    // Verify caller is an admin
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) return json({ error: 'Invalid session' }, 401)

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const { data: adminRow } = await admin.from('admins').select('id').eq('user_id', user.id).maybeSingle()
    if (!adminRow) return json({ error: 'Not an admin' }, 403)

    const { auth_user_id, email } = await req.json()
    if (!auth_user_id && !email) return json({ error: 'auth_user_id or email required' }, 400)

    let targetId = auth_user_id as string | undefined

    if (!targetId && email) {
      // Look up the auth user by email (paginated list)
      let page = 1
      while (!targetId) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
        if (error) return json({ error: error.message }, 500)
        const match = data.users.find(u => u.email?.toLowerCase() === String(email).toLowerCase())
        if (match) { targetId = match.id; break }
        if (data.users.length < 200) break
        page++
      }
      if (!targetId) return json({ error: 'No auth user found for that email' }, 404)
    }

    const { error: delErr } = await admin.auth.admin.deleteUser(targetId!)
    if (delErr) return json({ error: delErr.message }, 500)

    return json({ ok: true, deleted: targetId })
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
