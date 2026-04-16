import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(authUser) {
    if (!authUser) {
      setProfile(null)
      setLoading(false)
      return
    }

    try {
      // Check admins table first
      const { data: admin } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', authUser.id)
        .single()

      if (admin) {
        setProfile({ role: 'admin', ...admin })
        setLoading(false)
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
        setLoading(false)
        return
      }
    } catch (err) {
      // ignore
    }

    setProfile(null)
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      fetchProfile(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (!error && data.user) {
        setUser(data.user)
        await fetchProfile(data.user)
      } else {
        setLoading(false)
      }
      return { error }
    } catch (err) {
      setLoading(false)
      return { error: err }
    }
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
