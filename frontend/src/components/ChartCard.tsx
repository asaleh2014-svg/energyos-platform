import { useState } from 'react'
import { Table } from 'lucide-react'

interface ChartCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  table?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function ChartCard({ title, subtitle, children, table, action, className }: ChartCardProps) {
  const [showTable, setShowTable] = useState(false)

  return (
    <div className={`card ${className ?? ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="text-xs text-white/30 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          {action}
          {table && (
            <button
              onClick={() => setShowTable(v => !v)}
              className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/70 border border-border-subtle hover:border-border-default px-2.5 py-1 rounded-lg transition-all"
            >
              <Table size={11} />
              {showTable ? 'Hide table' : 'Show table'}
            </button>
          )}
        </div>
      </div>
      {children}
      {showTable && table && (
        <div className="mt-4 pt-4 border-t border-border-subtle overflow-x-auto">
          {table}
        </div>
      )}
    </div>
  )
}
