import { Topbar } from '@/components/layout/Topbar'
import { MOCK_CONNECTIONS } from '@/lib/mockData'
import { format } from 'date-fns'

export default function Meters() {
  const upgradeNeeded = MOCK_CONNECTIONS.filter(c => c.meter.type === 'Traditional').length

  const lastSyncLabel = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Meters" subtitle="Smart meter management" />
      <div className="flex-1 overflow-y-auto p-6">

        {upgradeNeeded > 0 && (
          <div className="p-3 bg-warning-muted border border-warning/30 rounded-xl text-xs text-warning-light mb-5 flex items-center gap-2">
            ⚠️ {upgradeNeeded} traditional meters flagged for upgrade — smart meter upgrade required under UAE regulations by Q2 2026.
          </div>
        )}

        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle">
                {['Meter Number','Site','Type','Installed','Last Sync','Interval','Meter Status','Action'].map(h => (
                  <th key={h} className="tbl-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_CONNECTIONS.map(c => {
                const m = c.meter
                const isSmart = m.type === 'Smart'
                const intervalLabel = m.interval_minutes < 60
                  ? `${m.interval_minutes} min`
                  : m.interval_minutes < 1440
                    ? `${m.interval_minutes / 60}h`
                    : 'Monthly'
                const online = Date.now() - new Date(m.last_sync_at).getTime() < 3600000

                return (
                  <tr key={m.id} className="tbl-row">
                    <td className="tbl-td font-mono text-xs text-white/70">{m.meter_number}</td>
                    <td className="tbl-td text-white font-medium">{c.site_name}</td>
                    <td className="tbl-td">
                      <span className={isSmart ? 'status-active' : 'status-inactive'}>{m.type}</span>
                    </td>
                    <td className="tbl-td text-white/40 text-xs">
                      {format(new Date(m.commissioned_at), 'MMM yyyy')}
                    </td>
                    <td className="tbl-td text-white/40 text-xs">{lastSyncLabel(m.last_sync_at)}</td>
                    <td className="tbl-td text-white/50 text-xs">{intervalLabel}</td>
                    <td className="tbl-td">
                      {isSmart
                        ? <span className={online ? 'status-active' : 'status-pending'}>{online ? 'Online' : 'Delayed'}</span>
                        : <span className="status-pending">Upgrade due</span>
                      }
                    </td>
                    <td className="tbl-td">
                      {isSmart
                        ? <button className="btn-sm">View</button>
                        : <button className="btn-sm" style={{ borderColor: '#f59e0b', color: '#fbbf24' }}>Upgrade</button>
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
