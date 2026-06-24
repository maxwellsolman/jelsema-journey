import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { X, KeyRound, CheckCircle2, Mail } from 'lucide-react'

// Lets a logged-in user change their own password (with current-password check),
// or email themselves a reset link if they've forgotten it.
export default function ChangePasswordModal({ onClose }) {
  const { user } = useAuth()
  const [current, setCurrent] = useState('')
  const [pw, setPw]           = useState('')
  const [confirm, setConfirm] = useState('')
  const [err, setErr]         = useState('')
  const [saving, setSaving]   = useState(false)
  const [done, setDone]       = useState(false)

  const [resetSending, setResetSending] = useState(false)
  const [resetSent, setResetSent]       = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    if (pw.length < 6)  { setErr('New password must be at least 6 characters.'); return }
    if (pw !== confirm) { setErr('New passwords do not match.'); return }
    setSaving(true); setErr('')

    // Verify the current password by re-authenticating as this user.
    const { error: reauthErr } = await supabase.auth.signInWithPassword({
      email: user.email, password: current,
    })
    if (reauthErr) { setSaving(false); setErr('Current password is incorrect.'); return }

    const { error } = await supabase.auth.updateUser({ password: pw })
    setSaving(false)
    if (error) { setErr(error.message); return }
    setDone(true)
  }

  async function handleEmailReset() {
    setResetSending(true); setErr('')
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setResetSending(false)
    if (error) { setErr(error.message); return }
    setResetSent(true)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <KeyRound size={18} className="text-emerald-500" /> Change Password
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        {done ? (
          <div className="text-center py-4 space-y-2">
            <CheckCircle2 className="text-emerald-500 mx-auto" size={36} />
            <div className="font-bold text-slate-800">Password updated</div>
            <div className="text-xs text-slate-500">Use your new password next time you sign in.</div>
            <button onClick={onClose} className="mt-2 text-xs text-emerald-600 hover:underline">Done</button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Current Password</label>
                <input type="password" value={current} onChange={e => setCurrent(e.target.value)} autoFocus
                  placeholder="Your current password"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">New Password</label>
                <input type="password" value={pw} onChange={e => setPw(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Confirm New Password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              {err && <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg border border-red-100">{err}</div>}
              <button type="submit" disabled={saving || !current || !pw || !confirm}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm disabled:opacity-50">
                {saving ? 'Saving…' : 'Update Password'}
              </button>
            </form>

            {/* Forgot current password */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              {resetSent ? (
                <div className="text-xs text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> Reset link sent to {user.email}. Check your email.
                </div>
              ) : (
                <>
                  <div className="text-xs text-slate-500 mb-2">Forgot your current password?</div>
                  <button onClick={handleEmailReset} disabled={resetSending}
                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50">
                    <Mail size={14} /> {resetSending ? 'Sending…' : `Email me a reset link (${user.email})`}
                  </button>
                  <div className="text-[11px] text-slate-400 mt-1.5">
                    Or ask a super-admin to reset it for you.
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
