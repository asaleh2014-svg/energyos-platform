import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/lib/auth'

export function AuthGuard() {
  const { session, loading } = useAuth()

  // Password reset links land on the root with #type=recovery in the hash.
  // Send them to /login so the recovery form can handle the tokens.
  if (window.location.hash.includes('type=recovery')) {
    return <Navigate to={`/login${window.location.hash}`} replace />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}
