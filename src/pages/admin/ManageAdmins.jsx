import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { UserPlus, X, CheckCircle2, KeyRound, Shield, Lock } from 'lucide-react'
import { format } from 'date-fns'
import { createAdmin, resetPassword, deleteAdmin } from '../../lib/manageUser'

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

export default function ManageAdmins() {
  const { profile, user } = useAuth()
  const [unlocked, setUnlocked] = useState(false)
  const [unlockPw, setUnlockPw] = useState('')
  const [unlockErr, setUnlockErr] = useState('')
  const [unlocking, setUnlocking] = useState(false)

  const [admins, setAdmins]   = useState([])
  const [reload, setReload]   = useState(0)
  const [showAdd, setShowAdd] = useState(false)
  const [newCreds, setNewCreds] = useState(null)
  const [resetFor, setResetFor] = useState(null)
  const [resetPw, setResetPw]   = useState('')
  const [resetDone, setResetDone] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [deleteFor, setDeleteFor] = useState(null)
  const [error, setError]   = useState('')

  // Add form
  const [name, setName]           = useState('')
  const [initials, setInitials]   = useState('')
  const [password, setPassword]   = useState('')
  const [birthday, setBirthday]   = useState('')
  const [isSuper, setIsSuper]     = useState(false)
  const [saving, setSaving]       = useState(false)

  // Gate non-super admins out entirely
  if (profile && profile.role === 'admin' && !profile.is_super_admin) {
    return <Navigate to="/admin" replace />
  }

  useEffect(() => {
    if (!unlocked) return
    supabase.from('admins').select('*').order('name')
      .then(({ data }) => setAdmins(data || []))
  }, [reload, unlocked])

  async function handleUnlock(e) {
    e.preventDefault()
    setUnlocking(true); setUnlockErr('')
    const { error } = await supabase.auth.signInWithPassword({
      email:    user.email,
      password: unlockPw,
    })
    setUnlocking(false)
    if (error) { setUnlockErr('Wrong password.'); return }
    setUnlocked(true)
    setUnlockPw('')
  }

  function resetAdd() {
    setName(''); setInitials(''); setPassword(''); setBirthday(''); setIsSuper(false); setError('')
  }

  async function handleAdd() {
    if (!name || !initials || !password) { setError('Name, initials, and password are required.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setSaving(true); setError('')
    try {
      const res = await createAdmin({ name, initials, password, birthday: birthday || null, is_super_admin: isSuper })
      setNewCreds({ initials: initials.toUpperCase(), password: res.password })
      setShowAdd(false)
      resetAdd()
      setReload(r => r + 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    if (!resetPw || resetPw.length < 6) { setError('Password must be at least 6 characters.'); return }
    setResetting(true); setError('')
    try {
      await resetPassword({ user_id: resetFor.user_id, new_password: resetPw })
      setResetDone(true)
      setTimeout(() => {
        setResetFor(null); setResetPw(''); setResetDone(false)
      }, 1800)
    } catch (err) {
      setError(err.message)
    } finally {
      setResetting(false)
    }
  }

  async function handleDelete() {
    try {
      await deleteAdmin({ admin_id: deleteFor.id })
      setDeleteFor(null)
      setReload(r => r + 1)
    } catch (err) {
      setError(err.message)
    }
  }

  // ── Unlock screen ──
  if (!unlocked) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Lock size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Super-Admin Area</h1>
              <p className="text-xs text-slate-500">Confirm your password to continue.</p>
            </div>
          </div>
          <form onSubmit={handleUnlock} className="space-y-3">
            <input
              type="password"
              value={unlockPw}
              onChange={e => setUnlockPw(e.target.value)}
              placeholder="Your password"
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            {unlockErr && <div className="text-xs text-red-600">{unlockErr}</div>}
            <button
              type="submit"
              disabled={unlocking || !unlockPw}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold disabled:opacity-60"
            >
              {unlocking ? 'Checking…' : 'Unlock'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Main page ──
  return (
    <div className="p-6 space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="text-amber-500" size={22} /> Manage Staff
          </h1>
          <p className="text-slate-500 text-sm">{admins.length} staff account{admins.length === 1 ? '' : 's'}</p>
        </div>
        <button onClick={() => { resetAdd(); setShowAdd(true) }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm shadow">
          <UserPlus size={16} /> Add Staff
        </button>
      </div>

      {newCreds && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
          <div className="font-bold text-emerald-700 flex items-center gap-2">
            <CheckCircle2 size={18} /> Staff account created
          </div>
          <div className="text-sm text-slate-600">Share these with the staff member:</div>
          <div className="bg-white rounded-xl border border-emerald-200 p-3 space-y-1 font-mono text-sm">
            <div><span className="text-slate-500">Username:</span> <strong>{newCreds.initials}</strong></div>
            <div><span className="text-slate-500">Password:</span> <strong>{newCreds.password}</strong> <span className="text-slate-400 font-sans">(they can change it after signing in)</span></div>
          </div>
          <button onClick={() => setNewCreds(null)} className="text-xs text-slate-400 hover:underline">Dismiss</button>
        </div>
      )}

      <div className="space-y-2">
        {admins.map(a => (
          <div key={a.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm shrink-0">
                {a.initials || a.name?.[0] || '?'}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  {a.name}
                  {a.is_super_admin && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5">
                      <Shield size={9} /> Super
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 truncate">
                  {a.initials && <>Login: <strong className="text-slate-600">{a.initials}</strong> · </>}
                  {a.email}
                  {a.created_at && <span> · Added {format(new Date(a.created_at), 'MMM d, yyyy')}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => { setResetFor(a); setResetPw(''); setError('') }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors text-xs font-semibold border border-transparent hover:border-blue-100"
              >
                <KeyRound size={14} /> Reset Password
              </button>
              <button
                onClick={() => setDeleteFor(a)}
                disabled={a.user_id === user.id}
                title={a.user_id === user.id ? "Can't delete yourself" : 'Remove staff member'}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add modal */}
      {showAdd && (
        <Modal title="Add Staff Member" onClose={() => setShowAdd(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Full Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} autoFocus
                placeholder="e.g. Jane Doe"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Initials * (2–4 letters)</label>
                <input value={initials} onChange={e => setInitials(e.target.value.toUpperCase())} maxLength={4}
                  placeholder="JD"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm uppercase font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Birthday (optional)</label>
                <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Password * (min 6 characters)</label>
              <input type="text" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Set their password"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <label className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl border border-amber-100 bg-amber-50 cursor-pointer">
              <input type="checkbox" checked={isSuper} onChange={e => setIsSuper(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-amber-500" />
              <div className="text-xs text-amber-800">
                <div className="font-bold flex items-center gap-1"><Shield size={11} /> Super-admin</div>
                <div>Can manage staff accounts and reset passwords. Leave unchecked for regular staff.</div>
              </div>
            </label>
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 text-xs text-blue-700">
              <strong>Login info:</strong> Username = <strong>{initials || 'their initials'}</strong> · Password = whatever you set above
            </div>
            {error && <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg border border-red-100">{error}</div>}
            <button onClick={handleAdd} disabled={saving || !name || !initials || !password}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm disabled:opacity-50">
              {saving ? 'Creating account…' : 'Add Staff'}
            </button>
          </div>
        </Modal>
      )}

      {/* Reset password modal */}
      {resetFor && (
        <Modal title={`Reset password for ${resetFor.name}`} onClose={() => { setResetFor(null); setError('') }}>
          <div className="space-y-4">
            {resetDone ? (
              <div className="text-center py-4 space-y-2">
                <CheckCircle2 className="text-emerald-500 mx-auto" size={36} />
                <div className="font-bold text-slate-800">Password updated</div>
                <div className="text-xs text-slate-500">Tell them the new password.</div>
              </div>
            ) : (
              <>
                <div className="text-sm text-slate-600">
                  Enter a new password. The staff member can change it after they sign in.
                </div>
                <input
                  type="text"
                  value={resetPw}
                  onChange={e => setResetPw(e.target.value)}
                  autoFocus
                  placeholder="New password (min 6 chars)"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {error && <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg border border-red-100">{error}</div>}
                <button onClick={handleReset} disabled={resetting || !resetPw}
                  className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm disabled:opacity-50">
                  {resetting ? 'Saving…' : 'Set Password'}
                </button>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteFor && (
        <Modal title="Remove staff member" onClose={() => setDeleteFor(null)}>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              <p className="font-bold">⚠️ This cannot be undone.</p>
              <p>Removing <strong>{deleteFor.name}</strong> deletes their login. Past attribution on points and notes stays.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteFor(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold">
                Remove
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
