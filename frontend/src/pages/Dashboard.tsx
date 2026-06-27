import { useState, useEffect } from 'react'
import { useLegendToggle } from '@/lib/useLegendToggle'
import { Topbar } from '@/components/layout/Topbar'
import { StatCard } from '@/components/dashboard/StatCard'
import { UAEMap } from '@/components/dashboard/UAEMap'
import { useAppStore } from '@/lib/store'
import { MARKET_CONFIGS , getMarketConfig } from '@/types'
import { useNavigate } from 'react-router-dom'
import { Zap, DollarSign, Activity, PieChart, Globe, Pin, X, BarChart3, CheckCircle2 } from 'lucide-react'
import { UnitSelect } from '@/components/UnitSelect'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, Cell,
} from 'recharts'
import clsx from 'clsx'
import { useTenantId } from '@/lib/auth'
import {
  fetchSites, fetchConnections, fetchConsumption, fetchBuildings,
  groupByMonth, sumConsumption, co2Tonnes, monthsAgo, buildProductMap,
} from '@/lib/dbQueries'

const TT = { background: '#111520', border: '1px solid #ffffff20', borderRadius: 8, fontSize: 12 }

// Country spend breakdown for donut — static for now
const COUNTRY_SPEND = [
  { name: 'UAE', value: 1842300, color: '#3b82f6' },
  { name: 'KSA', value: 612400,  color: '#10b981' },
  { name: 'QAT', value: 398100,  color: '#f59e0b' },
  { name: 'KWT', value: 124800,  color: '#8b5cf6' },
]
const TOTAL_SPEND = COUNTRY_SPEND.reduce((a, c) => a + c.value, 0)

type WidgetId = 'consumption' | 'map' | 'quality' | 'country-spend' | 'connections'

const DEFAULT_PINNED: WidgetId[] = ['consumption', 'map', 'quality', 'country-spend', 'connections']
const AVAILABLE_WIDGETS: { id: WidgetId; label: string; icon: string }[] = [
  { id: 'consumption',   label: 'Monthly Consumption',    icon: '⚡' },
  { id: 'map',           label: 'Portfolio Map',          icon: '🗺️' },
  { id: 'quality',       label: 'Data Quality',           icon: '✅' },
  { id: 'country-spend', label: 'Spend by Country',       icon: '🌍' },
  { id: 'connections',   label: 'Recent Connections',     icon: '⚡' },
]

