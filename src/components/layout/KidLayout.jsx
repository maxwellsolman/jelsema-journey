import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Home, Star, DollarSign, TrendingUp, LogOut, Flame, Zap } from 'lucide-react'
import { LEVEL_CONFIG } from '../../lib/levels'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'

const NAV = [
  { to: '/me',        label: 'Home',   icon: Home,       end: true },
  { to: '/me/points', label: 'Points', icon: Star },
  { to: '/me/money',  label: 'Money',  icon: DollarSign },
  { to: '/me/trends', label: 'Trends', icon: TrendingUp },
]

export default function KidLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [todayPts, setTodayPts]   = useState(null)
  const [streak, setStreak]       = useState(0)
  const [kidOfMonth, setKidOfMonth] = useState(null)

  useEffect(() => {
    supabase.from('settings').select('value').eq('key', 'kid_of_month').single()
      .then(({ data }) => { if (data?.value) setKidOfMonth(data.value) })
  }, [])

  useEffect(() => {
    if (!profile?.id) return
    const today = format(new Date(), 'yyyy-MM-dd')

    // Today's points
    supabase.from('daily_logs').select('total_pts').eq('kid_id', profile.id).eq('date', today).single()
      .then(({ data }) => setTodayPts(data?.total_pts ?? null))

    // Streak: count consecutive days at Role Model backwards
    supabase.from('daily_logs').select('date, level_achieved')
      .eq('kid_id', profile.id).order('date', { ascending: false }).limit(30)
      .then(({ data }) => {
        let s = 0
        for (const l of (data || [])) {
          if (l.level_achieved === 'rolemodel') s++
          else break
        }
        setStreak(s)
      })
  }, [profile?.id])

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div style={{ background: 'var(--duo-bg)', fontFamily: 'var(--font-body)' }} className="flex flex-col min-h-dvh">

      {/* ── Top bar ── */}
      <header className="sticky top-0 z-40 bg-white border-b-2 border-[--duo-border]">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌟</span>
            <span style={{ fontFamily:'var(--font-display)', fontWeight:900, color:'#58CC02', fontSize:18 }}>
              Journey
            </span>
          </div>

          {/* Stats row — Duolingo style */}
          <div className="flex items-center gap-3">
            {/* Streak */}
            <button onClick={() => navigate('/me')} className="streak-pill cursor-pointer active:scale-95 transition-transform">
              <Flame size={15} className="text-orange-500" />
              {streak}
            </button>

            {/* XP today */}
            <div className="xp-pill">
              <Zap size={13} className="text-amber-500" />
              {todayPts ?? 0}
            </div>

            {/* Sign out */}
            <button onClick={handleSignOut} aria-label="Sign out"
              className="p-2 rounded-xl text-[--duo-gray] hover:text-slate-500 hover:bg-slate-100 transition-colors">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Kid of the Month banner ── */}
      {kidOfMonth && (
        <div className="bg-amber-50 border-b-2 border-amber-200">
          <div className="max-w-lg mx-auto px-4 py-2 flex items-center gap-2">
            <span style={{ fontSize: 18 }}>🏆</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: '#92400e', fontSize: 13 }}>
              Kid of the Month:
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: '#d97706', fontSize: 15 }}>
              {kidOfMonth.kid_initials}
            </span>
            {kidOfMonth.month_label && (
              <span style={{ fontFamily: 'var(--font-body)', color: '#b45309', fontSize: 12, marginLeft: 'auto' }}>
                {kidOfMonth.month_label}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Page content ── */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-28">
        <Outlet />
      </main>

      {/* ── Bottom nav — Duolingo tab bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-[--duo-border]">
        <div className="max-w-lg mx-auto flex">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-0.5 py-3 text-[10px] font-bold transition-colors duration-150 cursor-pointer ${
                  isActive ? 'text-[#58CC02]' : 'text-[--duo-gray] hover:text-slate-500'
                }`
              }>
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-green-50' : ''}`}>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                  </div>
                  <span className="uppercase tracking-wide">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
