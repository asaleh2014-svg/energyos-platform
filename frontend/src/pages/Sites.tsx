import { Topbar } from '@/components/layout/Topbar'
import { MOCK_SITES, SITE_SPEND } from '@/lib/mockData'
import { useAppStore } from '@/lib/store'
import { MARKET_CONFIGS } from '@/types'
import { Plus, MapPin } from 'lucide-react'
import clsx from 'clsx'

export default function Sites() {
  const { market } = useAppStore()
  const cfg = MARKET_CONFIGS[market]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Sites" subtitle="Operational facility overview" />
      <div className="flex-1 overflow-y-auto p-6">

        <div className="flex justify-end mb-5">
          <button className="btn-primary flex items-center gap-2"><Plus size={14} /> Add Site</button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {MOCK_SITES.map(site => {
            const spend = SITE_SPEND[site.id] || 0
            const util = Math.round((spend / site.annual_budget) * 100)
            const barColor = util > 85 ? '#ef4444' : util > 60 ? '#3b82f6' : '#10b981'

            return (
              <div key={site.id} className="card-hover">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-sm font-semibold text-white">{site.name}</div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-white/40">
                      <MapPin size={10} /> {site.city}, {site.country} · {site.connections_count} connections
                    </div>
                  </div>
                  <span className={`status-${site.status.toLowerCase()}`}>{site.status}</span>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-xs text-white/40 mb-1.5">
                    <span>Budget utilization</span>
                    <span className="text-white/60">{util}%</span>
                  </div>
                  <div className="h-1.5 bg-bg-primary rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${util}%`, background: barColor }} />
                  </div>
                </div>

                <div className="flex justify-between text-xs">
                  <div>
                    <span className="text-white/40">Spend: </span>
                    <span className="text-white font-medium">{cfg.currencySymbol} {spend.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-white/40">Budget: </span>
                    <span className="text-white/60">{cfg.currencySymbol} {site.annual_budget.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
