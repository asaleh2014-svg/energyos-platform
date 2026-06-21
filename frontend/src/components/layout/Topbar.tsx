import React from 'react'
import { useAppStore } from '@/lib/store'
import { Menu, Bell, Bot } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface TopbarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  const { toggleSidebar } = useAppStore()
  const navigate = useNavigate()

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
