import { Topbar } from '@/components/layout/Topbar'
import { MOCK_INVOICES } from '@/lib/mockData'
import { useAppStore } from '@/lib/store'
import { MARKET_CONFIGS } from '@/types'
import { Upload, Bot } from 'lucide-react'
import clsx from 'clsx'

const AI_STATUS_STYLE: Record<string, string> = {
  verified: 'status-active',
  anomaly: 'status-inactive',
  review: 'status-pending',
  pending: 'status-pending',
}

const AI_STATUS_LABEL: Record<string, string> = {
  verified: '✓ Verified',
  anomaly: '⚠ Anomaly',
  review: '⏳ Review',
  pending: '⏳ Pending',
}

export default function Invoices() {
  const { market } = useAppStore()
  const cfg = MARKET_CONFIGS[market]
  const anomalyCount = MOCK_INVOICES.filter(i => i.ai_status === 'anomaly').length

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Invoices" subtitle="Billing verification & anomaly detection" />
      <div className="flex-1 overflow-y-auto p-6">

        {anomalyCount > 0 && (
          <div className="p-3 bg-danger-muted border border-danger/30 rounded-xl text-xs text-danger-light mb-5 flex items-center gap-2">
            🚨 {anomalyCount} invoice anomaly detected requiring attention — AI flagged significant billing variance.
          </div>
        )}

        <div className="flex justify-between items-center mb-5">
          <p className="text-sm text-white/50">AI-powered invoice verification — anomaly detection enabled</p>
          <div className="flex gap-2">
            <button className="btn-secondary flex items-center gap-2"><Upload size={13} /> Upload Invoice</button>
            <button className="btn-primary flex items-center gap-2"><Bot size={13} /> Run AI Check</button>
          </div>
        </div>

        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle">
                {['Invoice #','Site / Connection','Period','Amount','Expected','Variance','AI Status','Action'].map(h => (
                  <th key={h} className="tbl-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_INVOICES.map(inv => {
                const varColor = inv.variance_pct > 15
                  ? 'text-danger-light'
                  : inv.variance_pct > 5
                    ? 'text-warning-light'
                    : inv.variance_pct < 0
                      ? 'text-success-light'
                      : 'text-white/50'

                return (
                  <tr key={inv.id} className="tbl-row">
                    <td className="tbl-td font-mono text-xs text-white/60">{inv.id}</td>
                    <td className="tbl-td text-white font-medium">{inv.site_name}</td>
                    <td className="tbl-td text-white/50">{inv.period}</td>
                    <td className="tbl-td text-white font-medium">{cfg.currencySymbol} {inv.amount.toLocaleString()}</td>
                    <td className="tbl-td text-white/50">{cfg.currencySymbol} {inv.expected_amount.toLocaleString()}</td>
                    <td className={clsx('tbl-td font-medium', varColor)}>
                      {inv.variance_pct > 0 ? '+' : ''}{inv.variance_pct.toFixed(1)}%
                      {Math.abs(inv.variance_pct) > 15 && ' ⚠️'}
                    </td>
                    <td className="tbl-td">
                      <span className={AI_STATUS_STYLE[inv.ai_status]}>{AI_STATUS_LABEL[inv.ai_status]}</span>
                    </td>
                    <td className="tbl-td">
                      {inv.ai_status === 'anomaly'
                        ? <button className="btn-sm" style={{ borderColor: '#ef4444', color: '#f87171' }}>Dispute</button>
                        : <button className="btn-sm">View</button>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}
