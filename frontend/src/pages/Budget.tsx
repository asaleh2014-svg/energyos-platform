import { useState, useMemo } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useAppStore } from '@/lib/store'
import { MARKET_CONFIGS } from '@/types'
import { METER_BUDGETS, MONTHS, type MeterBudgetMonth } from '@/lib/mockData'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, Cell, ReferenceLine,
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Package } from 'lucide-react'
import clsx from 'clsx'

const TT = { background:'#111520', border:'1px solid #ffffff20', borderRadius:8, fontSize:12 }

type LevelMode   = 'portfolio' | 'meter'
type PeriodPreset = 'ytd' | 'h1' | 'h2' | 'full' | 'custom'

const PRESETS: { id: PeriodPreset; label: string; months: number[] }[] = [
  { id:'ytd',    label:'YTD (Jan–Jun)',   months:[0,1,2,3,4,5] },
  { id:'h1',     label:'H1 (Jan–Jun)',    months:[0,1,2,3,4,5] },
  { id:'h2',     label:'H2 (Jul–Dec)',    months:[6,7,8,9,10,11] },
  { id:'full',   label:'Full Year',       months:[0,1,2,3,4,5,6,7,8,9,10,11] },
  { id:'custom', label:'Custom range',    months:[] },
]

function fmt(v: number, sym: string) {
  return `${sym} ${v >= 1000 ? `${(v/1000).toFixed(1)}K` : v.toLocaleString()}`
}

