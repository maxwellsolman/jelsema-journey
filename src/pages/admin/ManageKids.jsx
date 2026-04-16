import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { format, addHours } from 'date-fns'
import { UserPlus, UserX, X, Copy, CheckCircle2 } from 'lucide-react'

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

// Convert initials to the fake email used for Supabase auth
function toKidEmail(initials) {
  return `${initials.trim().toLowerCase()}@jelsema.app`
}

// Convert birthday date string (yyyy-MM-dd) to MMDDYYYY password format
function birthdayToPassword(dateStr) {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-')
  return `${month}${day}${year}`
}

export default function ManageKids() {
  const [kids, setKids]       = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [newKidCreds, setNewKidCreds] = useState(null) // show login info after creation

  // Form state
  const [initials, setInitials]       = useState('')
  const [displayName, setDisplayName] = useState('')
  const [intakeDate, setIntakeDate]   = useState(format(new Date(), 'yyyy-MM-dd'))
  const [birthday, setBirthday]       = useState('')
  const [error, setError]             = useState('')

  function resetForm() {
    setInitials(''); setDisplayName('')
    setIntakeDate(format(new Date(), 'yyyy-MM-dd'))
    setBirthday(''); setError('')
  }

  useEffect(() => { loadKids() }, [saved])

  async function loadKids() {
    const { data } = await supabase.from('kids').select('*').order('initials')
    setKids(data || [])
  }

  async function handleAdd() {
    if (!initials) { setError('Initials are required.'); return }
    if (!birthday) { setError('Birthday is required — it sets their default password.'); return }
    setSaving(true); setError('')

    const email    = toKidEmail(initials)
    const password = birthdayToPassword(birthday)

    // Save admin session BEFORE signUp — signUp auto-signs in the new user
    const { data: { session: adminSession } } = await supabase.auth.getSession()

    const { data: newUser, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: 'kid' } },
    })

    if (signUpErr) {
      setError(signUpErr.message)
      setSaving(false)
      return
    }

    // Immediately restore admin session so the kids INSERT passes RLS
    if (adminSession) {
      await supabase.auth.setSession({
        access_token:  adminSession.access_token,
        refresh_token: adminSession.refresh_token,
      })
    }

    // Confirm user immediately (no email verification for kids)
    // This is handled by the SQL we already ran: email_confirmed_at
    // For new users, we do it via a quick update if possible, or it auto-confirms
    // in the Supabase dashboard since email confirmation is disabled

    const orientationEnd = addHours(new Date(intakeDate), 48).toISOString()

    const { error: insertErr } = await supabase.from('kids').insert({
      initials: initials.toUpperCase(),
      display_name: displayName || initials.toUpperCase(),
      intake_date: intakeDate,
      orientation_end_at: orientationEnd,
      is_active: true,
      user_id: newUser.user?.id,
    })

    if (insertErr) { setError(insertErr.message); setSaving(false); return }

    setSaving(false)
    setShowAdd(false)
    setNewKidCreds({ initials: initials.toUpperCase(), password })
    resetForm()
    setSaved(v => !v)
  }

  async function handleDeactivate(kid) {
    if (!confirm(`Discharge ${kid.initials}? Their history is preserved. You can reactivate any time.`)) return
    await supabase.from('kids').update({ is_active: false }).eq('id', kid.id)
    setSaved(v => !v)
  }

  async function handleReactivate(kid) {
    await supabase.from('kids').update({ is_active: true }).eq('id', kid.id)
    setSaved(v => !v)
  }

  const active   = kids.filter(k => k.is_active)
  const inactive = kids.filter(k => !k.is_active)
  const defaultPassword = birthday ? birthdayToPassword(birthday) : 'MMDDYYYY'

  return (
    <div className="p-6 space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manage Kids</h1>
          <p className="text-slate-500 text-sm">{active.length} active youth</p>
        </div>
        <button onClick={() => { resetForm(); setShowAdd(true) }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors shadow">
          <UserPlus size={16} /> Add Youth
        </button>
      </div>

      {/* Credentials banner after creation */}
      {newKidCreds && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
          <div className="font-bold text-emerald-700 flex items-center gap-2">
            <CheckCircle2 size={18} /> Youth account created!
          </div>
          <div className="text-sm text-slate-600">Share these login details with the youth:</div>
          <div className="bg-white rounded-xl border border-emerald-200 p-3 space-y-1 font-mono text-sm">
            <div><span className="text-slate-500">Username:</span> <strong>{newKidCreds.initials}</strong></div>
            <div><span className="text-slate-500">Password:</span> <strong>{newKidCreds.password}</strong></div>
          </div>
          <button onClick={() => setNewKidCreds(null)} className="text-xs text-slate-400 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Active kids */}
      <div className="space-y-2">
        {active.length === 0 && (
          <div className="text-slate-400 text-sm text-center bg-white rounded-2xl p-8 border border-slate-100">
            No active youth. Click "Add Youth" to get started.
          </div>
        )}
        {active.map(kid => (
          <div key={kid.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                {kid.initials}
              </div>
              <div>
                <div className="font-bold text-slate-800">{kid.initials}</div>
                <div className="text-xs text-slate-400 space-x-2">
                  <span>Login: <strong className="text-slate-600">{kid.initials}</strong></span>
                  {kid.intake_date && <span>· Intake: {format(new Date(kid.intake_date), 'MMM d, yyyy')}</span>}
                  {kid.orientation_end_at && new Date(kid.orientation_end_at) > new Date() && (
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded">Orientation</span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={() => handleDeactivate(kid)}
              className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Discharge">
              <UserX size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Inactive kids */}
      {inactive.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">Discharged Alumni</h2>
          <div className="space-y-2">
            {inactive.map(kid => (
              <div key={kid.id} className="bg-slate-50 rounded-xl border border-slate-100 px-5 py-3 flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-500">{kid.initials}</span>
                  {kid.intake_date && <span className="text-xs text-slate-400 ml-2">Intake: {format(new Date(kid.intake_date), 'MMM d, yyyy')}</span>}
                </div>
                <button onClick={() => handleReactivate(kid)}
                  className="text-xs text-emerald-600 hover:underline font-semibold">Reactivate</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <Modal title="Add New Youth" onClose={() => setShowAdd(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Initials * (2–4 letters)</label>
                <input value={initials} onChange={e => setInitials(e.target.value.toUpperCase())} maxLength={4}
                  placeholder="e.g. AB" autoFocus
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 uppercase font-bold tracking-widest" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Display Name</label>
                <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Optional"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Birthday * (sets default password)</label>
              <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              {birthday && (
                <p className="text-xs text-emerald-600 mt-1 font-medium">
                  Default password will be: <strong>{defaultPassword}</strong>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Intake Date</label>
              <input type="date" value={intakeDate} onChange={e => setIntakeDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 text-xs text-blue-700">
              <strong>Login info:</strong> Username = <strong>{initials || 'their initials'}</strong> · Password = birthday (e.g. 11182001)
            </div>

            {error && <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg border border-red-100">{error}</div>}

            <button onClick={handleAdd} disabled={saving || !initials || !birthday}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition-colors disabled:opacity-50">
              {saving ? 'Creating account…' : 'Add Youth'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
