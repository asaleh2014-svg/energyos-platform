import { useState, useEffect, useMemo } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useAppStore } from '@/lib/store'
import { MARKET_CONFIGS } from '@/types'
import { useTenantId } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { fetchConnections } from '@/lib/dbQueries'
import { ChartCard } from '@/components/ChartCard'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell, ReferenceLine,
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Package, Loader2 } from 'lucide-react'
import clsx from 'clsx'

const TT = { background:'#111520', border:'1px solid #ffffff20', borderRadius:8, fontSize:12 }
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTH_KEYS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'] as const

type PeriodPreset = 'ytd' | 'h1' | 'h2' | 'full' | 'custom'
const PRESETS: { id: PeriodPreset; label: string; months: number[] }[] = [
  { id:'ytd',    label:'YTD (Jan–Jun)',  months:[0,1,2,3,4,5] },
  { id:'h1',     label:'H1 (Jan–Jun)',   months:[0,1,2,3,4,5] },
  { id:'h2',     label:'H2 (Jul–Dec)',   months:[6,7,8,9,10,11] },
  { id:'full',   label:'Full Year',      months:[0,1,2,3,4,5,6,7,8,9,10,11] },
  { id:'custom', label:'Custom range',   months:[] },
]

interface BudgetRow {
  connection_id: string
  site_name: string
  ean_code: string
  conn_type: string
  year: number
  monthly: number[] // 12 values
}

interface ActualRow {
  connection_id: string
  monthly: number[] // 12 values of cost
}

function fmt(v: number, sym: string) {
  return `${sym} ${v >= 1000 ? `${(v/1000).toFixed(1)}K` : v.toLocaleString()}`
}