export default function Budget() {
  const { market } = useAppStore()
  const cfg = MARKET_CONFIGS[market]

  const [level,         setLevel]         = useState<LevelMode>('portfolio')
  const [selectedMeter, setSelectedMeter] = useState(METER_BUDGETS[0].connection_id)
  const [preset,        setPreset]        = useState<PeriodPreset>('full')
  const [customStart,   setCustomStart]   = useState(0)
  const [customEnd,     setCustomEnd]     = useState(11)

  // Resolve active month indices
  const activeMonths = useMemo(() => {
    if (preset === 'custom') {
      const s = Math.min(customStart, customEnd)
      const e = Math.max(customStart, customEnd)
      return Array.from({length: e - s + 1}, (_, i) => s + i)
    }
    return PRESETS.find(p => p.id === preset)!.months
  }, [preset, customStart, customEnd])

  // ── Aggregate rows for chart ──────────────────────────────────────────────────
  const chartRows = useMemo(() => {
    const source = level === 'meter'
      ? METER_BUDGETS.filter(m => m.connection_id === selectedMeter)
      : METER_BUDGETS

    return activeMonths.map(mi => {
      const month = MONTHS[mi]
      let cb=0, tb=0, xb=0, ca=0, ta=0, xa=0
      source.forEach(meter => {
        const row: MeterBudgetMonth = meter.monthly[mi]
        cb += row.commodity_budget
        tb += row.transport_budget
        xb += row.tax_budget
        ca += row.commodity_actual
        ta += row.transport_actual
        xa += row.tax_actual
      })
      const totalBudget = cb + tb + xb
      const totalActual = ca + ta + xa
      const deviation   = totalActual - totalBudget   // positive = overspend
      const deviationPct = totalBudget > 0 ? (deviation / totalBudget) * 100 : 0
      return {
        month,
        commodity_budget:  cb, transport_budget: tb, tax_budget: xb,
        commodity_actual:  ca, transport_actual: ta, tax_actual: xa,
        total_budget: totalBudget,
        total_actual: totalActual,
        deviation,
        deviationPct,
      }
    })
  }, [level, selectedMeter, activeMonths])

  // ── Summary KPIs ─────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const totalBudget = chartRows.reduce((a,r)=>a+r.total_budget,0)
    const totalActual = chartRows.reduce((a,r)=>a+r.total_actual,0)
    const totalDev    = totalActual - totalBudget
    const commBudget  = chartRows.reduce((a,r)=>a+r.commodity_budget,0)
    const transBudget = chartRows.reduce((a,r)=>a+r.transport_budget,0)
    const taxBudget   = chartRows.reduce((a,r)=>a+r.tax_budget,0)
    const commActual  = chartRows.reduce((a,r)=>a+r.commodity_actual,0)
    const transActual = chartRows.reduce((a,r)=>a+r.transport_actual,0)
    const taxActual   = chartRows.reduce((a,r)=>a+r.tax_actual,0)
    return { totalBudget, totalActual, totalDev, commBudget, transBudget, taxBudget, commActual, transActual, taxActual }
  }, [chartRows])

  const overBudget = kpi.totalDev > 0

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Budget" subtitle="Commodity & non-commodity cost tracking vs budget" />
      <div className="flex-1 overflow-y-auto p-6">

        {/* ── Controls row ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 mb-6">

          {/* Level toggle */}
          <div className="flex items-center gap-1 bg-bg-secondary border border-border-subtle rounded-xl p-1">
            {(['portfolio','meter'] as LevelMode[]).map(l => (
              <button key={l} onClick={() => setLevel(l)}
                className={clsx('px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all',
                  level === l ? 'bg-accent text-white' : 'text-white/40 hover:text-white/70'
                )}>{l}</button>
            ))}
          </div>

          {/* Meter selector (when meter level) */}
          {level === 'meter' && (
            <select
              className="form-select text-sm"
              value={selectedMeter}
              onChange={e => setSelectedMeter(e.target.value)}
            >
              {METER_BUDGETS.map(m => (
                <option key={m.connection_id} value={m.connection_id}>
                  {m.meter} — {m.site} ({m.type})
                </option>
              ))}
            </select>
          )}

          {/* Period presets */}
          <div className="flex items-center gap-1 bg-bg-secondary border border-border-subtle rounded-xl p-1">
            {PRESETS.map(p => (
              <button key={p.id} onClick={() => setPreset(p.id)}
                className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  preset === p.id ? 'bg-accent text-white' : 'text-white/40 hover:text-white/70'
                )}>{p.label}</button>
            ))}
          </div>

          {/* Custom range pickers */}
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

        {/* ── KPI cards ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="card">
            <div className="label mb-1 flex items-center gap-1"><DollarSign size={11}/> Total Budget</div>
            <div className="text-xl font-semibold text-white">{fmt(kpi.totalBudget, cfg.currencySymbol)}</div>
            <div className="text-xs text-white/40 mt-1">{activeMonths.length} month{activeMonths.length!==1?'s':''} · {level}</div>
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
              {overBudget ? <TrendingUp size={11} className="text-danger-light"/> : <TrendingDown size={11} className="text-success-light"/>}
              Deviation
            </div>
            <div className={clsx('text-xl font-semibold', overBudget ? 'text-danger-light' : 'text-success-light')}>
              {overBudget ? '+' : ''}{fmt(kpi.totalDev, cfg.currencySymbol)}
            </div>
            <div className={clsx('text-xs mt-1', overBudget ? 'text-danger-light/70' : 'text-success-light/70')}>
              {overBudget ? '+' : ''}{((kpi.totalDev / kpi.totalBudget) * 100).toFixed(1)}% vs budget
            </div>
          </div>
          <div className="card">
            <div className="label mb-1 flex items-center gap-1"><Package size={11}/> Commodity vs Non-comm.</div>
            <div className="text-sm font-semibold text-white mt-1">
              {fmt(kpi.commActual, cfg.currencySymbol)}
              <span className="text-xs text-white/30 font-normal"> commodity</span>
            </div>
            <div className="text-sm text-white/60 mt-0.5">
              {fmt(kpi.transActual + kpi.taxActual, cfg.currencySymbol)}
              <span className="text-xs text-white/30"> transport + tax</span>
            </div>
          </div>
        </div>

        {/* ── Stacked budget vs actual chart ───────────────────────────────── */}
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="section-title">Budget vs Actual — by Component</h2>
              <p className="text-xs text-white/30 mt-0.5">
                Solid = budget · Hatched / lighter = actual · stacked: commodity + transport + tax
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-white/40">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-violet-500/60 rounded-sm inline-block"/> Commodity</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-sky-500/60 rounded-sm inline-block"/> Transport</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-emerald-500/60 rounded-sm inline-block"/> Tax</span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartRows} margin={{top:5,right:10,left:0,bottom:0}} barGap={2} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08"/>
              <XAxis dataKey="month" tick={{fill:'#5a6385',fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'#5a6385',fontSize:10}} axisLine={false} tickLine={false}
                tickFormatter={v => `${cfg.currencySymbol}${(v/1000).toFixed(0)}K`}/>
              <Tooltip
                contentStyle={TT}
                formatter={(v: number, name: string) => {
                  const labels: Record<string,string> = {
                    commodity_budget:'Commodity (budget)', transport_budget:'Transport (budget)', tax_budget:'Tax (budget)',
                    commodity_actual:'Commodity (actual)', transport_actual:'Transport (actual)', tax_actual:'Tax (actual)',
                  }
                  return [`${cfg.currencySymbol} ${v.toLocaleString()}`, labels[name] ?? name]
                }}
              />
              {/* Budget stack */}
              <Bar dataKey="commodity_budget"  stackId="budget" fill="#8b5cf6" opacity={0.9}  radius={[0,0,0,0]} maxBarSize={32}/>
              <Bar dataKey="transport_budget"  stackId="budget" fill="#0ea5e9" opacity={0.9}  radius={[0,0,0,0]} maxBarSize={32}/>
              <Bar dataKey="tax_budget"        stackId="budget" fill="#10b981" opacity={0.9}  radius={[3,3,0,0]} maxBarSize={32}/>
              {/* Actual stack */}
              <Bar dataKey="commodity_actual"  stackId="actual" fill="#8b5cf6" opacity={0.45} radius={[0,0,0,0]} maxBarSize={32}/>
              <Bar dataKey="transport_actual"  stackId="actual" fill="#0ea5e9" opacity={0.45} radius={[0,0,0,0]} maxBarSize={32}/>
              <Bar dataKey="tax_actual"        stackId="actual" fill="#10b981" opacity={0.45} radius={[3,3,0,0]} maxBarSize={32}/>
            </ComposedChart>
          </ResponsiveContainer>

          {/* Legend clarification */}
          <div className="flex items-center gap-6 mt-3 pt-3 border-t border-border-subtle">
            <div className="flex items-center gap-2 text-xs text-white/50">
              <div className="flex gap-0.5">
                <div className="w-3 h-4 rounded-sm bg-violet-500 opacity-90"/>
                <div className="w-3 h-4 rounded-sm bg-sky-500 opacity-90"/>
                <div className="w-3 h-4 rounded-sm bg-emerald-500 opacity-90"/>
              </div>
              <span>Budget (full opacity)</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/50">
              <div className="flex gap-0.5">
                <div className="w-3 h-4 rounded-sm bg-violet-500 opacity-45"/>
                <div className="w-3 h-4 rounded-sm bg-sky-500 opacity-45"/>
                <div className="w-3 h-4 rounded-sm bg-emerald-500 opacity-45"/>
              </div>
              <span>Actual (lighter)</span>
            </div>
          </div>
        </div>

        {/* ── Deviation chart ──────────────────────────────────────────────── */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="section-title">Monthly Deviation (Actual − Budget)</h2>
              <p className="text-xs text-white/30 mt-0.5">
                <span className="text-danger-light">Red = overspend</span>
                {' · '}
                <span className="text-success-light">Green = savings</span>
                {' · '}
                bars show total deviation in {cfg.currency}
              </p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartRows} margin={{top:5,right:10,left:0,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08"/>
              <XAxis dataKey="month" tick={{fill:'#5a6385',fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis
                tick={{fill:'#5a6385',fontSize:10}} axisLine={false} tickLine={false}
                tickFormatter={v => `${cfg.currencySymbol}${v >= 0 ? '' : '-'}${(Math.abs(v)/1000).toFixed(1)}K`}
              />
              <Tooltip
                contentStyle={TT}
                formatter={(v: number) => [
                  `${v >= 0 ? '+' : ''}${cfg.currencySymbol} ${v.toLocaleString()} (${v >= 0 ? '+' : ''}${((v/chartRows.find(r=>r.deviation===v)?.total_budget!||1)*100).toFixed(1)}%)`,
                  v >= 0 ? '🔴 Overspend' : '🟢 Savings',
                ]}
              />
              <ReferenceLine y={0} stroke="#ffffff20" strokeWidth={1}/>
              <Bar dataKey="deviation" radius={[3,3,3,3]} maxBarSize={36}>
                {chartRows.map((row, i) => (
                  <Cell
                    key={i}
                    fill={row.deviation > 0 ? '#ef4444' : '#10b981'}
                    opacity={0.85}
                  />
                ))}
              </Bar>
              <Line type="monotone" dataKey="deviation" stroke="#ffffff30" strokeWidth={1} dot={false} strokeDasharray="4 2"/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* ── Component breakdown table ─────────────────────────────────────── */}
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-border-subtle">
            <h2 className="section-title">Budget Breakdown — Monthly Detail</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  {['Month','Commodity Budget','Commodity Actual','Transport (B/A)','Tax (B/A)','Total Budget','Total Actual','Deviation',''].map(h=>(
                    <th key={h} className="tbl-th whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chartRows.map(row => {
                  const dev = row.deviation
                  const isOver = dev > 0
                  const pct = row.total_budget > 0 ? (dev / row.total_budget * 100) : 0
                  return (
                    <tr key={row.month} className="tbl-row">
                      <td className="tbl-td font-medium text-white">{row.month}</td>
                      <td className="tbl-td text-white/70">{cfg.currencySymbol} {row.commodity_budget.toLocaleString()}</td>
                      <td className={clsx('tbl-td font-medium', isOver ? 'text-danger-light' : 'text-success-light')}>
                        {cfg.currencySymbol} {row.commodity_actual.toLocaleString()}
                      </td>
                      <td className="tbl-td text-white/50 text-xs">
                        {cfg.currencySymbol} {row.transport_budget.toLocaleString()} / {row.transport_actual.toLocaleString()}
                      </td>
                      <td className="tbl-td text-white/50 text-xs">
                        {cfg.currencySymbol} {row.tax_budget.toLocaleString()} / {row.tax_actual.toLocaleString()}
                      </td>
                      <td className="tbl-td text-white">{cfg.currencySymbol} {row.total_budget.toLocaleString()}</td>
                      <td className={clsx('tbl-td font-semibold', isOver ? 'text-danger-light' : 'text-success-light')}>
                        {cfg.currencySymbol} {row.total_actual.toLocaleString()}
                      </td>
                      <td className={clsx('tbl-td font-semibold', isOver ? 'text-danger-light' : 'text-success-light')}>
                        {isOver ? '+' : ''}{cfg.currencySymbol} {dev.toLocaleString()}
                        <span className="text-xs ml-1 opacity-70">({isOver?'+':''}{pct.toFixed(1)}%)</span>
                      </td>
                      <td className="tbl-td">
                        <div className={clsx('w-2 h-2 rounded-full', isOver ? 'bg-danger' : 'bg-success')} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-t border-border-default bg-bg-secondary">
                <tr>
                  <td className="tbl-td font-semibold text-white">Totals</td>
                  <td className="tbl-td text-white">{cfg.currencySymbol} {kpi.commBudget.toLocaleString()}</td>
                  <td className={clsx('tbl-td font-semibold', overBudget?'text-danger-light':'text-success-light')}>
                    {cfg.currencySymbol} {kpi.commActual.toLocaleString()}
                  </td>
                  <td className="tbl-td text-white/50">{cfg.currencySymbol} {kpi.transBudget.toLocaleString()} / {kpi.transActual.toLocaleString()}</td>
                  <td className="tbl-td text-white/50">{cfg.currencySymbol} {kpi.taxBudget.toLocaleString()} / {kpi.taxActual.toLocaleString()}</td>
                  <td className="tbl-td font-semibold text-white">{cfg.currencySymbol} {kpi.totalBudget.toLocaleString()}</td>
                  <td className={clsx('tbl-td font-semibold', overBudget?'text-danger-light':'text-success-light')}>
                    {cfg.currencySymbol} {kpi.totalActual.toLocaleString()}
                  </td>
                  <td className={clsx('tbl-td font-bold text-base', overBudget?'text-danger-light':'text-success-light')}>
                    {overBudget?'+':''}{cfg.currencySymbol} {kpi.totalDev.toLocaleString()}
                    <span className="text-xs ml-1 opacity-70">({overBudget?'+':''}{((kpi.totalDev/kpi.totalBudget)*100).toFixed(1)}%)</span>
                  </td>
                  <td className="tbl-td">
                    <div className={clsx('w-2 h-2 rounded-full', overBudget?'bg-danger':'bg-success')}/>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
