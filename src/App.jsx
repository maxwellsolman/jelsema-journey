import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

import Login       from './pages/auth/Login'
import AdminLayout from './components/layout/AdminLayout'
import KidLayout   from './components/layout/KidLayout'

import AdminDashboard from './pages/admin/Dashboard'
import EnterPoints    from './pages/admin/EnterPoints'
import EnterEarnings  from './pages/admin/EnterEarnings'
import Infractions    from './pages/admin/Infractions'
import WeeklyPayout   from './pages/admin/WeeklyPayout'
import KidOfWeek      from './pages/admin/KidOfWeek'
import ICanTeen       from './pages/admin/iCanTeen'
import Reports        from './pages/admin/Reports'
import ManageKids     from './pages/admin/ManageKids'

import KidDashboard from './pages/kid/Dashboard'
import MyPoints     from './pages/kid/MyPoints'
import MyMoney      from './pages/kid/MyMoney'
import Leaderboard  from './pages/kid/Leaderboard'
import Trends       from './pages/kid/Trends'

function RequireAuth({ children, role }) {
  const { user, profile, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-slate-400 text-sm animate-pulse">Loading…</div>
    </div>
  )

  if (!user || !profile) return <Navigate to="/login" replace />
  if (role && profile.role !== role) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/me'} replace />
  }
  return children
}

function RootRedirect() {
  const { user, profile, loading } = useAuth()
  if (loading) return null
  if (!user || !profile) return <Navigate to="/login" replace />
  return <Navigate to={profile.role === 'admin' ? '/admin' : '/me'} replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />

      {/* Admin routes */}
      <Route path="/admin" element={<RequireAuth role="admin"><AdminLayout /></RequireAuth>}>
        <Route index element={<AdminDashboard />} />
        <Route path="points"    element={<EnterPoints />} />
        <Route path="earnings"  element={<EnterEarnings />} />
        <Route path="infractions" element={<Infractions />} />
        <Route path="payout"    element={<WeeklyPayout />} />
        <Route path="winner"    element={<KidOfWeek />} />
        <Route path="canteen"   element={<ICanTeen />} />
        <Route path="reports"   element={<Reports />} />
        <Route path="kids"      element={<ManageKids />} />
      </Route>

      {/* Kid routes */}
      <Route path="/me" element={<RequireAuth role="kid"><KidLayout /></RequireAuth>}>
        <Route index element={<KidDashboard />} />
        <Route path="points"      element={<MyPoints />} />
        <Route path="money"       element={<MyMoney />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="trends"      element={<Trends />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
