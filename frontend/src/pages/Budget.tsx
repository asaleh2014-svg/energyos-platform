import { useState, useMemo } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useAppStore } from '@/lib/store'
import { MARKET_CONFIGS } from '@/types'
import { METER_BUDGETS, MONTHS, type MeterBudgetMonth } from '@/lib/mockData'
import { FULL_CONNECTIONS } from '@/lib/connectionsData'
import { ChartCard } from '@/components/ChartCard'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell, ReferenceLine,
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Package } from 'lucide-react'
import clsx from 'clsx'

const TT = { background:'#111520', border:'1px solid #ffffff20', borderRadius:8, fontSize:12 }

type LevelMode    = 'portfolio' | 'city' | 'site' | 'building' | 'connection'
type PeriodPreset = 'ytd' | 'h1' | 'h2' | 'full' | 'custom'

const PRESETS: { id: PeriodPreset; label: string; months: number[] }[] = [
  { id:'ytd',    label:'YTD (Jan–Jun)',  months:[0,1,2,3,4,5] },
  { id:'h1',     label:'H1 (Jan–Jun)',   months:[0,1,2,3,4,5] },
  { id:'h2',     label:'H2 (Jul–Dec)',   months:[6,7,8,9,10,11] },
  { id:'full',   label:'Full Year',      months:[0,1,2,3,4,5,6,7,8,9,10,11] },
  { id:'custom', label:'Custom range',   months:[] },
]

// ─── Static grouping lookups ──────────────────────────────────────────────────
const BUDGET_SITE_CITY: Record<string, string> = {
  'Dubai Business Bay':     'Dubai',
  'DIFC Tower':             'Dubai',
  'Masdar City Hub':        'Abu Dhabi',
  'Masdar City Hub (Gas)':  'Abu Dhabi',
  'Sharjah Industrial Zone':'Sharjah',
  'RAK Free Zone':          'Ras Al Khaimah',
}

const BUDGET_CONN_BUILDING: Record<string, string> = {
  'conn-001': 'Tower A',
  'conn-002': 'Office Tower',
  'conn-003': 'HQ Building',
  'conn-004': 'HQ Building',
  'conn-005': 'Warehouse',
  'conn-006': 'Factory A',
}

function getGroupKey(mb: (typeof METER_BUDGETS)[0], level: LevelMode): string {
  switch (level) {
    case 'portfolio':  return 'Portfolio'
    case 'city':       return BUDGET_SITE_CITY[mb.site] ?? 'Unknown'
    case 'site':       return mb.site
    case 'building':   return BUDGET_CONN_BUILDING[mb.connection_id] ?? 'Unknown'
    case 'connection': return mb.meter
    default:           return 'Portfolio'
  }
}

function fmt(v: number, sym: string) {
  return `${sym} ${v >= 1000 ? `${(v/1000).toFixed(1)}K` : v.toLocaleString()}`
}

