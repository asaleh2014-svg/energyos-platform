import React, { useState, useEffect, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { Menu, Bell, Bot, ShieldCheck, ChevronDown, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useIsAdmin } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

interface TopbarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

const DEMO_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  const { toggleSidebar, adminTenantId, adminTenantName, setAdminTenant, clearAdminTenant } = useAppStore()
  const navigate = useNavigate()
  const isAdmin = useIsAdmin()

  const [open, setOpen]       = useState(false)
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([])
  const dropdownRef           = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isAdmin) return
    supabase.from('tenants').select('id, name').order('name').then(({ data }) => {
      setTenants(data ?? [])
    })
  }, [isAdmin])

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function selectTenant(id: string, name: string) {
    setAdminTenant(id, name)
    setOpen(false)
  }

  function clearSelection() {
    clearAdminTenant()
    setOpen(false)
  }

  const currentLabel = adminTenantName ?? 'My Account'

  return (
    <header className="h-14 min-h-14 bg-bg-secondary border-b border-border-subtle flex items-center px-6 gap-4">
      <button onClick={toggleSidebar} className="text-white/40 hover:text-white/80 transition-colors">
        <Menu size={18} />
      </button>

      <div className="flex-1">
        <h1 className="text-[15px] font-semibold text-white tracking-tight leading-none">{title}</h1>
        {subtitle && <p className="text-xs text-white/30 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2">
        {actions}

        {/* Customer switcher — admin only */}
        {isAdmin && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setOpen(o => !o)}
              className="flex items-center gap-1.5 text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              <ShieldCheck size={13} />
              <span className="max-w-[120px] truncate">{currentLabel}</span>
              <ChevronDown size={11} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>

            {open && (
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-bg-card border border-border-default rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="px-3 py-2 border-b border-border-subtle">
                  <span className="text-[10px] text-white/30 uppercase tracking-wider">View as</span>
                </div>

                {/* My own account */}
                <button
                  onClick={clearSelection}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-xs text-white/70 hover:bg-bg-primary transition-colors"
                >
                  <span>My Account</span>
                  {!adminTenantId && <Check size={12} className="text-accent" />}
                </button>

                <div className="border-t border-border-subtle/50 my-1" />

                {/* All tenants */}
                {tenants.map(t => (
                  <button
                    key={t.id}
                    onClick={() => selectTenant(t.id, t.name)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-xs text-white/70 hover:bg-bg-primary transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate">{t.name}</span>
                      {t.id === DEMO_ID && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium flex-shrink-0">Demo</span>
                      )}
                    </div>
                    {adminTenantId === t.id && <Check size={12} className="text-accent flex-shrink-0" />}
                  </button>
                ))}

                <div className="border-t border-border-subtle/50 mt-1 px-3 py-2">
                  <button
                    onClick={() => { setOpen(false); navigate('/admin') }}
                    className="text-[11px] text-white/30 hover:text-white/60 transition-colors"
                  >
                    Manage tenants →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => navigate('/ai')}
          className="flex items-center gap-1.5 text-xs bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
        >
          <Bot size={13} />
          AI Audit
        </button>

        <button
          onClick={() => navigate('/alerts')}
          className="relative text-white/40 hover:text-white/70 transition-colors p-1.5"
        >
          <Bell size={16} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-danger rounded-full" />
        </button>

        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-purple flex items-center justify-center text-white text-xs font-semibold cursor-pointer">
          AH
        </div>
      </div>
    </header>
  )
}
