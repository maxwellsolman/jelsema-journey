import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Home, Star, DollarSign, Trophy, TrendingUp, LogOut } from 'lucide-react'
import { LEVEL_CONFIG } from '../../lib/levels'

const NAV = [
  { to: '/me',           label: 'Home',     icon: Home,       end: true },
  { to: '/me/points',    label: 'Points',   icon: Star },
  { to: '/me/money',     label: 'Money',    icon: DollarSign },
  { to: '/me/leaderboard', label: 'Ranks',  icon: Trophy },
  { to: '/me/trends',    label: 'Trends',   icon: TrendingUp },
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
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Top header */}
      <header className={`${levelCfg.bgClass} border-b ${levelCfg.borderClass} sticky top-0 z-40`}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{levelCfg.emoji}</span>
            <div>
              <div className="font-bold text-sm text-slate-800">Jelsema Journey</div>
              <div className={`text-xs font-semibold ${levelCfg.textClass}`}>
                {profile?.initials || '...'} · {levelCfg.label}
              </div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-white/50 transition-colors"
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 pb-24">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 shadow-lg">
        <div className="max-w-2xl mx-auto flex">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors ${
                  isActive ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
