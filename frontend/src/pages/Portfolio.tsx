import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useAppStore } from '@/lib/store'
import { MARKET_CONFIGS } from '@/types'
import { MOCK_SITES, MOCK_CONNECTIONS, CONSUMPTION_MONTHLY, COST_MONTHLY, MONTHS } from '@/lib/mockData'
import { ChartCard } from '@/components/ChartCard'
import { aiApi } from '@/lib/api'
import { Globe, TrendingDown, TrendingUp, CheckCircle2, AlertCircle, XCircle, Bot, RefreshCw } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts'

const TT = { background: '#111520', border: '1px solid #ffffff20', borderRadius: 8, fontSize: 12 }

// Mock country-level aggregated data (NUS Account Summary concept)
const COUNTRIES = [
  { name: 'UAE', flag: '🇦🇪', sites: 9,  connections: 12, spend: 1842300, consumption: 5240000, co2: 2847, quality: 96 },
  { name: 'KSA', flag: '🇸🇦', sites: 3,  connections: 4,  spend: 612400,  consumption: 1820000, co2: 1124, quality: 88 },
  { name: 'QAT', flag: '🇶🇦', sites: 2,  connections: 3,  spend: 398100,  consumption: 940000,  co2: 618,  quality: 72 },
  { name: 'KWT', flag: '🇰🇼', sites: 1,  connections: 1,  spend: 124800,  consumption: 310000,  co2: 198,  quality: 64 },
]

const TOTAL_SPEND       = COUNTRIES.reduce((a, c) => a + c.spend, 0)
const TOTAL_CONSUMPTION = COUNTRIES.reduce((a, c) => a + c.consumption, 0)
const TOTAL_CO2         = COUNTRIES.reduce((a, c) => a + c.co2, 0)
const TOTAL_SITES       = COUNTRIES.reduce((a, c) => a + c.sites, 0)

const COUNTRY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']

// Monthly spend by country (12 months)
const monthlySpend = MONTHS.map((month, i) => {
  const base = COST_MONTHLY[i] ?? 220000
  return {
    month,
    UAE: Math.round(base * 0.62),
    KSA: Math.round(base * 0.21),
    QAT: Math.round(base * 0.11),
    KWT: Math.round(base * 0.06),
  }
})

// Data quality by month
const qualityData = MONTHS.map((month, i) => ({
  month,
  quality: Math.max(60, Math.min(100, 82 + Math.sin(i * 0.8) * 12 + i * 0.5)),
}))

type KpiView = 'spend' | 'consumption' | 'co2'

