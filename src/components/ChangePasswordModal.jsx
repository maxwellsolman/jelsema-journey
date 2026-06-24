import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { X, KeyRound, CheckCircle2 } from 'lucide-react'

// Lets any logged-in user change their own password — no email needed.
export default function ChangePasswordModal({ onClose }) {
  const [pw, setPw]           = useState('')
  const [confirm, setConfirm] = useState('')
  const [err, setErr]         = useState('')
  const [saving, setSaving]   = useState(false)
  const [done, setDone]       = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    if (pw.length < 6)   { setErr('Password must be at least 6 characters.'); return }
    if (pw !== confirm)  { setErr('Passwords do not match.'); return }
    setSaving(true); setErr('')
    const { error } = await supabase.auth.updateUser({ password: pw })
    setSaving(false)
    if (error) { setErr(error.message); return }
    setDone(true)
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
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">New Password</label>
              <input type="password" value={pw} onChange={e => setPw(e.target.value)} autoFocus
                placeholder="Min. 6 characters"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Confirm New Password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat password"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            {err && <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg border border-red-100">{err}</div>}
            <button type="submit" disabled={saving || !pw || !confirm}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm disabled:opacity-50">
              {saving ? 'Saving…' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
