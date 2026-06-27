import { useState, useEffect } from 'react'
import { useLegendToggle } from '@/lib/useLegendToggle'
import { Topbar } from '@/components/layout/Topbar'
import { useTenantId } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { ChartCard } from '@/components/ChartCard'
import { Globe, TrendingDown, TrendingUp, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts'

const TT = { background: '#111520', border: '1px solid #ffffff20', borderRadius: 8, fontSize: 12 }
const COUNTRY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']
const COUNTRY_FLAGS: Record<string, string> = { AE: '🇦🇪', NL: '🇳🇱', SA: '🇸🇦', QA: '🇶🇦', KW: '🇰🇼', DE: '🇩🇪', GB: '🇬🇧' }

type KpiView = 'spend' | 'consumption'

interface CountrySummary {
  code: string
  name: string
  flag: string
  sites: number
  connections: number
  spend: number
  consumption: number  // electricity kWh
  gasConsumption: number  // m³
  waterConsumption: number  // m³
  currency: string
}

interface SiteRow {
  id: string
  name: string
  status: string
  city_name: string
  country_name: string
  country_code: string
  connections: number
}

interface MonthlyRow {
  month: string
  [country: string]: string | number
}

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function monthLabel(period_start: string) {
  const d = new Date(period_start)
  return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear().toString().slice(2)}`
}

export default function Portfolio() {
  const tenantId = useTenantId()
  const [kpiView, setKpiView] = useState<KpiView>('spend')
  const [countries, setCountries] = useState<CountrySummary[]>([])
  const [sites, setSites] = useState<SiteRow[]>([])
  const [monthlySpend, setMonthlySpend] = useState<MonthlyRow[]>([])
  const [loading, setLoading] = useState(true)
  const { onLegendClick, isHidden } = useLegendToggle()

  useEffect(() => {
    if (!tenantId) return
    loadData()
  }, [tenantId])

  async function loadData() {
    setLoading(true)

    // Fetch sites with city → country join
    const { data: sitesRaw } = await supabase
      .from('sites')
      .select('id, name, status, cities(name, countries(name, code, currency))')
      .eq('tenant_id', tenantId)

    // Fetch connections
    const { data: connsRaw } = await supabase
      .from('energy_connections')
      .select('id, site_id, connection_type, product, status')
      .eq('tenant_id', tenantId)

    // Fetch consumption records
    const { data: consumptionRaw } = await supabase
      .from('consumption_records')
      .select('connection_id, period_start, consumption, cost, currency, unit')
      .eq('tenant_id', tenantId)
      .order('period_start')

    if (!sitesRaw || !connsRaw || !consumptionRaw) {
      setLoading(false)
      return
    }

    // Build connection → site map and product map
    const connToSite: Record<string, string> = {}
    const connProduct: Record<string, string> = {}
    connsRaw.forEach(c => { connToSite[c.id] = c.site_id; connProduct[c.id] = c.product ?? c.connection_type ?? 'Electricity' })

    // Build site → country map
    const siteToCountry: Record<string, { name: string; code: string; currency: string; cityName: string }> = {}
    sitesRaw.forEach((s: any) => {
      const city = s.cities
      const country = city?.countries
      siteToCountry[s.id] = {
        name: country?.name ?? 'Unknown',
        code: country?.code ?? 'XX',
        currency: country?.currency ?? 'USD',
        cityName: city?.name ?? '',
      }
    })

    // Aggregate by country
    const countryMap: Record<string, CountrySummary> = {}
    const siteCountryMap: Record<string, string> = {} // siteId → countryCode

    sitesRaw.forEach((s: any) => {
      const c = siteToCountry[s.id]
      if (!c) return
      siteCountryMap[s.id] = c.code
      if (!countryMap[c.code]) {
        countryMap[c.code] = {
          code: c.code,
          name: c.name,
          flag: COUNTRY_FLAGS[c.code] ?? '🌍',
          sites: 0,
          connections: 0,
          spend: 0,
          consumption: 0,
          gasConsumption: 0,
          waterConsumption: 0,
          currency: c.currency,
        }
      }
      countryMap[c.code].sites++
    })

    connsRaw.forEach(c => {
      const countryCode = siteCountryMap[c.site_id]
      if (countryCode && countryMap[countryCode]) {
        countryMap[countryCode].connections++
      }
    })

    // Monthly spend aggregation per country
    const monthlyMap: Record<string, Record<string, number>> = {}

    consumptionRaw.forEach((r: any) => {
      const siteId = connToSite[r.connection_id]
      if (!siteId) return
      const countryCode = siteCountryMap[siteId]
      if (!countryCode || !countryMap[countryCode]) return

      const label = monthLabel(r.period_start)
      if (!monthlyMap[label]) monthlyMap[label] = {}
      monthlyMap[label][countryCode] = (monthlyMap[label][countryCode] ?? 0) + (r.cost ?? 0)

      // Total aggregation
      countryMap[countryCode].spend += r.cost ?? 0
      const product = connProduct[r.connection_id] ?? 'Electricity'
      if (product === 'Water')       countryMap[countryCode].waterConsumption += r.consumption ?? 0
      else if (r.unit === 'kWh')     countryMap[countryCode].consumption      += r.consumption ?? 0
      else                           countryMap[countryCode].gasConsumption   += r.consumption ?? 0
    })

    // Build monthly rows in chronological order
    const sortedMonths = Object.keys(monthlyMap).sort((a, b) => {
      const parse = (s: string) => {
        const [m, y] = s.split(' ')
        return new Date(`${m} 20${y}`).getTime()
      }
      return parse(a) - parse(b)
    })

    const monthlyRows: MonthlyRow[] = sortedMonths.map(month => ({
      month,
      ...monthlyMap[month],
    }))

    // Build sites table
    const siteRows: SiteRow[] = sitesRaw.map((s: any) => {
      const c = siteToCountry[s.id]
      const connCount = connsRaw.filter(cn => cn.site_id === s.id).length
      return {
        id: s.id,
        name: s.name,
        status: s.status,
        city_name: c?.cityName ?? '',
        country_name: c?.name ?? '',
        country_code: c?.code ?? '',
        connections: connCount,
      }
    })

    setCountries(Object.values(countryMap))
    setSites(siteRows)
    setMonthlySpend(monthlyRows)
    setLoading(false)
  }

  const totalSpend = countries.reduce((a, c) => a + c.spend, 0)
  const totalConsumption = countries.reduce((a, c) => a + c.consumption, 0)
  const totalGas   = countries.reduce((a, c) => a + c.gasConsumption, 0)
  const totalWater = countries.reduce((a, c) => a + c.waterConsumption, 0)
  const totalSites = countries.reduce((a, c) => a + c.sites, 0)
  const totalConnections = countries.reduce((a, c) => a + c.connections, 0)

  const pieSeries = countries.map(c => ({
    name: c.name,
    value: kpiView === 'spend' ? c.spend : c.consumption,
  }))

  const kpiFmt = (v: number, currency?: string) =>
    kpiView === 'spend'
      ? `${currency ?? ''} ${(v / 1000).toFixed(0)}K`
      : `${(v / 1000).toFixed(0)}K kWh`

  const countryNames = countries.map(c => c.name)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Portfolio Summary" subtitle="Organisation-wide KPIs across all countries" />
      <div className="flex-1 overflow-y-auto p-6">

        {loading ? (
          <div className="flex items-center justify-center h-64 text-white/40">Loading portfolio data…</div>
        ) : (
          <>
            {/* ── Top KPI row ── */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="card">
                <div className="label mb-1 flex items-center gap-1"><Globe size={11}/> Total Sites</div>
                <div className="text-2xl font-semibold text-white">{totalSites}</div>
                <div className="text-xs text-white/40 mt-1">{totalConnections} connections</div>
              </div>
              <div className="card">
                <div className="label mb-1">Total Spend (All Time)</div>
                <div className="text-2xl font-semibold text-white">{(totalSpend / 1000).toFixed(0)}K</div>
                <div className="text-xs text-success-light mt-1 flex items-center gap-1"><TrendingDown size={10}/> Multi-currency</div>
              </div>
              <div className="card">
                <div className="label mb-1">Total Electricity (kWh)</div>
                <div className="text-2xl font-semibold text-white">{(totalConsumption / 1000000).toFixed(1)}M</div>
                <div className="text-xs text-white/40 mt-1">Gas {(totalGas/1000).toFixed(0)}K m³ · Water {(totalWater/1000).toFixed(0)}K m³</div>
              </div>
              <div className="card">
                <div className="label mb-1">Countries</div>
                <div className="text-2xl font-semibold text-white">{countries.length}</div>
                <div className="text-xs text-white/40 mt-1">{countries.map(c => c.flag).join(' ')}</div>
              </div>
            </div>

            {/* ── Country breakdown + donut ── */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="col-span-2 card p-0 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle">
                  <h2 className="section-title">Countries Overview</h2>
                  <div className="flex items-center gap-1 bg-bg-secondary border border-border-subtle rounded-lg p-0.5">
                    {(['spend', 'consumption'] as KpiView[]).map(v => (
                      <button key={v} onClick={() => setKpiView(v)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all capitalize ${kpiView === v ? 'bg-accent text-white' : 'text-white/40 hover:text-white/70'}`}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-subtle">
                      {['Country', 'Sites', 'Connections', 'Total Spend', 'Electricity (kWh)', 'Gas (m³)', 'Water (m³)', 'Status'].map(h => (
                        <th key={h} className="tbl-th">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {countries.map(c => (
                      <tr key={c.code} className="tbl-row">
                        <td className="tbl-td">
                          <span className="font-medium text-white flex items-center gap-2">
                            {c.flag} {c.name}
                          </span>
                        </td>
                        <td className="tbl-td text-white/70">{c.sites}</td>
                        <td className="tbl-td text-white/70">{c.connections}</td>
                        <td className="tbl-td text-white font-mono">{c.currency} {(c.spend / 1000).toFixed(0)}K</td>
                        <td className="tbl-td text-blue-300 font-mono">{(c.consumption / 1000).toFixed(0)}K</td>
                        <td className="tbl-td text-amber-300 font-mono">{(c.gasConsumption / 1000).toFixed(0)}K</td>
                        <td className="tbl-td text-cyan-300 font-mono">{(c.waterConsumption / 1000).toFixed(0)}K</td>
                        <td className="tbl-td">
                          <span className="status-active flex items-center gap-1"><CheckCircle2 size={10}/> Active</span>
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-border-default bg-bg-card">
                      <td className="tbl-td font-semibold text-white/60">Total</td>
                      <td className="tbl-td text-white font-semibold">{totalSites}</td>
                      <td className="tbl-td text-white font-semibold">{totalConnections}</td>
                      <td className="tbl-td text-white font-semibold font-mono">— (multi-currency)</td>
                      <td className="tbl-td text-blue-300 font-semibold font-mono">{(totalConsumption / 1000).toFixed(0)}K kWh</td>
                      <td className="tbl-td text-amber-300 font-semibold font-mono">{(totalGas / 1000).toFixed(0)}K m³</td>
                      <td className="tbl-td text-cyan-300 font-semibold font-mono">{(totalWater / 1000).toFixed(0)}K m³</td>
                      <td className="tbl-td"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="card flex flex-col">
                <h2 className="section-title mb-4 capitalize">{kpiView} by Country</h2>
                {pieSeries.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieSeries} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                        dataKey="value" nameKey="name" paddingAngle={3}>
                        {pieSeries.map((_, i) => (
                          <Cell key={i} fill={COUNTRY_COLORS[i % COUNTRY_COLORS.length]} opacity={0.9} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TT}
                        formatter={(v: number, name: string) => {
                          const c = countries.find(x => x.name === name)
                          return [kpiView === 'spend' ? `${c?.currency ?? ''} ${(v/1000).toFixed(0)}K` : `${(v/1000).toFixed(0)}K kWh`, name]
                        }} />
                      <Legend wrapperStyle={{ fontSize: 11 }}
                        formatter={(v) => {
                          const c = countries.find(x => x.name === v)
                          return `${c?.flag ?? ''} ${v}`
                        }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-white/30 text-sm">No data</div>
                )}
              </div>
            </div>

            {/* ── Monthly spend chart ── */}
            {monthlySpend.length > 0 && (
              <div className="card mb-4">
                <ChartCard
                  title="Monthly Spend by Country"
                  subtitle="Stacked by country (each country in its own currency)"
                  table={
                    <table className="w-full">
                      <thead><tr>
                        <th className="tbl-th">Month</th>
                        {countryNames.map(n => <th key={n} className="tbl-th">{countries.find(c=>c.name===n)?.flag} {n}</th>)}
                      </tr></thead>
                      <tbody>
                        {monthlySpend.map(r => (
                          <tr key={r.month} className="tbl-row">
                            <td className="tbl-td text-white/70">{r.month}</td>
                            {countries.map(c => (
                              <td key={c.code} className="tbl-td font-mono text-white/70">
                                {c.currency} {(((r[c.code] as number) ?? 0) / 1000).toFixed(0)}K
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  }
                >
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={monthlySpend.map(r => {
                      const row: any = { month: r.month }
                      countries.forEach(c => { row[c.name] = (r[c.code] as number) ?? 0 })
                      return row
                    })} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                      <XAxis dataKey="month" tick={{ fill: '#5a6385', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#5a6385', fontSize: 10 }} axisLine={false} tickLine={false}
                        tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                      <Tooltip contentStyle={TT}
                        formatter={(v: number, name: string) => {
                          const c = countries.find(x => x.name === name)
                          return [`${c?.currency ?? ''} ${(v / 1000).toFixed(0)}K`, `${c?.flag ?? ''} ${name}`]
                        }} />
                      <Legend wrapperStyle={{ fontSize: 10, cursor: 'pointer' }}
                        formatter={v => `${countries.find(c => c.name === v)?.flag ?? ''} ${v}`}
                        onClick={onLegendClick} />
                      {countries.map((c, i) => (
                        <Bar key={c.code} dataKey={c.name} stackId="a"
                          fill={COUNTRY_COLORS[i % COUNTRY_COLORS.length]} opacity={0.85}
                          radius={i === countries.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                          hide={isHidden(c.name)} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
            )}

            {/* ── Sites table ── */}
            <div className="card p-0 overflow-hidden">
              <div className="px-5 py-3 border-b border-border-subtle flex items-center justify-between">
                <h2 className="section-title">All Sites</h2>
                <span className="text-xs text-white/30">{sites.length} sites</span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-subtle">
                    {['Site Name', 'Country', 'City', 'Status', 'Connections'].map(h => (
                      <th key={h} className="tbl-th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sites.map(s => (
                    <tr key={s.id} className="tbl-row">
                      <td className="tbl-td text-white font-medium">{s.name}</td>
                      <td className="tbl-td text-white/70">
                        {COUNTRY_FLAGS[s.country_code] ?? '🌍'} {s.country_name}
                      </td>
                      <td className="tbl-td text-white/60">{s.city_name}</td>
                      <td className="tbl-td">
                        {s.status === 'Active'
                          ? <span className="status-active flex items-center gap-1"><CheckCircle2 size={10}/> Active</span>
                          : s.status === 'Pending'
                          ? <span className="status-pending flex items-center gap-1"><AlertCircle size={10}/> Pending</span>
                          : <span className="status-inactive flex items-center gap-1"><XCircle size={10}/> Inactive</span>}
                      </td>
                      <td className="tbl-td text-white/70">{s.connections}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

      </div>
    </div>
  )
}

function QualityBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? '#10b981' : pct >= 75 ? '#f59e0b' : '#ef4444'
  return (
    <div className="w-full bg-bg-secondary rounded-full h-1.5 overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}