export default function Portfolio() {
  const { market, aiProvider } = useAppStore()
  const cfg = MARKET_CONFIGS[market]
  const [kpiView,   setKpiView]   = useState<KpiView>('spend')
  const [aiSummary, setAiSummary] = useState<string>('')
  const [aiLoading, setAiLoading] = useState(false)

  const generateAISummary = async () => {
    setAiLoading(true)
    try {
      const connections = MOCK_CONNECTIONS.slice(0, 10)
      const consumption = { monthly_kwh: CONSUMPTION_MONTHLY.electricity, months: MONTHS }
      const res = await aiApi.summary(connections, consumption, market)
      setAiSummary(res.summary ?? '')
    } catch {
      setAiSummary('Failed to generate summary. Make sure the backend is running.')
    }
    setAiLoading(false)
  }

  const activeCount = MOCK_CONNECTIONS.filter(c => c.status === 'Active').length
  const avgQuality  = Math.round(COUNTRIES.reduce((a, c) => a + c.quality, 0) / COUNTRIES.length)

  const pieSeries = kpiView === 'spend'
    ? COUNTRIES.map(c => ({ name: c.name, value: c.spend }))
    : kpiView === 'consumption'
    ? COUNTRIES.map(c => ({ name: c.name, value: c.consumption }))
    : COUNTRIES.map(c => ({ name: c.name, value: c.co2 }))

  const kpiFmt = (v: number) =>
    kpiView === 'spend'       ? `${cfg.currencySymbol} ${(v / 1000).toFixed(0)}K`
    : kpiView === 'consumption' ? `${(v / 1000).toFixed(0)}K kWh`
    : `${v.toFixed(0)} t`

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Portfolio Summary" subtitle="Organisation-wide KPIs across all countries" />
      <div className="flex-1 overflow-y-auto p-6">

        {/* ── Top KPI row ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="card">
            <div className="label mb-1 flex items-center gap-1"><Globe size={11}/> Total Sites</div>
            <div className="text-2xl font-semibold text-white">{TOTAL_SITES}</div>
            <div className="text-xs text-white/40 mt-1">{activeCount} connections active</div>
          </div>
          <div className="card">
            <div className="label mb-1">Total Spend (YTD)</div>
            <div className="text-2xl font-semibold text-white">{cfg.currencySymbol} {(TOTAL_SPEND / 1000000).toFixed(2)}M</div>
            <div className="text-xs text-success-light mt-1 flex items-center gap-1"><TrendingDown size={10}/> −3.1% vs last year</div>
          </div>
          <div className="card">
            <div className="label mb-1">Total Consumption (YTD)</div>
            <div className="text-2xl font-semibold text-white">{(TOTAL_CONSUMPTION / 1000000).toFixed(1)}M kWh</div>
            <div className="text-xs text-danger-light mt-1 flex items-center gap-1"><TrendingUp size={10}/> +4.2% vs last year</div>
          </div>
          <div className="card">
            <div className="label mb-1">Total CO₂ (YTD)</div>
            <div className="text-2xl font-semibold text-white">{(TOTAL_CO2 / 1000).toFixed(1)}K t</div>
            <div className="text-xs text-success-light mt-1 flex items-center gap-1"><TrendingDown size={10}/> −6.8% vs baseline</div>
          </div>
          <div className="card">
            <div className="label mb-1">Data Quality</div>
            <div className="text-2xl font-semibold text-white">{avgQuality}%</div>
            <QualityBar pct={avgQuality} />
          </div>
        </div>

        {/* ── Country breakdown + donut ───────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* Country table */}
          <div className="col-span-2 card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle">
              <h2 className="section-title">Countries Overview</h2>
              <div className="flex items-center gap-1 bg-bg-secondary border border-border-subtle rounded-lg p-0.5">
                {(['spend', 'consumption', 'co2'] as KpiView[]).map(v => (
                  <button key={v} onClick={() => setKpiView(v)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all capitalize ${kpiView === v ? 'bg-accent text-white' : 'text-white/40 hover:text-white/70'}`}>
                    {v === 'co2' ? 'CO₂' : v}
                  </button>
                ))}
              </div>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  {['Country', 'Sites', 'Connections', 'Spend (YTD)', 'Consumption (kWh)', 'CO₂ (t)', 'Data Quality', 'Status'].map(h => (
                    <th key={h} className="tbl-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COUNTRIES.map(c => (
                  <tr key={c.name} className="tbl-row">
                    <td className="tbl-td">
                      <span className="font-medium text-white flex items-center gap-2">
                        {c.flag} {c.name}
                      </span>
                    </td>
                    <td className="tbl-td text-white/70">{c.sites}</td>
                    <td className="tbl-td text-white/70">{c.connections}</td>
                    <td className="tbl-td text-white font-mono">{cfg.currencySymbol} {(c.spend / 1000).toFixed(0)}K</td>
                    <td className="tbl-td text-blue-300 font-mono">{(c.consumption / 1000).toFixed(0)}K</td>
                    <td className="tbl-td text-amber-300 font-mono">{c.co2.toLocaleString()}</td>
                    <td className="tbl-td">
                      <div className="flex items-center gap-2">
                        <QualityBar pct={c.quality} />
                        <span className="text-xs text-white/50">{c.quality}%</span>
                      </div>
                    </td>
                    <td className="tbl-td">
                      {c.quality >= 90
                        ? <span className="status-active flex items-center gap-1"><CheckCircle2 size={10}/> Good</span>
                        : c.quality >= 75
                        ? <span className="status-pending flex items-center gap-1"><AlertCircle size={10}/> Review</span>
                        : <span className="status-inactive flex items-center gap-1"><XCircle size={10}/> Poor</span>
                      }
                    </td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="border-t border-border-default bg-bg-card">
                  <td className="tbl-td font-semibold text-white/60">Total</td>
                  <td className="tbl-td text-white font-semibold">{TOTAL_SITES}</td>
                  <td className="tbl-td text-white font-semibold">{MOCK_CONNECTIONS.length}</td>
                  <td className="tbl-td text-white font-semibold font-mono">{cfg.currencySymbol} {(TOTAL_SPEND / 1000).toFixed(0)}K</td>
                  <td className="tbl-td text-white font-semibold font-mono">{(TOTAL_CONSUMPTION / 1000).toFixed(0)}K</td>
                  <td className="tbl-td text-white font-semibold font-mono">{TOTAL_CO2.toLocaleString()}</td>
                  <td className="tbl-td" colSpan={2}></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Donut chart */}
          <div className="card flex flex-col">
            <h2 className="section-title mb-4 capitalize">{kpiView === 'co2' ? 'CO₂' : kpiView} by Country</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieSeries} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  dataKey="value" nameKey="name" paddingAngle={3}>
                  {pieSeries.map((_, i) => (
                    <Cell key={i} fill={COUNTRY_COLORS[i % COUNTRY_COLORS.length]} opacity={0.9} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TT}
                  formatter={(v: number, name: string) => [kpiFmt(v), name]} />
                <Legend wrapperStyle={{ fontSize: 11 }}
                  formatter={(v, e: any) => `${COUNTRIES.find(c => c.name === v)?.flag ?? ''} ${v} · ${kpiFmt(e.payload.value)}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Monthly spend + data quality ─────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <ChartCard
            title="Monthly Spend by Country"
            subtitle={`Stacked by country · ${cfg.currencySymbol}`}
            table={
              <table className="w-full">
                <thead><tr>
                  <th className="tbl-th">Month</th>
                  {COUNTRIES.map(c => <th key={c.name} className="tbl-th">{c.flag} {c.name}</th>)}
                </tr></thead>
                <tbody>
                  {monthlySpend.map(r => (
                    <tr key={r.month} className="tbl-row">
                      <td className="tbl-td text-white/70">{r.month}</td>
                      {COUNTRIES.map(c => (
                        <td key={c.name} className="tbl-td font-mono text-white/70">
                          {cfg.currencySymbol} {(r[c.name as keyof typeof r] as number / 1000).toFixed(0)}K
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          >
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={monthlySpend} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="month" tick={{ fill: '#5a6385', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#5a6385', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip contentStyle={TT}
                  formatter={(v: number, name: string) => [
                    `${cfg.currencySymbol} ${(v / 1000).toFixed(0)}K`,
                    COUNTRIES.find(c => c.name === name)?.flag + ' ' + name,
                  ]} />
                <Legend wrapperStyle={{ fontSize: 10 }}
                  formatter={v => `${COUNTRIES.find(c => c.name === v)?.flag ?? ''} ${v}`} />
                {COUNTRIES.map((c, i) => (
                  <Bar key={c.name} dataKey={c.name} stackId="a"
                    fill={COUNTRY_COLORS[i]} opacity={0.85}
                    radius={i === COUNTRIES.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Data Quality widget — from NUS */}
          <ChartCard
            title="Data Quality (%)"
            subtitle="Completeness of submitted consumption & cost data — critical for accurate reporting"
            table={
              <table className="w-full">
                <thead><tr><th className="tbl-th">Month</th><th className="tbl-th">Quality %</th><th className="tbl-th">Rating</th></tr></thead>
                <tbody>
                  {qualityData.map(r => (
                    <tr key={r.month} className="tbl-row">
                      <td className="tbl-td text-white/70">{r.month}</td>
                      <td className="tbl-td font-mono" style={{ color: r.quality >= 90 ? '#10b981' : r.quality >= 75 ? '#f59e0b' : '#ef4444' }}>
                        {r.quality.toFixed(0)}%
                      </td>
                      <td className="tbl-td">
                        {r.quality >= 90
                          ? <span className="status-active">Good</span>
                          : r.quality >= 75
                          ? <span className="status-pending">Acceptable</span>
                          : <span className="status-inactive">Poor</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          >
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={qualityData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="month" tick={{ fill: '#5a6385', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#5a6385', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={TT}
                  formatter={(v: number) => [`${v.toFixed(0)}%`, 'Data Quality']} />
                <Bar dataKey="quality" radius={[3, 3, 0, 0]} maxBarSize={28}>
                  {qualityData.map((r, i) => (
                    <Cell key={i}
                      fill={r.quality >= 90 ? '#10b981' : r.quality >= 75 ? '#f59e0b' : '#ef4444'}
                      opacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ── AI Portfolio Summary ────────────────────────────────────────────── */}
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bot size={15} className="text-accent" />
              <h2 className="section-title">AI Portfolio Summary</h2>
              <span className="text-[10px] text-white/30 px-2 py-0.5 bg-bg-hover rounded-full border border-border-subtle">
                {aiProvider === 'claude' ? 'Claude Sonnet' : aiProvider === 'gemini' ? 'Gemini Flash' : 'GPT-4o'}
              </span>
            </div>
            <button onClick={generateAISummary} disabled={aiLoading}
              className="btn-secondary flex items-center gap-2 text-xs disabled:opacity-50">
              <RefreshCw size={11} className={aiLoading ? 'animate-spin' : ''} />
              {aiLoading ? 'Generating…' : aiSummary ? 'Regenerate' : 'Generate AI Summary'}
            </button>
          </div>
          {aiSummary ? (
            <div className="prose-dark text-sm text-white/70 leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{
                __html: aiSummary
                  .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                  .replace(/^## (.*)/gm, '<h3 class="text-white font-semibold text-sm mt-4 mb-1">$1</h3>')
                  .replace(/^### (.*)/gm, '<p class="text-white/80 font-medium mt-3 mb-0.5">$1</p>')
                  .replace(/^- (.*)/gm, '<p class="text-white/60 pl-3">• $1</p>')
                  .replace(/\n\n/g, '<br/>')
              }} />
          ) : (
            <div className="text-center py-6">
              <Bot size={28} className="text-white/10 mx-auto mb-2" />
              <p className="text-white/30 text-sm">Click "Generate AI Summary" to get an AI-powered analysis of your portfolio</p>
              <p className="text-white/20 text-xs mt-1">Includes anomaly detection, cost trends, ESG highlights, and recommendations</p>
            </div>
          )}
        </div>

        {/* ── Sites table ────────────────────────────────────────────────────── */}
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-border-subtle flex items-center justify-between">
            <h2 className="section-title">All Sites</h2>
            <span className="text-xs text-white/30">Showing {MOCK_SITES.length} of {TOTAL_SITES} entries</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle">
                {['Local ID', 'Site Name', 'Country', 'City', 'Type', 'Status', 'Connections', 'Floor Area'].map(h => (
                  <th key={h} className="tbl-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_SITES.map(s => {
                const connCount = MOCK_CONNECTIONS.filter(c => c.site_id === s.id).length
                return (
                  <tr key={s.id} className="tbl-row">
                    <td className="tbl-td font-mono text-xs text-white/50">{s.id.toUpperCase()}</td>
                    <td className="tbl-td text-white font-medium">{s.name}</td>
                    <td className="tbl-td text-white/70">🇦🇪 UAE</td>
                    <td className="tbl-td text-white/60">{s.city}</td>
                    <td className="tbl-td text-white/50">Commercial</td>
                    <td className="tbl-td"><span className="status-active">Open</span></td>
                    <td className="tbl-td text-white/70">{connCount}</td>
                    <td className="tbl-td text-white/50">{((s as any).floor_area_sqm ?? 2400).toLocaleString()} m²</td>
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

function QualityBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? '#10b981' : pct >= 75 ? '#f59e0b' : '#ef4444'
  return (
    <div className="w-full bg-bg-secondary rounded-full h-1.5 overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}
