import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [ready, setReady]         = useState(false)

  useEffect(() => {
    // Supabase puts the recovery token in the URL hash — this listener picks it up
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 6)  { setError('Password must be at least 6 characters.'); return }
    setLoading(true); setError('')

    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) { setError(error.message); return }
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-500 shadow-2xl mb-4 text-4xl">🌟</div>
          <h1 className="text-3xl font-bold text-white">Set New Password</h1>
          <p className="text-slate-400 mt-1 text-sm">Jelsema Journey</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {!ready ? (
            <div className="text-center text-slate-500 text-sm py-4">
              Verifying your link…
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="Min. 6 characters" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm Password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="Repeat password" />
              </div>
              {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">{error}</div>}
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition-colors shadow-lg disabled:opacity-60">
                {loading ? 'Saving…' : 'Set Password & Log In'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
