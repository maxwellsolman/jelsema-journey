import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null) // { role: 'admin'|'kid', ...data }
  const [loading, setLoading] = useState(true)

  async function fetchProfile(authUser) {
    if (!authUser) { setProfile(null); return }

    // Check admins table first
    const { data: admin } = await supabase
      .from('admins')
      .select('*')
      .eq('user_id', authUser.id)
      .single()

    if (admin) {
      setProfile({ role: 'admin', ...admin })
      return
    }

    // Check kids table
    const { data: kid } = await supabase
      .from('kids')
      .select('*')
      .eq('user_id', authUser.id)
      .single()

    if (kid) {
      setProfile({ role: 'kid', ...kid })
      return
    }

    setProfile(null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      fetchProfile(session?.user ?? null).finally(() => setLoading(false))
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      fetchProfile(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
