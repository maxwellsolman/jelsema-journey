import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, ClipboardList, DollarSign, AlertTriangle,
  Trophy, ShoppingBag, BarChart2, Users, LogOut, Star, Menu, X
} from 'lucide-react'
import { useState } from 'react'

const NAV = [
  { to: '/admin',           label: 'Dashboard',      icon: LayoutDashboard, end: true },
  { to: '/admin/points',    label: 'Enter Points',   icon: ClipboardList },
  { to: '/admin/earnings',  label: 'Enter Earnings', icon: DollarSign },
  { to: '/admin/infractions', label: 'Infractions',  icon: AlertTriangle },
  { to: '/admin/payout',    label: 'Weekly Payout',  icon: DollarSign },
  { to: '/admin/winner',    label: 'Kid of the Week',icon: Trophy },
  { to: '/admin/canteen',   label: 'Canteen Store',  icon: ShoppingBag },
  { to: '/admin/reports',   label: 'Reports',        icon: BarChart2 },
  { to: '/admin/kids',      label: 'Manage Kids',    icon: Users },
]

export default function AdminLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white shrink-0">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-lg">🌟</div>
          <div>
            <div className="font-bold text-sm leading-tight">Jelsema Journey</div>
            <div className="text-xs text-slate-400">Admin Portal</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-slate-700">
          <div className="flex items-center gap-3 px-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold">
              {profile?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="text-xs text-slate-300 truncate">{profile?.name || 'Admin'}</div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900 text-white flex items-center justify-between px-4 py-3 shadow">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌟</span>
          <span className="font-bold text-sm">Jelsema Journey</span>
        </div>
        <button onClick={() => setMobileOpen(v => !v)} className="p-1">
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)}>
          <aside
            className="w-72 h-full bg-slate-900 text-white flex flex-col pt-16"
            onClick={e => e.stopPropagation()}
          >
            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
              {NAV.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="px-3 py-4 border-t border-slate-700">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                <LogOut size={16} /> Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pt-0 md:pt-0">
        <div className="md:hidden h-14" /> {/* spacer for mobile top bar */}
        <Outlet />
      </main>
    </div>
  )
}
