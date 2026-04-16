import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [resetSent, setResetSent]   = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email.trim(), password)
    setLoading(false)
    if (error) setError('Invalid email or password. Please try again.')
  }

  async function handleForgot(e) {
    e.preventDefault()
    setResetLoading(true)
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setResetLoading(false)
    setResetSent(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-500 shadow-2xl mb-4 text-4xl">🌟</div>
          <h1 className="text-3xl font-bold text-white">Jelsema Journey</h1>
          <p className="text-slate-400 mt-1 text-sm">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {!showForgot ? (
            <>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                    placeholder="you@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                      className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                      placeholder="••••••••" />
                    <button type="button" onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">{error}</div>}
                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition-colors shadow-lg disabled:opacity-60">
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>
              <button onClick={() => { setShowForgot(true); setError('') }}
                className="w-full text-center text-xs text-slate-400 hover:text-slate-600 mt-4 transition-colors">
                Forgot password?
              </button>
            </>
          ) : (
            <>
              {resetSent ? (
                <div className="text-center space-y-3">
                  <div className="text-4xl">📧</div>
                  <div className="font-bold text-slate-800">Check your email</div>
                  <div className="text-sm text-slate-500">We sent a password reset link to <strong>{email}</strong></div>
                  <button onClick={() => { setShowForgot(false); setResetSent(false) }}
                    className="text-xs text-emerald-600 hover:underline mt-2">Back to sign in</button>
                </div>
              ) : (
                <form onSubmit={handleForgot} className="space-y-5">
                  <div>
                    <div className="font-bold text-slate-800 mb-1">Reset Password</div>
                    <div className="text-xs text-slate-400 mb-4">Enter your email and we'll send a reset link.</div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      placeholder="you@example.com" />
                  </div>
                  <button type="submit" disabled={resetLoading}
                    className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition-colors shadow-lg disabled:opacity-60">
                    {resetLoading ? 'Sending…' : 'Send Reset Link'}
                  </button>
                  <button type="button" onClick={() => setShowForgot(false)}
                    className="w-full text-center text-xs text-slate-400 hover:text-slate-600 transition-colors">
                    Back to sign in
                  </button>
                </form>
              )}
            </>
          )}

          <p className="text-center text-xs text-slate-400 mt-6">Florida Keys Children's Shelter</p>
        </div>
      </div>
    </div>
  )
}
