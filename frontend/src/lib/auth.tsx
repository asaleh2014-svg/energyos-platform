import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { type Session, type User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { isDemoMode, DEMO_TENANT as DEMO_TENANT_ID } from './demo'
import { useAppStore } from './store'

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

/** Returns the tenant ID to query — admin impersonation overrides the logged-in user's tenant. */
export const useTenantId = () => {
  const { profile } = useContext(AuthContext)
  const adminTenantId = useAppStore(s => s.adminTenantId)
  return adminTenantId ?? profile?.id ?? DEMO_TENANT_ID
}

// Hardcoded admin user ID — from tenant_users table
const ADMIN_USER_ID = 'd2fd2b4a-92c9-4db8-a842-1f9b70294623'

export const useIsAdmin = () => {
  const { user } = useContext(AuthContext)
  return user?.id === ADMIN_USER_ID
}
