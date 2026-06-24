import { supabase } from './supabase'

const FN_URL = `${supabase.supabaseUrl}/functions/v1/manage-user`

async function call(action, payload) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not signed in')

  const res = await fetch(FN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey':         supabase.supabaseKey,
      'Content-Type':   'application/json',
    },
    body: JSON.stringify({ action, ...payload }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
  return body
}

export function createAdmin({ initials, name, password, birthday, is_super_admin }) {
  return call('create_admin', { initials, name, password, birthday, is_super_admin })
}

export function resetPassword({ user_id, new_password }) {
  return call('reset_password', { user_id, new_password })
}

export function deleteAdmin({ admin_id }) {
  return call('delete_admin', { admin_id })
}

export function updateEmail({ user_id, new_email }) {
  return call('update_email', { user_id, new_email })
}

export function birthdayToPassword(dateStr) {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-')
  return `${month}${day}${year}`
}