export default function Budget() {
  const { market } = useAppStore()
  const cfg = MARKET_CONFIGS[market]

  const [level,           setLevel]           = useState<LevelMode>('portfolio')
  const [selectedConn,    setSelectedConn]    = useState(METER_BUDGETS[0].connection_id)
  const [selectedSite,    setSelectedSite]    = useState(METER_BUDGETS[0].site)
  const [selectedBuilding,setSelectedBuilding]= useState(Object.values(BUDGET_CONN_BUILDING)[0])
  const [selectedCity,    setSelectedCity]    = useState('Dubai')
  const [preset,          setPreset]          = useState<PeriodPreset>('full')
  const [customStart,     setCustomStart]     = useState(0)
  const [customEnd,       setCustomEnd]       = useState(11)

  const cities    = [...new Set(Object.values(BUDGET_SITE_CITY))]
  const sites     = [...new Set(METER_BUDGETS.map(m => m.site))]
  const buildings = [...new Set(Object.values(BUDGET_CONN_BUILDING))]

  const activeMonths = useMemo(() => {
    if (preset === 'custom') {
      const s = Math.min(customStart, customEnd)
      const e = Math.max(customStart, customEnd)
      return Array.from({ length: e - s + 1 }, (_, i) => s + i)
    }
    return PRESETS.find(p => p.id === preset)!.months
  }, [preset, customStart, customEnd])

  // Filter source meters to selected entity
  const sourceMeters = useMemo(() => {
    switch (level) {
      case 'portfolio':  return METER_BUDGETS
      case 'city':       return METER_BUDGETS.filter(m => BUDGET_SITE_CITY[m.site] === selectedCity)
      case 'site':       return METER_BUDGETS.filter(m => m.site === selectedSite)
      case 'building':   return METER_BUDGETS.filter(m => BUDGET_CONN_BUILDING[m.connection_id] === selectedBuilding)
      case 'connection': return METER_BUDGETS.filter(m => m.connection_id === selectedConn)
      default:           return METER_BUDGETS
    }
  }, [level, selectedCity, selectedSite, selectedBuilding, selectedConn])

  const chartRows = useMemo(() =>
    activeMonths.map(mi => {
      const month = MONTHS[mi]
      let cb=0, tb=0, xb=0, ca=0, ta=0, xa=0
      sourceMeters.forEach(meter => {
        const row: MeterBudgetMonth = meter.monthly[mi]
        cb += row.commodity_budget;  tb += row.transport_budget;  xb += row.tax_budget
        ca += row.commodity_actual;  ta += row.transport_actual;  xa += row.tax_actual
      })
      const totalBudget  = cb + tb + xb
      const totalActual  = ca + ta + xa
      const deviation    = totalActual - totalBudget
      const deviationPct = totalBudget > 0 ? (deviation / totalBudget) * 100 : 0
      return {
        month, commodity_budget:cb, transport_budget:tb, tax_budget:xb,
        commodity_actual:ca, transport_actual:ta, tax_actual:xa,
        total_budget:totalBudget, total_actual:totalActual, deviation, deviationPct,
      }
    })
  , [sourceMeters, activeMonths])

  const kpi = useMemo(() => {
    const totalBudget = chartRows.reduce((a,r)=>a+r.total_budget,0)
    const totalActual = chartRows.reduce((a,r)=>a+r.total_actual,0)
    const totalDev    = totalActual - totalBudget
    return {
      totalBudget, totalActual, totalDev,
      commBudget:  chartRows.reduce((a,r)=>a+r.commodity_budget,0),
      transBudget: chartRows.reduce((a,r)=>a+r.transport_budget,0),
      taxBudget:   chartRows.reduce((a,r)=>a+r.tax_budget,0),
      commActual:  chartRows.reduce((a,r)=>a+r.commodity_actual,0),
      transActual: chartRows.reduce((a,r)=>a+r.transport_actual,0),
      taxActual:   chartRows.reduce((a,r)=>a+r.tax_actual,0),
    }
  }, [chartRows])

  const overBudget = kpi.totalDev > 0

  // ─── Budget-vs-actual table ──────────────────────────────────────────────────
  const budgetTable = (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            {['Month','Commodity B','Commodity A','Transport (B/A)','Tax (B/A)','Total Budget','Total Actual','Deviation'].map(h=>(
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
                <td className="tbl-td text-white/60">{cfg.currencySymbol} {row.commodity_budget.toLocaleString()}</td>
                <td className={clsx('tbl-td font-medium', isOver?'text-danger-light':'text-success-light')}>
                  {cfg.currencySymbol} {row.commodity_actual.toLocaleString()}
                </td>
                <td className="tbl-td text-white/45 text-[10px]">
                  {cfg.currencySymbol} {row.transport_budget.toLocaleString()} / {row.transport_actual.toLocaleString()}
                </td>
                <td className="tbl-td text-white/45 text-[10px]">
                  {cfg.currencySymbol} {row.tax_budget.toLocaleString()} / {row.tax_actual.toLocaleString()}
                </td>
                <td className="tbl-td text-white">{cfg.currencySymbol} {row.total_budget.toLocaleString()}</td>
                <td className={clsx('tbl-td font-semibold', isOver?'text-danger-light':'text-success-light')}>
                  {cfg.currencySymbol} {row.total_actual.toLocaleString()}
                </td>
                <td className={clsx('tbl-td font-semibold', isOver?'text-danger-light':'text-success-light')}>
                  {isOver?'+':''}{cfg.currencySymbol} {dev.toLocaleString()}
                  <span className="text-[10px] ml-1 opacity-70">({isOver?'+':''}{pct.toFixed(1)}%)</span>
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
            <td className="tbl-td text-white/45">{cfg.currencySymbol} {kpi.transBudget.toLocaleString()} / {kpi.transActual.toLocaleString()}</td>
            <td className="tbl-td text-white/45">{cfg.currencySymbol} {kpi.taxBudget.toLocaleString()} / {kpi.taxActual.toLocaleString()}</td>
            <td className="tbl-td font-semibold text-white">{cfg.currencySymbol} {kpi.totalBudget.toLocaleString()}</td>
            <td className={clsx('tbl-td font-semibold', overBudget?'text-danger-light':'text-success-light')}>
              {cfg.currencySymbol} {kpi.totalActual.toLocaleString()}
            </td>
            <td className={clsx('tbl-td font-bold', overBudget?'text-danger-light':'text-success-light')}>
              {overBudget?'+':''}{cfg.currencySymbol} {kpi.totalDev.toLocaleString()}
              <span className="text-[10px] ml-1 opacity-70">({overBudget?'+':''}{((kpi.totalDev/kpi.totalBudget)*100).toFixed(1)}%)</span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )

  // ─── Deviation table ─────────────────────────────────────────────────────────
  const deviationTable = (
    <table className="w-full">
      <thead>
        <tr>
          {['Month','Budget','Actual','Deviation','% vs Budget'].map(h=>(
            <th key={h} className="tbl-th">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {chartRows.map(row => {
          const isOver = row.deviation > 0
          const pct = row.total_budget > 0 ? (row.deviation / row.total_budget * 100) : 0
          return (
            <tr key={row.month} className="tbl-row">
              <td className="tbl-td font-medium text-white">{row.month}</td>
              <td className="tbl-td text-white/60">{cfg.currencySymbol} {row.total_budget.toLocaleString()}</td>
              <td className="tbl-td text-white/60">{cfg.currencySymbol} {row.total_actual.toLocaleString()}</td>
              <td className={clsx('tbl-td font-semibold', isOver?'text-danger-light':'text-success-light')}>
                {isOver?'+':''}{cfg.currencySymbol} {row.deviation.toLocaleString()}
              </td>
              <td className={clsx('tbl-td font-mono', isOver?'text-danger-light':'text-success-light')}>
                {isOver?'+':''}{pct.toFixed(1)}%
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Budget Detail" subtitle="Commodity & non-commodity cost tracking vs budget" />
      <div className="flex-1 overflow-y-auto p-6">

        {/* ── Controls ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 mb-6">

          {/* Level toggle */}
          <div className="flex items-center gap-1 bg-bg-secondary border border-border-subtle rounded-xl p-1">
            {(['portfolio','city','site','building','connection'] as LevelMode[]).map(l => (
              <button key={l} onClick={() => setLevel(l)}
                className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all',
                  level === l ? 'bg-accent text-white' : 'text-white/40 hover:text-white/70'
                )}>{l}</button>
            ))}
          </div>

          {/* Dynamic entity selector */}
          {level === 'city' && (
            <select className="form-select text-sm" value={selectedCity} onChange={e => setSelectedCity(e.target.value)}>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          {level === 'site' && (
            <select className="form-select text-sm" value={selectedSite} onChange={e => setSelectedSite(e.target.value)}>
              {sites.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {level === 'building' && (
            <select className="form-select text-sm" value={selectedBuilding} onChange={e => setSelectedBuilding(e.target.value)}>
              {buildings.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          )}
          {level === 'connection' && (
            <select className="form-select text-sm" value={selectedConn} onChange={e => setSelectedConn(e.target.value)}>
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

        {/* ── KPI cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="card">
            <div className="label mb-1 flex items-center gap-1"><DollarSign size={11}/> Total Budget</div>
            <div className="text-xl font-semibold text-white">{fmt(kpi.totalBudget, cfg.currencySymbol)}</div>
            <div className="text-xs text-white/40 mt-1">{activeMonths.length} month{activeMonths.length!==1?'s':''} · {level}</div>
          </div>
          <div className="card">
            <div className="label mb-1 flex items-center gap-1"><DollarSign size={11}/> Total Actual</div>
            <div className={clsx('text-xl font-semibold', overBudget?'text-danger-light':'text-success-light')}>
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
            <div className={clsx('text-xl font-semibold', overBudget?'text-danger-light':'text-success-light')}>
              {overBudget?'+':''}{fmt(kpi.totalDev, cfg.currencySymbol)}
            </div>
            <div className={clsx('text-xs mt-1', overBudget?'text-danger-light/70':'text-success-light/70')}>
              {overBudget?'+':''}{((kpi.totalDev/kpi.totalBudget)*100).toFixed(1)}% vs budget
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

        {/* ── Budget vs actual chart ─────────────────────────────────────── */}
        <ChartCard
          title="Budget vs Actual — by Component"
          subtitle="Solid = budget · lighter = actual · stacked: commodity + transport + tax"
          className="mb-4"
          action={
            <div className="flex items-center gap-3 text-xs text-white/40">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-violet-500/60 rounded-sm inline-block"/> Commodity</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-sky-500/60 rounded-sm inline-block"/> Transport</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-emerald-500/60 rounded-sm inline-block"/> Tax</span>
            </div>
          }
          table={budgetTable}
        >
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartRows} margin={{top:5,right:10,left:0,bottom:0}} barGap={2} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08"/>
              <XAxis dataKey="month" tick={{fill:'#5a6385',fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'#5a6385',fontSize:10}} axisLine={false} tickLine={false}
                tickFormatter={v => `${cfg.currencySymbol}${(v/1000).toFixed(0)}K`}/>
              <Tooltip contentStyle={TT}
                formatter={(v: number, name: string) => {
                  const labels: Record<string,string> = {
                    commodity_budget:'Commodity (budget)', transport_budget:'Transport (budget)', tax_budget:'Tax (budget)',
                    commodity_actual:'Commodity (actual)', transport_actual:'Transport (actual)', tax_actual:'Tax (actual)',
                  }
                  return [`${cfg.currencySymbol} ${v.toLocaleString()}`, labels[name] ?? name]
                }}/>
              <Bar dataKey="commodity_budget" stackId="budget" fill="#8b5cf6" opacity={0.9}  radius={[0,0,0,0]} maxBarSize={32}/>
              <Bar dataKey="transport_budget" stackId="budget" fill="#0ea5e9" opacity={0.9}  radius={[0,0,0,0]} maxBarSize={32}/>
              <Bar dataKey="tax_budget"       stackId="budget" fill="#10b981" opacity={0.9}  radius={[3,3,0,0]} maxBarSize={32}/>
              <Bar dataKey="commodity_actual" stackId="actual" fill="#8b5cf6" opacity={0.45} radius={[0,0,0,0]} maxBarSize={32}/>
              <Bar dataKey="transport_actual" stackId="actual" fill="#0ea5e9" opacity={0.45} radius={[0,0,0,0]} maxBarSize={32}/>
              <Bar dataKey="tax_actual"       stackId="actual" fill="#10b981" opacity={0.45} radius={[3,3,0,0]} maxBarSize={32}/>
            </ComposedChart>
          </ResponsiveContainer>
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
        </ChartCard>

        {/* ── Deviation chart ────────────────────────────────────────────── */}
        <ChartCard
          title="Monthly Deviation (Actual − Budget)"
          subtitle={`Red = overspend · Green = savings · bars show total deviation in ${cfg.currency}`}
          className="mb-6"
          table={deviationTable}
        >
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartRows} margin={{top:5,right:10,left:0,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08"/>
              <XAxis dataKey="month" tick={{fill:'#5a6385',fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis
                tick={{fill:'#5a6385',fontSize:10}} axisLine={false} tickLine={false}
                tickFormatter={v => `${cfg.currencySymbol}${v>=0?'':'-'}${(Math.abs(v)/1000).toFixed(1)}K`}/>
              <Tooltip contentStyle={TT}
                formatter={(v: number) => [
                  `${v>=0?'+':''}${cfg.currencySymbol} ${v.toLocaleString()}`,
                  v >= 0 ? '🔴 Overspend' : '🟢 Savings',
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

      </div>
    </div>
  )
}
