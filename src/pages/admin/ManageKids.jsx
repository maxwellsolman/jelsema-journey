import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { format, addHours } from 'date-fns'
import { UserPlus, Pencil, UserX, CheckCircle2, X } from 'lucide-react'

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

export default function ManageKids() {
  const [kids, setKids]       = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  // Form state
  const [initials, setInitials]         = useState('')
  const [displayName, setDisplayName]   = useState('')
  const [intakeDate, setIntakeDate]     = useState(format(new Date(), 'yyyy-MM-dd'))
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [error, setError]               = useState('')

  function resetForm() {
    setInitials(''); setDisplayName(''); setIntakeDate(format(new Date(), 'yyyy-MM-dd'))
    setEmail(''); setPassword(''); setError('')
  }

  useEffect(() => { loadKids() }, [saved])

  async function loadKids() {
    const { data } = await supabase.from('kids').select('*').order('initials')
    setKids(data || [])
  }

  async function handleAdd() {
    if (!initials || !email || !password) { setError('Initials, email, and password are required.'); return }
    setSaving(true); setError('')

    // Create auth user
    const { data: authData, error: authErr } = await supabase.auth.admin
      ? { data: null, error: { message: 'Use service role for user creation' } }
      : { data: null, error: null }

    // For MVP: create auth user via signUp (admin must be signed in)
    // In production, use a server-side function with service role key
    const { data: newUser, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: 'kid' } }
    })

    if (signUpErr) { setError(signUpErr.message); setSaving(false); return }

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
    setSaved(v => !v)
    setShowAdd(false)
    resetForm()
  }

  async function handleDeactivate(kid) {
    if (!confirm(`Deactivate ${kid.initials}? They won't appear in active lists but data is preserved.`)) return
    await supabase.from('kids').update({ is_active: false }).eq('id', kid.id)
    setSaved(v => !v)
  }

  async function handleReactivate(kid) {
    await supabase.from('kids').update({ is_active: true }).eq('id', kid.id)
    setSaved(v => !v)
  }

  const active   = kids.filter(k => k.is_active)
  const inactive = kids.filter(k => !k.is_active)

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

      {/* Active kids */}
      <div className="space-y-2">
        {active.map(kid => (
          <div key={kid.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                {kid.initials}
              </div>
              <div>
                <div className="font-bold text-slate-800">{kid.initials}</div>
                <div className="text-xs text-slate-400">
                  Intake: {kid.intake_date ? format(new Date(kid.intake_date), 'MMM d, yyyy') : '—'}
                  {kid.orientation_end_at && new Date(kid.orientation_end_at) > new Date() && (
                    <span className="ml-2 text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded text-xs">Orientation</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => handleDeactivate(kid)}
                className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Deactivate">
                <UserX size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Inactive kids */}
      {inactive.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">Inactive / Discharged</h2>
          <div className="space-y-2">
            {inactive.map(kid => (
              <div key={kid.id} className="bg-slate-50 rounded-xl border border-slate-100 px-5 py-3 flex items-center justify-between opacity-60">
                <div className="font-medium text-slate-500">{kid.initials}</div>
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
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Initials *</label>
                <input value={initials} onChange={e => setInitials(e.target.value.toUpperCase())} maxLength={4} placeholder="AB"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 uppercase" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Display Name</label>
                <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Optional"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Intake Date *</label>
              <input type="date" value={intakeDate} onChange={e => setIntakeDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Login Email *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="kid@jelsema.app"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Password *</label>
              <input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Set a temporary password"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              <p className="text-xs text-slate-400 mt-1">The youth will use this to log in.</p>
            </div>
            {error && <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg border border-red-100">{error}</div>}
            <button onClick={handleAdd} disabled={saving}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition-colors disabled:opacity-60">
              {saving ? 'Creating…' : 'Add Youth'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
