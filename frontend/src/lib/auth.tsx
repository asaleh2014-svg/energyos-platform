import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { type Session, type User } from '@supabase/supabase-js'
import { supabase } from './supabase'

interface TenantProfile {
  id: string
  name: string
  slug: string
  plan: string
  currency: string
  role: 'Admin' | 'Finance' | 'Viewer'
}

interface AuthContextType {
  session:  Session | null
  user:     User | null
  profile:  TenantProfile | null
  loading:  boolean
  signOut:  () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null, user: null, profile: null, loading: true, signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session,  setSession]  = useState<Session | null>(null)
  const [profile,  setProfile]  = useState<TenantProfile | null>(null)
  const [loading,  setLoading]  = useState(true)

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from('tenant_users')
      .select('role, tenants(id, name, slug, plan, currency)')
      .eq('user_id', userId)
      .single()
    if (data?.tenants) {
      const t = data.tenants as any
      setProfile({ id: t.id, name: t.name, slug: t.slug, plan: t.plan, currency: t.currency, role: data.role as TenantProfile['role'] })
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) loadProfile(session.user.id).finally(() => setLoading(false))
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) loadProfile(session.user.id)
      else { setProfile(null) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

const DEMO_TENANT = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

/** Returns the tenant ID of the logged-in user, falling back to the demo tenant. */
export const useTenantId = () => {
  const { profile } = useContext(AuthContext)
  return profile?.id ?? DEMO_TENANT
}
