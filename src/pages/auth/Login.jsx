import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Eye, EyeOff } from 'lucide-react'

// Kids log in with their initials — mapped to `<initials>@jelsema.app`.
// Staff log in with their real email address (typed in full).
function toKidEmail(initials) { return `${initials.trim().toLowerCase()}@jelsema.app` }

// Returns the list of candidate emails to try in order.
function resolveEmails(input) {
  const trimmed = input.trim()
  // An '@' means a real email (staff) — use it as-is. Otherwise it's a kid's initials.
  if (trimmed.includes('@')) return [trimmed.toLowerCase()]
  return [toKidEmail(trimmed)]
}

export default function Login() {
  const { signIn, profile } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername]     = useState('')
  const [password, setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [resetSent, setResetSent]   = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetIsKid, setResetIsKid] = useState(false)

  useEffect(() => {
    if (profile) {
      navigate(profile.role === 'admin' ? '/admin' : '/me', { replace: true })
    }
  }, [profile])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const candidates = resolveEmails(username)
    let lastError = null
    for (const email of candidates) {
      const { error } = await signIn(email, password)
      if (!error) { setLoading(false); return }
      lastError = error
    }
    setLoading(false)
    if (lastError) setError('Incorrect username or password. Try again.')
  }

  async function handleForgot(e) {
    e.preventDefault()
    const trimmed = username.trim()
    // Youth log in with initials and have no real email — staff reset for them.
    if (!trimmed.includes('@')) {
      setResetIsKid(true)
      setResetSent(true)
      return
    }
    setResetIsKid(false)
    setResetLoading(true)
    await supabase.auth.resetPasswordForEmail(trimmed.toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setResetLoading(false)
    setResetSent(true)
  }

  const isKidMode = !username.includes('@') && username.length > 0 && username.length <= 4

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-slate-800 to-emerald-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-500 shadow-2xl mb-4 text-4xl">🌟</div>
          <h1 className="text-3xl font-bold text-white">Jelsema Journey</h1>
          <p className="text-slate-400 mt-1 text-sm">Florida Keys Children's Shelter</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {!showForgot ? (
            <>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    {isKidMode ? 'Your Initials' : 'Email or Initials'}
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    autoCapitalize={isKidMode ? 'characters' : 'none'}
                    autoCorrect="off"
                    className={`w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition ${isKidMode ? 'uppercase' : ''}`}
                    placeholder="Email (staff) or initials (youth)"
                  />
                  {isKidMode && (
                    <p className="text-xs text-emerald-600 mt-1 font-medium">Logging in as youth ✓</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {isKidMode && (
                    <p className="text-xs text-slate-400 mt-1">Default password is your birthday (e.g. 11182001)</p>
                  )}
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">{error}</div>
                )}

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
                resetIsKid ? (
                  <div className="text-center space-y-3">
                    <div className="text-4xl">🙋</div>
                    <div className="font-bold text-slate-800">Ask a staff member</div>
                    <div className="text-sm text-slate-500">Youth accounts don't use email. Ask a staff member to reset your password for you.</div>
                    <button onClick={() => { setShowForgot(false); setResetSent(false) }}
                      className="text-xs text-emerald-600 hover:underline mt-2">Back to sign in</button>
                  </div>
                ) : (
                  <div className="text-center space-y-3">
                    <div className="text-4xl">📧</div>
                    <div className="font-bold text-slate-800">Check your email</div>
                    <div className="text-sm text-slate-500">If an account exists for that email, a reset link is on its way.</div>
                    <button onClick={() => { setShowForgot(false); setResetSent(false) }}
                      className="text-xs text-emerald-600 hover:underline mt-2">Back to sign in</button>
                  </div>
                )
              ) : (
                <form onSubmit={handleForgot} className="space-y-5">
                  <div>
                    <div className="font-bold text-slate-800 mb-1">Reset Password</div>
                    <div className="text-xs text-slate-400 mb-4">Staff: enter your email and we'll send a reset link. Youth: ask a staff member to reset it for you.</div>
                    <input type="text" value={username} onChange={e => setUsername(e.target.value)} required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      placeholder="Your email (staff)" />
                  </div>
                  <button type="submit" disabled={resetLoading}
                    className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm disabled:opacity-60">
                    {resetLoading ? 'Sending…' : 'Send Reset Link'}
                  </button>
                  <button type="button" onClick={() => setShowForgot(false)}
                    className="w-full text-center text-xs text-slate-400 hover:text-slate-600">
                    Back to sign in
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
