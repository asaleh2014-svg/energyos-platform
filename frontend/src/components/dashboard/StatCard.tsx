import clsx from 'clsx'
import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string
  trend?: string
  trendUp?: boolean
  trendLabel?: string
  icon?: ReactNode
  accent?: 'blue' | 'green' | 'amber' | 'purple' | 'teal'
}

const ACCENT_STYLES = {
  blue:   { ring: 'ring-accent/20',   icon: 'text-accent' },
  green:  { ring: 'ring-success/20',  icon: 'text-success-light' },
  amber:  { ring: 'ring-warning/20',  icon: 'text-warning-light' },
  purple: { ring: 'ring-purple/20',   icon: 'text-purple-light' },
  teal:   { ring: 'ring-teal/20',     icon: 'text-teal-light' },
}

export function StatCard({ label, value, trend, trendUp, trendLabel, icon, accent = 'blue' }: StatCardProps) {
  const styles = ACCENT_STYLES[accent]
  return (
    <div className={clsx('card relative overflow-hidden', styles.ring)}>
      <div className="label mb-2">{label}</div>
      <div className="text-2xl font-semibold text-white tracking-tight leading-none">{value}</div>
      {(trend || trendLabel) && (
        <div className="flex items-center gap-1.5 mt-2">
          {trend && (
            <span className={clsx('text-xs font-medium', trendUp === false ? 'text-success-light' : trendUp ? 'text-danger-light' : 'text-white/40')}>
              {trend}
            </span>
          )}
          {trendLabel && <span className="text-xs text-white/30">{trendLabel}</span>}
        </div>
      )}
      {icon && (
        <div className={clsx('absolute top-4 right-4 opacity-20 text-2xl', styles.icon)}>
          {icon}
        </div>
      )}
    </div>
  )
}