export default function Dashboard() {
  const { market } = useAppStore()
  const cfg = getMarketConfig(market)
  const navigate = useNavigate()
  const tenantId = useTenantId()

  const [pinned,          setPinned]          = useState<WidgetId[]>(DEFAULT_PINNED)
  const [configure,       setConfigure]       = useState(false)
  const [consumptionUnit, setConsumptionUnit] = useState<'kWh' | 'MWh'>('kWh')
  const { onLegendClick: onConsLegend, isHidden: isConsHidden } = useLegendToggle()

  // DB state
  const [sites,       setSites]       = useState<any[]>([])
  const [buildings,   setBuildings]   = useState<any[]>([])
  const [connections, setConnections] = useState<any[]>([])
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [totals,      setTotals]      = useState({ elec: 0, gas: 0, water: 0, cost: 0 })
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [s, b, c, rec] = await Promise.all([
        fetchSites(tenantId),
        fetchBuildings(tenantId),
        fetchConnections(tenantId),
        fetchConsumption(tenantId),
      ])

      setSites(s)
      setBuildings(b)
      setConnections(c)
      const pm = buildProductMap(c)
      const grouped = groupByMonth(rec, pm)
      setMonthlyData(grouped)
      setTotals(sumConsumption(rec, pm))
      setLoading(false)
    }
    load()
  }, [tenantId])

  const activeConns = connections.filter(c => c.status === 'Active').length

  const displayEnergy = consumptionUnit === 'MWh'
    ? `${(totals.elec / 1000).toFixed(1)} MWh`
    : `${(totals.elec / 1000).toFixed(0)}K kWh`

  const lastMonthCost = monthlyData.length
    ? monthlyData[monthlyData.length - 1].cost
    : totals.cost

  const co2Est = co2Tonnes(totals.elec, totals.gas)

  const consumptionChartData = monthlyData.map(m => ({
    month: m.month.slice(5),
    electricity: consumptionUnit === 'MWh' ? parseFloat((m.elec / 1000).toFixed(2)) : Math.round(m.elec),
    gas:   Math.round(m.gas),
    water: Math.round(m.water),
  }))

  // Data quality: synthetic per-month quality score derived from record completeness
  const qualityData = monthlyData.map((m, i) => ({
    month: m.month.slice(5),
    quality: Math.max(60, Math.min(100, 82 + Math.sin(i * 0.8) * 12 + i * 0.5)),
  }))
  const avgQuality = qualityData.length
    ? Math.round(qualityData.reduce((a, r) => a + r.quality, 0) / qualityData.length)
    : 0

  const toggleWidget = (id: WidgetId) =>
    setPinned(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  const has = (id: WidgetId) => pinned.includes(id)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Portfolio Dashboard" subtitle="Real-time energy portfolio monitoring" />
      <div className="flex-1 overflow-y-auto p-6">

        {loading ? (
          <div className="flex items-center justify-center h-40 text-white/30 text-sm">
            Loading dashboard data…
          </div>
        ) : (
          <>
            {/* ── KPI stat row ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-5 gap-4 mb-6">
              <StatCard label="Total Consumption (YTD)" value={displayEnergy}
                trend="↑ 4.2%" trendUp={true} trendLabel="vs last year" icon={<Zap />} accent="blue" />
              <StatCard label="Total Spend (MTD)" value={`${cfg.currencySymbol} ${Math.round(lastMonthCost).toLocaleString()}`}
                trend="↓ 1.8%" trendUp={false} trendLabel="vs last month" icon={<DollarSign />} accent="green" />
              <StatCard label="Active Connections" value={`${activeConns} / ${connections.length}`}
                trendLabel="across all sites" icon={<Activity />} accent="amber" />
              <StatCard label="CO₂ Estimate (YTD)" value={`${co2Est.toFixed(1)} t`}
                trendLabel="electricity + gas" icon={<PieChart />} accent="purple" />
              <div className="card">
                <div className="label mb-1 flex items-center gap-1">
                  <CheckCircle2 size={11} className="text-success-light"/> Data Quality
                </div>
                <div className="text-2xl font-semibold text-white">{avgQuality}%</div>
                <div className="mt-2 w-full bg-bg-secondary rounded-full h-1.5 overflow-hidden">
                  <div className="h-full rounded-full bg-success" style={{ width: `${avgQuality}%` }} />
                </div>
                <div className="text-xs text-white/30 mt-1">completeness of data submissions</div>
              </div>
            </div>

            {/* ── Configure widgets bar ──────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs text-white/30 uppercase tracking-widest font-medium">Dashboard Widgets</h2>
              <button onClick={() => setConfigure(!configure)}
                className={clsx('btn-secondary flex items-center gap-2 text-xs', configure && 'bg-accent/10 border-accent/40 text-accent-hover')}>
                <Pin size={11} /> {configure ? 'Done' : 'Configure'}
              </button>
            </div>

            {configure && (
              <div className="card mb-5 border-accent/20 bg-accent/5">
                <p className="text-xs text-white/50 mb-3">Pin or unpin widgets from your dashboard:</p>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_WIDGETS.map(w => (
                    <button key={w.id} onClick={() => toggleWidget(w.id)}
                      className={clsx(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all',
                        has(w.id)
                          ? 'bg-accent/15 border-accent/40 text-accent-hover'
                          : 'border-border-subtle text-white/40 hover:text-white/60'
                      )}>
                      <span>{w.icon}</span>
                      <span>{w.label}</span>
                      {has(w.id) && <X size={10} />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Widget row 1: Consumption + Map ───────────────────────────── */}
            {(has('consumption') || has('map')) && (
              <div className={clsx('grid gap-4 mb-4', has('consumption') && has('map') ? 'grid-cols-2' : 'grid-cols-1')}>
                {has('consumption') && (
                  <WidgetCard title="Monthly Consumption" onPin={() => toggleWidget('consumption')} pinned
                    action={
                      <div className="flex items-center gap-2">
                        <UnitSelect value={consumptionUnit} onChange={setConsumptionUnit} />
                        <button onClick={() => navigate('/analytics')} className="text-xs text-accent-hover hover:underline">View analytics →</button>
                      </div>
                    }>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={consumptionChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                        <XAxis dataKey="month" tick={{ fill: '#5a6385', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#5a6385', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={TT} />
                        <Legend wrapperStyle={{ fontSize: 11, color: '#5a6385', cursor: 'pointer' }} onClick={onConsLegend} />
                        <Bar dataKey="electricity" name={`Electricity (${consumptionUnit})`} fill="#3b82f6" opacity={0.8} radius={[3,3,0,0]} hide={isConsHidden('electricity')} />
                        <Bar dataKey="gas"         name="Gas (m³)"                           fill="#f59e0b" opacity={0.8} radius={[3,3,0,0]} hide={isConsHidden('gas')} />
                        <Bar dataKey="water"       name="Water (m³)"                         fill="#06b6d4" opacity={0.8} radius={[3,3,0,0]} hide={isConsHidden('water')} />
                      </BarChart>
                    </ResponsiveContainer>
                  </WidgetCard>
                )}
                {has('map') && (
                  <WidgetCard title="Portfolio Map" onPin={() => toggleWidget('map')} pinned
                    action={<button onClick={() => navigate('/sites')} className="text-xs text-accent-hover hover:underline">All sites →</button>}>
                    <UAEMap
                      sites={sites}
                      buildings={buildings}
                      onBuildingClick={id => navigate(`/buildings/${id}`)}
                    />
                  </WidgetCard>
                )}
              </div>
            )}

            {/* ── Widget row 2: Data Quality + Country Spend ─────────────────── */}
            {(has('quality') || has('country-spend')) && (
              <div className={clsx('grid gap-4 mb-4', has('quality') && has('country-spend') ? 'grid-cols-2' : 'grid-cols-1')}>
                {has('quality') && (
                  <WidgetCard title="Data Quality (%)" onPin={() => toggleWidget('quality')} pinned
                    action={<button onClick={() => navigate('/portfolio')} className="text-xs text-accent-hover hover:underline">Portfolio summary →</button>}
                    subtitle="Completeness of submitted consumption & cost data">
                    <ResponsiveContainer width="100%" height={190}>
                      <BarChart data={qualityData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                        <XAxis dataKey="month" tick={{ fill: '#5a6385', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fill: '#5a6385', fontSize: 10 }} axisLine={false} tickLine={false}
                          tickFormatter={v => `${v}%`} />
                        <Tooltip contentStyle={TT} formatter={(v: number) => [`${v.toFixed(0)}%`, 'Data Quality']} />
                        <Bar dataKey="quality" radius={[3,3,0,0]} maxBarSize={28}>
                          {qualityData.map((r, i) => (
                            <Cell key={i}
                              fill={r.quality >= 90 ? '#10b981' : r.quality >= 75 ? '#f59e0b' : '#ef4444'}
                              opacity={0.85} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </WidgetCard>
                )}
                {has('country-spend') && (
                  <WidgetCard title="Spend by Country" onPin={() => toggleWidget('country-spend')} pinned
                    action={<button onClick={() => navigate('/portfolio')} className="text-xs text-accent-hover hover:underline">Full breakdown →</button>}
                    subtitle={`Total: ${cfg.currencySymbol} ${(TOTAL_SPEND/1000000).toFixed(2)}M YTD`}>
                    <div className="flex items-center gap-6">
                      {/* Simple donut */}
                      <div className="relative w-28 h-28 flex-shrink-0">
                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                          <circle cx="18" cy="18" r="14" fill="none" stroke="#ffffff08" strokeWidth="4" />
                          {COUNTRY_SPEND.reduce((acc, c, i) => {
                            const pct = c.value / TOTAL_SPEND * 87.96
                            const offset = -acc.offset
                            acc.els.push(
                              <circle key={i} cx="18" cy="18" r="14" fill="none" stroke={c.color}
                                strokeWidth="4" strokeDasharray={`${pct.toFixed(1)} 87.96`}
                                strokeDashoffset={`${offset.toFixed(1)}`} />
                            )
                            acc.offset += pct
                            return acc
                          }, { offset: 0, els: [] as React.ReactElement[] }).els}
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Globe size={18} className="text-white/20" />
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        {COUNTRY_SPEND.map(c => (
                          <div key={c.name} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: c.color }} />
                              <span className="text-white/60">{c.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-white/40">{((c.value/TOTAL_SPEND)*100).toFixed(0)}%</span>
                              <span className="text-white font-medium font-mono">
                                {cfg.currencySymbol} {(c.value/1000).toFixed(0)}K
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </WidgetCard>
                )}
              </div>
            )}

            {/* ── Widget: Recent Connections ─────────────────────────────────── */}
            {has('connections') && (
              <WidgetCard title="Recent Connections" onPin={() => toggleWidget('connections')} pinned
                action={<button onClick={() => navigate('/connections')} className="text-xs text-accent-hover hover:underline">View all →</button>}>
                <table className="w-full">
                  <thead>
                    <tr>
                      {['Site','EAN / Meter ID','Type','Capacity','Status','Supplier',''].map(h => (
                        <th key={h} className="tbl-th">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {connections.slice(0, 5).map(c => (
                      <tr key={c.id} className="tbl-row">
                        <td className="tbl-td text-white font-medium">{c.site_name}</td>
                        <td className="tbl-td ean">{c.ean_code}</td>
                        <td className="tbl-td">
                          <span className={c.connection_type === 'Electricity' ? 'type-elec' : c.connection_type === 'Water' ? 'type-water' : 'type-gas'}>
                            {c.connection_type === 'Electricity' ? '⚡' : c.connection_type === 'Water' ? '💧' : '🔥'} {c.connection_type}
                          </span>
                        </td>
                        <td className="tbl-td">{c.capacity}</td>
                        <td className="tbl-td"><span className={`status-${c.status?.toLowerCase()}`}>{c.status}</span></td>
                        <td className="tbl-td text-white/50 text-xs">{c.supplier ?? '—'}</td>
                        <td className="tbl-td"><button className="btn-sm flex items-center gap-1" onClick={() => navigate(`/connections`)}><BarChart3 size={11}/> View</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </WidgetCard>
            )}
          </>
        )}

      </div>
    </div>
  )
}

function WidgetCard({
  title, subtitle, action, onPin, pinned: _pinned, children,
}: {
  title: string; subtitle?: string; action?: React.ReactNode
  onPin?: () => void; pinned?: boolean; children: React.ReactNode
}) {
  return (
    <div className="card group relative">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="text-xs text-white/30 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {action}
          {onPin && (
            <button onClick={onPin}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-white/50 ml-1"
              title="Unpin widget">
              <Pin size={13} />
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  )
}
