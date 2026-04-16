import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Home, Star, DollarSign, Trophy, TrendingUp, LogOut } from 'lucide-react'
import { LEVEL_CONFIG } from '../../lib/levels'

const NAV = [
  { to: '/me',              label: 'Home',    icon: Home,       end: true },
  { to: '/me/points',       label: 'Points',  icon: Star },
  { to: '/me/money',        label: 'Money',   icon: DollarSign },
  { to: '/me/leaderboard',  label: 'Ranks',   icon: Trophy },
  { to: '/me/trends',       label: 'Trends',  icon: TrendingUp },
]

export default function KidLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const levelCfg = LEVEL_CONFIG[profile?.current_level || 'refocus']

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="kid-font kid-bg flex flex-col min-h-screen">
      {/* Top header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-white/60 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-lg shadow-md">
              🌟
            </div>
            <div>
              <div className="font-bold text-slate-800 text-sm leading-tight">Jelsema Journey</div>
              <div className="text-xs text-slate-500 font-medium">{profile?.initials}</div>
            </div>
          </div>
          <button onClick={handleSignOut}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 pb-28">
        <Outlet />
      </main>

      {/* Bottom nav — claymorphism style */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pt-0">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/80 flex overflow-hidden"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.15), 0 1px 0 rgba(255,255,255,0.8) inset' }}>
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-slate-400 hover:text-slate-600'
                  }`
                }>
                {({ isActive }) => (
                  <>
                    <Icon size={21} strokeWidth={isActive ? 2.5 : 1.8} />
                    <span className="text-[10px]">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
    </div>
  )
}
