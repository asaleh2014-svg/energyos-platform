import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { isDemoMode, exitDemo } from '@/lib/demo'
import { useAppStore } from '@/lib/store'
import { Zap, ShieldCheck } from 'lucide-react'

export function AppLayout() {
  const demo = isDemoMode()
  const { adminTenantName, clearAdminTenant } = useAppStore()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-bg-primary">
      {demo && (
        <div className="flex items-center justify-between px-4 py-2 bg-accent/10 border-b border-accent/20 text-xs flex-shrink-0">
          <div className="flex items-center gap-2 text-accent">
            <Zap size={12} />
            <span className="font-semibold">Demo Mode</span>
            <span className="text-white/40">— you're viewing pre-loaded demo data for Masdar City Group</span>
          </div>
          <button onClick={exitDemo} className="px-3 py-1 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/80 transition-colors">
            Sign in to your account →
          </button>
        </div>
      )}
      {adminTenantName && (
        <div className="flex items-center justify-between px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs flex-shrink-0">
          <div className="flex items-center gap-2 text-amber-400">
            <ShieldCheck size={12} />
            <span className="font-semibold">Admin View</span>
            <span className="text-white/40">— viewing as customer: <span className="text-white/70 font-medium">{adminTenantName}</span></span>
          </div>
          <button
            onClick={() => { clearAdminTenant(); navigate('/admin', { replace: true }) }}
            className="px-3 py-1 rounded-lg bg-amber-500 text-white text-xs font-medium hover:bg-amber-400 transition-colors">
            ← Back to Admin Panel
          </button>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