export default function Budget() {
  const { market } = useAppStore()
  const cfg = MARKET_CONFIGS[market]
  const tenantId = useTenantId()

  const [loading, setLoading]     = useState(true)
  const [budgets, setBudgets]     = useState<BudgetRow[]>([])
  const [actuals, setActuals]     = useState<ActualRow[]>([])
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [preset,       setPreset]        = useState<PeriodPreset>('full')
  const [customStart,  setCustomStart]   = useState(0)
  const [customEnd,    setCustomEnd]     = useState(11)

  // On first load, find the most recent year with budget data
  useEffect(() => {
    supabase
      .from('budgets')
      .select('year')
      .eq('tenant_id', tenantId)
      .order('year', { ascending: false })
      .then(({ data }) => {
        const years = [...new Set((data ?? []).map((r: any) => Number(r.year)))].sort((a, b) => b - a)
        if (years.length > 0) {
          setAvailableYears(years)
          setSelectedYear(years[0])
        }
      })
  }, [tenantId])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [connsRaw, budgetsRaw] = await Promise.all([
        fetchConnections(tenantId),
        supabase
          .from('budgets')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('year', selectedYear),
      ])

      const conns = connsRaw as any[]
      const bRows: BudgetRow[] = (budgetsRaw.data ?? []).map((b: any) => {
        const conn = conns.find(c => c.id === b.connection_id)
        return {
          connection_id: b.connection_id,
          site_name: conn?.site_name ?? 'Unknown',
          ean_code:  conn?.ean_code  ?? b.connection_id,
          conn_type: conn?.connection_type ?? 'Electricity',
          year: b.year,
          monthly: MONTH_KEYS.map(k => Number(b[k] ?? 0)),
        }
      })
      setBudgets(bRows)

      // Fetch actuals for selected year
      const yearStart = `${selectedYear}-01-01`
      const yearEnd   = `${selectedYear}-12-31`
      const { data: recRaw } = await supabase
        .from('consumption_records')
        .select('connection_id, period_start, cost')
        .eq('tenant_id', tenantId)
        .gte('period_start', yearStart)
        .lte('period_start', yearEnd)

      // Group actuals by connection_id + month
      const actualMap: Record<string, number[]> = {}
      for (const r of (recRaw ?? [])) {
        const cid  = r.connection_id
        const mo   = Number(r.period_start?.slice(5, 7) ?? 0) - 1
        if (mo < 0 || mo > 11) continue
        if (!actualMap[cid]) actualMap[cid] = Array(12).fill(0)
        actualMap[cid][mo] += Number(r.cost ?? 0)
      }

      setActuals(Object.entries(actualMap).map(([cid, monthly]) => ({ connection_id: cid, monthly })))
      setLoading(false)
    }
    load()
  }, [tenantId, selectedYear])

  const activeMonths = useMemo(() => {
    if (preset === 'custom') {
      const s = Math.min(customStart, customEnd)
      const e = Math.max(customStart, customEnd)
      return Array.from({ length: e - s + 1 }, (_, i) => s + i)
    }
    return PRESETS.find(p => p.id === preset)!.months
  }, [preset, customStart, customEnd])

  const chartRows = useMemo(() =>
    activeMonths.map(mi => {
      const totalBudget = budgets.reduce((a, b) => a + b.monthly[mi], 0)
      const totalActual = actuals.reduce((a, r) => a + r.monthly[mi], 0)
      const deviation   = totalActual - totalBudget
      return {
        month:        MONTHS[mi],
        total_budget: Math.round(totalBudget),
        total_actual: Math.round(totalActual),
        deviation:    Math.round(deviation),
        deviationPct: totalBudget > 0 ? (deviation / totalBudget) * 100 : 0,
      }
    })
  , [budgets, actuals, activeMonths])

  const kpi = useMemo(() => {
    const totalBudget = chartRows.reduce((a, r) => a + r.total_budget, 0)
    const totalActual = chartRows.reduce((a, r) => a + r.total_actual, 0)
    return { totalBudget, totalActual, totalDev: totalActual - totalBudget }
  }, [chartRows])

  const overBudget = kpi.totalDev > 0
  const hasBudgets = budgets.length > 0

  // Per-connection summary table
  const connSummary = useMemo(() => {
    return budgets.map(b => {
      const act = actuals.find(a => a.connection_id === b.connection_id)
      const budget = activeMonths.reduce((a, mi) => a + b.monthly[mi], 0)
      const actual = activeMonths.reduce((a, mi) => a + (act?.monthly[mi] ?? 0), 0)
      const dev    = actual - budget
      return { ...b, budget, actual, dev }
    })
  }, [budgets, actuals, activeMonths])

  if (loading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Topbar title="Budget Detail" subtitle="Commodity & non-commodity cost tracking vs budget" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-white/30" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Budget Detail" subtitle="Budget vs actual cost tracking" />
      <div className="flex-1 overflow-y-auto p-6">

        {/* ── Controls ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Year selector */}
          <select className="form-select text-sm" value={selectedYear} onChange={e => setSelectedYear(+e.target.value)}>
            {(availableYears.length > 0 ? availableYears : [2023,2024,2025,2026,2027]).map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {/* Period presets */}
          <div className="flex items-center gap-1 bg-bg-secondary border border-border-subtle rounded-xl p-1">
            {PRESETS.map(p => (
              <button key={p.id} onClick={() => setPreset(p.id)}
                className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  preset === p.id ? 'bg-accent text-white' : 'text-white/40 hover:text-white/70'
                )}>{p.label}</button>
            ))}
          </div>

          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <select className="form-select text-xs" value={customStart} onChange={e => setCustomStart(+e.target.value)}>
                {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <span className="text-white/30 text-xs">to</span>
              <select className="form-select text-xs" value={customEnd} onChange={e => setCustomEnd(+e.target.value)}>
                {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* ── Empty state ───────────────────────────────────────────────── */}
        {!hasBudgets && (
          <div className="card mb-6 flex flex-col items-center justify-center py-12 gap-3 text-center">
            <DollarSign size={32} className="text-white/20" />
            <div className="text-white/60 font-medium">No budget data for {selectedYear}</div>
            <p className="text-xs text-white/30 max-w-sm">
              Budget rows are stored in the <code className="text-accent">budgets</code> table with one row per connection per year,
              and monthly amounts in the <code className="text-accent">jan–dec</code> columns. Add rows there to see comparisons here.
            </p>
          </div>
        )}

        {/* ── KPI cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="card">
            <div className="label mb-1 flex items-center gap-1"><DollarSign size={11}/> Total Budget</div>
            <div className="text-xl font-semibold text-white">{fmt(kpi.totalBudget, cfg.currencySymbol)}</div>
            <div className="text-xs text-white/40 mt-1">{activeMonths.length} month{activeMonths.length!==1?'s':''} · {selectedYear}</div>
          </div>
          <div className="card">
            <div className="label mb-1 flex items-center gap-1"><DollarSign size={11}/> Total Actual</div>
            <div className={clsx('text-xl font-semibold', overBudget ? 'text-danger-light' : 'text-success-light')}>
              {fmt(kpi.totalActual, cfg.currencySymbol)}
            </div>
            <div className="text-xs text-white/40 mt-1">{overBudget ? '▲ overspend' : '▼ under budget'}</div>
          </div>
          <div className="card">
            <div className="label mb-1 flex items-center gap-1">
              {overBudget
                ? <TrendingUp size={11} className="text-danger-light"/>
                : <TrendingDown size={11} className="text-success-light"/>}
              Deviation
            </div>
            <div className={clsx('text-xl font-semibold', overBudget ? 'text-danger-light' : 'text-success-light')}>
              {overBudget?'+':''}{fmt(kpi.totalDev, cfg.currencySymbol)}
            </div>
            <div className={clsx('text-xs mt-1', overBudget ? 'text-danger-light/70' : 'text-success-light/70')}>
              {kpi.totalBudget > 0 ? `${overBudget?'+':''}${((kpi.totalDev/kpi.totalBudget)*100).toFixed(1)}% vs budget` : '—'}
            </div>
          </div>
          <div className="card">
            <div className="label mb-1 flex items-center gap-1"><Package size={11}/> Coverage</div>
            <div className={clsx('text-xl font-semibold', kpi.totalBudget > 0 && kpi.totalActual / kpi.totalBudget > 1.05 ? 'text-danger-light' : 'text-success-light')}>
              {kpi.totalBudget > 0 ? `${((kpi.totalActual/kpi.totalBudget)*100).toFixed(1)}%` : '—'}
            </div>
            <div className="text-xs text-white/40 mt-1">actual as % of budget</div>
          </div>
        </div>

        {/* ── Budget vs Actual chart ───────────────────────────────────── */}
        <ChartCard
          title="Budget vs Actual (AED)"
          subtitle="Monthly comparison — budget (full opacity) vs actual (lighter)"
          className="mb-4"
          table={
            <table className="w-full">
              <thead><tr>{['Month','Budget','Actual','Deviation'].map(h=><th key={h} className="tbl-th">{h}</th>)}</tr></thead>
              <tbody>
                {chartRows.map(row => (
                  <tr key={row.month} className="tbl-row">
                    <td className="tbl-td text-white font-medium">{row.month}</td>
                    <td className="tbl-td font-mono text-blue-300">{cfg.currencySymbol} {row.total_budget.toLocaleString()}</td>
                    <td className={clsx('tbl-td font-semibold', row.deviation > 0 ? 'text-danger-light' : 'text-success-light')}>
                      {cfg.currencySymbol} {row.total_actual.toLocaleString()}
                    </td>
                    <td className={clsx('tbl-td font-semibold', row.deviation > 0 ? 'text-danger-light' : 'text-success-light')}>
                      {row.deviation > 0 ? '+' : ''}{cfg.currencySymbol} {row.deviation.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-border-default bg-bg-secondary">
                <tr>
                  <td className="tbl-td font-semibold text-white">Totals</td>
                  <td className="tbl-td font-semibold text-white">{cfg.currencySymbol} {kpi.totalBudget.toLocaleString()}</td>
                  <td className={clsx('tbl-td font-semibold', overBudget ? 'text-danger-light' : 'text-success-light')}>
                    {cfg.currencySymbol} {kpi.totalActual.toLocaleString()}
                  </td>
                  <td className={clsx('tbl-td font-bold', overBudget ? 'text-danger-light' : 'text-success-light')}>
                    {overBudget?'+':''}{cfg.currencySymbol} {kpi.totalDev.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          }
        >
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartRows} margin={{top:5,right:10,left:0,bottom:0}} barGap={2} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08"/>
              <XAxis dataKey="month" tick={{fill:'#5a6385',fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'#5a6385',fontSize:10}} axisLine={false} tickLine={false}
                tickFormatter={v => `${cfg.currencySymbol}${(v/1000).toFixed(0)}K`}/>
              <Tooltip contentStyle={TT}
                formatter={(v: number, name: string) => [`${cfg.currencySymbol} ${v.toLocaleString()}`, name === 'total_budget' ? 'Budget' : 'Actual']}/>
              <Bar dataKey="total_budget" name="total_budget" fill="#3b82f6" opacity={0.85} radius={[3,3,0,0]} maxBarSize={32}/>
              <Bar dataKey="total_actual" name="total_actual" fill="#3b82f6" opacity={0.4}  radius={[3,3,0,0]} maxBarSize={32}/>
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* ── Deviation chart ────────────────────────────────────────────── */}
        <ChartCard
          title="Monthly Deviation (Actual − Budget)"
          subtitle={`Red = overspend · Green = savings · bars show total deviation in ${cfg.currency}`}
          className="mb-6"
          table={
            <table className="w-full">
              <thead><tr>{['Month','Budget','Actual','Deviation','%'].map(h=><th key={h} className="tbl-th">{h}</th>)}</tr></thead>
              <tbody>
                {chartRows.map(row => (
                  <tr key={row.month} className="tbl-row">
                    <td className="tbl-td text-white font-medium">{row.month}</td>
                    <td className="tbl-td text-white/60">{cfg.currencySymbol} {row.total_budget.toLocaleString()}</td>
                    <td className="tbl-td text-white/60">{cfg.currencySymbol} {row.total_actual.toLocaleString()}</td>
                    <td className={clsx('tbl-td font-semibold', row.deviation > 0 ? 'text-danger-light' : 'text-success-light')}>
                      {row.deviation > 0 ? '+' : ''}{cfg.currencySymbol} {row.deviation.toLocaleString()}
                    </td>
                    <td className={clsx('tbl-td font-mono', row.deviation > 0 ? 'text-danger-light' : 'text-success-light')}>
                      {row.deviation > 0 ? '+' : ''}{row.deviationPct.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartRows} margin={{top:5,right:10,left:0,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08"/>
              <XAxis dataKey="month" tick={{fill:'#5a6385',fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'#5a6385',fontSize:10}} axisLine={false} tickLine={false}
                tickFormatter={v => `${cfg.currencySymbol}${v>=0?'':'-'}${(Math.abs(v)/1000).toFixed(1)}K`}/>
              <Tooltip contentStyle={TT}
                formatter={(v: number) => [
                  `${v>=0?'+':''}${cfg.currencySymbol} ${v.toLocaleString()}`,
                  v >= 0 ? 'Overspend' : 'Savings',
                ]}/>
              <ReferenceLine y={0} stroke="#ffffff20" strokeWidth={1}/>
              <Bar dataKey="deviation" radius={[3,3,3,3]} maxBarSize={36}>
                {chartRows.map((row, i) => (
                  <Cell key={i} fill={row.deviation > 0 ? '#ef4444' : '#10b981'} opacity={0.85}/>
                ))}
              </Bar>
              <Line type="monotone" dataKey="deviation" stroke="#ffffff30" strokeWidth={1} dot={false} strokeDasharray="4 2"/>
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* ── Per-connection table ──────────────────────────────────────── */}
        {connSummary.length > 0 && (
          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-border-subtle">
              <h2 className="section-title">Per-Connection Budget Summary</h2>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-subtle">
                  {['EAN / ID','Site','Type','Budget (AED)','Actual (AED)','Deviation','%'].map(h => (
                    <th key={h} className="tbl-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {connSummary.map((m, i) => {
                  const p = m.budget > 0 ? ((m.dev / m.budget) * 100).toFixed(1) : '—'
                  return (
                    <tr key={m.connection_id} className={clsx('border-b border-border-subtle hover:bg-bg-card/50', i%2===0 ? 'bg-[#0d3d4a]/30' : '')}>
                      <td className="tbl-td font-mono text-white/60 text-[10px]">{m.ean_code}</td>
                      <td className="tbl-td text-white/70 max-w-[130px] truncate">{m.site_name}</td>
                      <td className="tbl-td">
                        <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-full', m.conn_type === 'Electricity' ? 'bg-blue-500/15 text-blue-300' : 'bg-amber-500/15 text-amber-300')}>
                          {m.conn_type}
                        </span>
                      </td>
                      <td className="tbl-td font-mono text-white/70 text-right">{m.budget.toLocaleString()}</td>
                      <td className="tbl-td font-mono text-white/70 text-right">{m.actual.toLocaleString()}</td>
                      <td className={clsx('tbl-td font-mono font-semibold text-right', m.dev > 0 ? 'text-danger-light' : 'text-success-light')}>
                        {m.dev > 0 ? '+' : ''}{m.dev.toLocaleString()}
                      </td>
                      <td className={clsx('tbl-td font-semibold text-right text-[10px]', m.dev > 0 ? 'text-danger-light' : 'text-success-light')}>
                        {m.dev > 0 ? '+' : ''}{p}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  )
}
