import { useState } from 'react'
import { Table, Download } from 'lucide-react'
import { downloadCSV } from '@/lib/downloadUtils'
import { YearSelector } from '@/components/YearSelector'

interface ChartCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  table?: React.ReactNode
  action?: React.ReactNode
  className?: string
  csvData?: () => (string | number)[][]
  csvFilename?: string
  /** Pass year-filter props to show year chips between title and chart */
  yearFilter?: {
    years: string[]
    selected: Set<string>
    onToggle: (y: string) => void
    onAll: () => void
  }
}

export function ChartCard({ title, subtitle, children, table, action, className, csvData, csvFilename, yearFilter }: ChartCardProps) {
  const [showTable, setShowTable] = useState(false)

  function handleDownload() {
    if (!csvData) return
    downloadCSV(csvFilename ?? `${title.toLowerCase().replace(/\s+/g, '-')}.csv`, csvData())
  }

  return (
    <div className={`card ${className ?? ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="text-xs text-white/30 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          {action}
          {csvData && (
            <button
              onClick={handleDownload}
              title="Download CSV"
              className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/70 border border-border-subtle hover:border-border-default px-2.5 py-1 rounded-lg transition-all"
            >
              <Download size={11} /> CSV
            </button>
          )}
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
      {yearFilter && yearFilter.years.length > 1 && (
        <div className="mb-3 pb-3 border-b border-border-subtle">
          <YearSelector {...yearFilter} />
        </div>
      )}
      {children}
      {showTable && table && (
        <div className="mt-4 pt-4 border-t border-border-subtle overflow-x-auto">
          {table}
        </div>
      )}
    </div>
  )
}
