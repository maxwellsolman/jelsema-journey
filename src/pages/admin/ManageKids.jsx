import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { format, addHours } from 'date-fns'
import { UserPlus, UserX, X, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import { syncKid } from '../../lib/sheets'

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

function toKidEmail(initials) {
  return `${initials.trim().toLowerCase()}@jelsema.app`
}

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
  const [newKidCreds, setNewKidCreds] = useState(null)
  const [showDischarged, setShowDischarged] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null) // kid to confirm delete
  const [deleteTyped, setDeleteTyped]     = useState('')

  const [initials, setInitials]               = useState('')
  const [displayName, setDisplayName]         = useState('')
  const [intakeDate, setIntakeDate]           = useState(format(new Date(), 'yyyy-MM-dd'))
  const [birthday, setBirthday]               = useState('')
  const [openingPoints, setOpeningPoints]     = useState('')
  const [openingDollars, setOpeningDollars]   = useState('')
  const [isExisting, setIsExisting]           = useState(false)
  const [originalIntake, setOriginalIntake]   = useState('')
  const [priorNotes, setPriorNotes]           = useState('')
  const [error, setError]                     = useState('')

  function resetForm() {
    setInitials(''); setDisplayName('')
    setIntakeDate(format(new Date(), 'yyyy-MM-dd'))
    setBirthday('')
    setOpeningPoints(''); setOpeningDollars('')
    setIsExisting(false); setOriginalIntake(''); setPriorNotes('')
    setError('')
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

    const { data: { session: adminSession } } = await supabase.auth.getSession()

    const { data: newUser, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: 'kid' } },
    })

    if (signUpErr) {
      if (signUpErr.message?.toLowerCase().includes('already') || signUpErr.status === 422) {
        setError(`A youth with initials "${initials.toUpperCase()}" already exists. Use different initials.`)
      } else {
        setError(signUpErr.message)
      }
      setSaving(false)
      return
    }

    if (adminSession) {
      await supabase.auth.setSession({
        access_token:  adminSession.access_token,
        refresh_token: adminSession.refresh_token,
      })
    }

    const orientationEnd = addHours(new Date(intakeDate), 48).toISOString()
    const openPts  = parseInt(openingPoints)   || 0
    const openDol  = parseFloat(openingDollars) || 0

    const { data: newKid, error: insertErr } = await supabase.from('kids').insert({
      initials: initials.toUpperCase(),
      display_name: displayName || initials.toUpperCase(),
      intake_date: intakeDate,
      orientation_end_at: orientationEnd,
      is_active: true,
      user_id: newUser.user?.id,
      opening_points: openPts,
      opening_dollars: openDol,
      is_existing: isExisting,
      original_intake_date: isExisting && originalIntake ? originalIntake : null,
      prior_notes: isExisting ? (priorNotes || null) : null,
    }).select('id').single()

    if (insertErr) { setError(insertErr.message); setSaving(false); return }

    setSaving(false)
    setShowAdd(false)
    syncKid({ id: newKid?.id, initials: initials.toUpperCase(), display_name: displayName || initials.toUpperCase(), intake_date: intakeDate, is_active: true })
    setNewKidCreds({
      initials: initials.toUpperCase(),
      password,
      openingPoints: openPts,
      openingDollars: openDol,
    })
    resetForm()
    setSaved(v => !v)
  }

  async function handleDischarge(kid) {
    if (!confirm(`Discharge ${kid.initials}? They'll be hidden from the dashboard but their history is preserved.`)) return
    await supabase.from('kids').update({ is_active: false }).eq('id', kid.id)
    setSaved(v => !v)
  }

  async function handleReactivate(kid) {
    await supabase.from('kids').update({ is_active: true }).eq('id', kid.id)
    setSaved(v => !v)
  }

  async function handleDelete(kid) {
    // Cascade delete all records for this kid
    await Promise.all([
      supabase.from('kid_notes').delete().eq('kid_id', kid.id),
      supabase.from('daily_logs').delete().eq('kid_id', kid.id),
      supabase.from('canteen_redemptions').delete().eq('kid_id', kid.id),
      supabase.from('daily_earnings').delete().eq('kid_id', kid.id),
    ])
    await supabase.from('kids').delete().eq('id', kid.id)

    // Also delete their auth user so initials can be reused
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session && kid.user_id) {
        await fetch(`${supabase.supabaseUrl}/functions/v1/delete-kid-auth`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type':  'application/json',
            'apikey':         supabase.supabaseKey,
          },
          body: JSON.stringify({ auth_user_id: kid.user_id }),
        })
      }
    } catch (err) {
      console.warn('Auth user cleanup failed (kid row already deleted):', err)
    }

    setDeleteConfirm(null)
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
          {(newKidCreds.openingPoints > 0 || newKidCreds.openingDollars > 0) && (
            <div className="text-sm text-emerald-700 bg-emerald-100 rounded-xl px-3 py-2 space-y-0.5">
              {newKidCreds.openingPoints > 0 && <div>✅ Opening points balance: <strong>{newKidCreds.openingPoints}</strong></div>}
              {newKidCreds.openingDollars > 0 && <div>✅ Opening dollar balance: <strong>${newKidCreds.openingDollars.toFixed(2)}</strong></div>}
            </div>
          )}
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
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  {kid.initials}
                  {kid.is_existing && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">Existing</span>
                  )}
                </div>
                <div className="text-xs text-slate-400 space-x-2">
                  <span>Login: <strong className="text-slate-600">{kid.initials}</strong></span>
                  {kid.intake_date && <span>· Intake: {format(new Date(kid.intake_date + 'T12:00:00'), 'MMM d, yyyy')}</span>}
                  {kid.last_paid_out_at && (
                    <span>· Last paid: {format(new Date(kid.last_paid_out_at), 'MMM d')}</span>
                  )}
                  {kid.orientation_end_at && new Date(kid.orientation_end_at) > new Date() && (
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded">Orientation</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleDischarge(kid)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-400 hover:text-orange-500 hover:bg-orange-50 transition-colors text-xs font-semibold border border-transparent hover:border-orange-100">
                <UserX size={14} />
                Discharge
              </button>
              <button
                onClick={() => { setDeleteConfirm(kid); setDeleteTyped('') }}
                title="Delete youth and all their data"
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Discharged section (collapsible) */}
      {inactive.length > 0 && (
        <div>
          <button
            onClick={() => setShowDischarged(v => !v)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-600 transition-colors mb-2"
          >
            {showDischarged ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            Discharged Alumni ({inactive.length})
          </button>
          {showDischarged && (
            <div className="space-y-2">
              {inactive.map(kid => (
                <div key={kid.id} className="bg-slate-50 rounded-xl border border-slate-100 px-5 py-3 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-slate-500">{kid.initials}</span>
                    {kid.intake_date && <span className="text-xs text-slate-400 ml-2">Intake: {format(new Date(kid.intake_date + 'T12:00:00'), 'MMM d, yyyy')}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleReactivate(kid)}
                      className="text-xs text-emerald-600 hover:underline font-semibold">Reactivate</button>
                    <button
                      onClick={() => { setDeleteConfirm(kid); setDeleteTyped('') }}
                      title="Delete all data"
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Date Added to System</label>
              <input type="date" value={intakeDate} onChange={e => setIntakeDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>

            {/* Existing youth toggle */}
            <label className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl border border-amber-100 bg-amber-50 cursor-pointer">
              <input
                type="checkbox"
                checked={isExisting}
                onChange={e => setIsExisting(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-amber-500"
              />
              <div className="text-xs text-amber-800">
                <div className="font-bold">Existing youth (already in program)</div>
                <div>Check this if the youth was in the paper system before this app.</div>
              </div>
            </label>

            {isExisting && (
              <div className="space-y-3 px-3 py-3 rounded-xl border border-amber-100 bg-amber-50/40">
                <div>
                  <label className="block text-xs font-semibold text-amber-800 mb-1.5">Original Intake Date</label>
                  <input type="date" value={originalIntake} onChange={e => setOriginalIntake(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-amber-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                  <p className="text-xs text-amber-700 mt-1">When the youth originally came into the shelter.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-800 mb-1.5">Prior Notes (optional)</label>
                  <textarea
                    rows={2}
                    value={priorNotes}
                    onChange={e => setPriorNotes(e.target.value)}
                    placeholder="Anything carry-over from paper records…"
                    className="w-full px-3 py-2 rounded-xl border border-amber-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  />
                </div>
              </div>
            )}

            {/* Opening balances */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  Opening Points <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={openingPoints}
                  onChange={e => setOpeningPoints(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  Opening Dollars <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={openingDollars}
                  onChange={e => setOpeningDollars(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>
            <p className="text-xs text-slate-400 -mt-2">
              Carry-over balances from the paper system. Added to the youth's wallet on day one. Excluded from trend charts and weekly leaderboards.
            </p>

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

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <Modal title="Delete Youth" onClose={() => setDeleteConfirm(null)}>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 space-y-1">
              <p className="font-bold">⚠️ This cannot be undone.</p>
              <p>Deleting <strong>{deleteConfirm.initials}</strong> will permanently remove all of their daily logs, notes, canteen history, and earnings records.</p>
            </div>
            <p className="text-sm text-slate-600">To just hide them from the dashboard while keeping history, use <strong>Discharge</strong> instead.</p>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Type <strong>{deleteConfirm.initials}</strong> to confirm
              </label>
              <input
                value={deleteTyped}
                onChange={e => setDeleteTyped(e.target.value.toUpperCase())}
                placeholder={deleteConfirm.initials}
                className="w-full px-3 py-2.5 rounded-xl border border-red-200 text-sm font-bold tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleteTyped !== deleteConfirm.initials}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Delete All Data
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
