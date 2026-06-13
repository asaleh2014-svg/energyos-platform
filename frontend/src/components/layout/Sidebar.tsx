import { NavLink } from 'react-router-dom'
import { useAppStore } from '@/lib/store'
import { MARKET_CONFIGS } from '@/types'
import {
  LayoutDashboard, BarChart3, Zap, Building2, Gauge, Bot,
  FileText, Receipt, Settings, X, Leaf, TrendingDown,
  DollarSign, PieChart, TrendingUp,
} from 'lucide-react'
import clsx from 'clsx'

const NAV = [
  { section: 'Overview', items: [
    { to: '/',          icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/analytics', icon: BarChart3,       label: 'Analytics' },
  ]},
  { section: 'Assets', items: [
    { to: '/connections', icon: Zap,      label: 'Connections' },
    { to: '/sites',       icon: Building2,label: 'Sites'       },
  ]},
  { section: 'Sustainability', items: [
    { to: '/emissions',    icon: Leaf,         label: 'CO₂ Emissions' },
    { to: '/co2-forecast', icon: TrendingDown, label: 'CO₂ Forecast'  },
  ]},
  { section: 'Financials', items: [
    { to: '/financials', icon: DollarSign, label: 'Tariffs & Budget' },
    { to: '/budget',     icon: PieChart,   label: 'Budget Detail'    },
  ]},
  { section: 'Intelligence', items: [
    { to: '/ai',      icon: Bot,      label: 'AI Auditor', badge: 'AI' },
    { to: '/reports', icon: FileText, label: 'Reports'                  },
  ]},
  { section: 'Admin', items: [
    { to: '/invoices', icon: Receipt,  label: 'Invoices' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ]},
]

export function Sidebar() {
  const { tenant, market, sidebarOpen, toggleSidebar } = useAppStore()
  const cfg = MARKET_CONFIGS[market]

  if (!sidebarOpen) return null

  return (
    <aside className="w-[220px] min-w-[220px] bg-bg-secondary border-r border-border-subtle flex flex-col h-screen">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[9px] bg-gradient-to-br from-accent to-purple flex items-center justify-center text-white font-bold text-sm">
            E
          </div>
          <div>
            <div className="text-sm font-semibold text-white tracking-tight">EnergyOS</div>
            <div className="text-[10px] text-white/30 uppercase tracking-widest">Portfolio Intelligence</div>
          </div>
        </div>
        <button onClick={toggleSidebar} className="text-white/30 hover:text-white/60 transition-colors lg:hidden">
          <X size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        {NAV.map(({ section, items }) => (
          <div key={section} className="mb-5">
            <div className="label px-2 mb-1.5">{section}</div>
            {items.map(({ to, icon: Icon, label, badge }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => clsx(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13.5px] transition-all relative group',
                  isActive
                    ? 'bg-accent/10 text-accent-hover font-medium'
                    : 'text-white/50 hover:bg-bg-card hover:text-white/80'
                )}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-accent-hover rounded-r" />
                    )}
                    <Icon size={16} className="opacity-80 flex-shrink-0" />
                    <span className="flex-1">{label}</span>
                    {badge && (
                      <span className="text-[10px] font-semibold bg-accent/20 text-accent-hover px-1.5 py-0.5 rounded-full">
                        {badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Tenant badge */}
      <div className="p-3 border-t border-border-subtle">
        <NavLink to="/settings" className="block">
          <div className="bg-bg-card border border-border-subtle rounded-lg p-3 hover:border-border-default transition-colors cursor-pointer">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[7px] text-success">●</span>
              <span className="text-[13px] font-medium text-white truncate">{tenant?.name}</span>
            </div>
            <div className="text-[11px] text-accent-hover capitalize">
              {cfg.flag} {tenant?.plan} · {tenant?.connections_count} connections
            </div>
          </div>
        </NavLink>
      </div>
    </aside>
  )
}
