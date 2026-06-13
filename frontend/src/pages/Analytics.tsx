import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useAppStore } from '@/lib/store'
import { MARKET_CONFIGS } from '@/types'
import {
  CONSUMPTION_HOURLY, CONSUMPTION_DAILY, CONSUMPTION_WEEKLY,
  CONSUMPTION_MONTHLY, CONSUMPTION_YEARLY, MONTHS,
  groupByLevel, CONNECTION_META,
  type GroupLevel,
} from '@/lib/mockData'
import { Zap, Flame } from 'lucide-react'
import {
  ComposedChart, BarChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import clsx from 'clsx'

// ─── Types ────────────────────────────────────────────────────────────────────
type Granularity = 'hour' | 'day' | 'week' | 'month' | 'year'

const GRAN: { id: Granularity; label: string }[] = [
  { id:'hour',  label:'Hourly'  },
  { id:'day',   label:'Daily'   },
  { id:'week',  label:'Weekly'  },
  { id:'month', label:'Monthly' },
  { id:'year',  label:'Yearly'  },
]

const GROUP_LEVELS: { id: GroupLevel; label: string }[] = [
  { id:'portfolio',  label:'Portfolio'  },
  { id:'connection', label:'Connection' },
  { id:'building',   label:'Building'   },
  { id:'site',       label:'Site'       },
  { id:'city',       label:'City'       },
  { id:'country',    label:'Country'    },
]

// ─── Colours per group entity ─────────────────────────────────────────────────
const GROUP_COLORS = [
  '#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4',
  '#f97316','#84cc16','#ec4899','#14b8a6',
]

// ─── Fleet total data lookup ───────────────────────────────────────────────────
function getFleetData(g: Granularity) {
  switch (g) {
    case 'hour':  return { labels: CONSUMPTION_HOURLY.labels,  elec: CONSUMPTION_HOURLY.electricity,  gas: CONSUMPTION_HOURLY.gas,  unit:'kWh' }
    case 'day':   return { labels: CONSUMPTION_DAILY.labels,   elec: CONSUMPTION_DAILY.electricity,   gas: CONSUMPTION_DAILY.gas,   unit:'kWh' }
    case 'week':  return { labels: CONSUMPTION_WEEKLY.labels,  elec: CONSUMPTION_WEEKLY.electricity,  gas: CONSUMPTION_WEEKLY.gas,  unit:'kWh' }
    case 'month': return { labels: MONTHS,                     elec: CONSUMPTION_MONTHLY.electricity, gas: CONSUMPTION_MONTHLY.gas, unit:'kWh' }
    case 'year':  return {
      labels: CONSUMPTION_YEARLY.labels,
      elec: CONSUMPTION_YEARLY.electricity.map(v => Math.round(v / 1000)),
      gas:  CONSUMPTION_YEARLY.gas,
      unit: 'MWh',
    }
  }
}

const TT = { background:'#0d2b35', border:'1px solid #1a5568', borderRadius:8, fontSize:11 }

function tickFmt(labels: string[]) {
  const every = labels.length > 40 ? 4 : labels.length > 20 ? 2 : 1
  return (_: unknown, idx: number) => idx % every === 0 ? labels[idx] : ''
}

function fmtVal(v: number, unit: string) {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k ${unit}` : `${v} ${unit}`
}

// ─── Portfolio view (existing dual-axis chart) ────────────────────────────────
function PortfolioView({
  gran, showElec, showGas, setShowElec, setShowGas,
}: {
  gran: Granularity
  showElec: boolean; showGas: boolean
  setShowElec: (v: boolean) => void; setShowGas: (v: boolean) => void
}) {
  const { labels, elec, gas, unit } = getFleetData(gran)

  const chartData = labels.map((label, i) => ({
    label,
    electricity: showElec ? elec[i] : undefined,
    gas:         showGas  ? gas[i]  : undefined,
  }))

  const sumElec = elec.reduce((a,b)=>a+b,0)
  const sumGas  = gas.reduce((a,b)=>a+b,0)
  const avgElec = Math.round(sumElec / elec.length)
  const avgGas  = Math.round(sumGas  / gas.length)
  const tfmt = tickFmt(labels)

  return (
    <>
      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="card">
          <div className="label mb-1">Total Electricity ({unit})</div>
          <div className="text-xl font-semibold text-white">{sumElec.toLocaleString()}</div>
          <div className="text-xs text-white/40 mt-1">avg {avgElec.toLocaleString()} · peak {Math.max(...elec).toLocaleString()}</div>
        </div>
        <div className="card">
          <div className="label mb-1">Total Gas (m³)</div>
          <div className="text-xl font-semibold text-white">{sumGas.toLocaleString()}</div>
          <div className="text-xs text-white/40 mt-1">avg {avgGas.toLocaleString()} · peak {Math.max(...gas).toLocaleString()}</div>
        </div>
        <div className="card">
          <div className="label mb-1">Elec / Gas Ratio</div>
          <div className="text-xl font-semibold text-white">
            {sumGas > 0 ? (sumElec / sumGas).toFixed(0) : '—'} kWh/m³
          </div>
          <div className="text-xs text-white/40 mt-1">across selected period</div>
        </div>
      </div>

      {/* Main dual-axis chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="section-title">Fleet Total — {GRAN.find(g=>g.id===gran)!.label} View</h2>
            <p className="text-xs text-white/30 mt-0.5">Dual axis · electricity (left) + gas (right)</p>
          </div>
          <div className="flex gap-2">
            {[
              { active: showElec, set: setShowElec, color:'blue', Icon: Zap,   label:'Electricity' },
              { active: showGas,  set: setShowGas,  color:'amber', Icon: Flame, label:'Gas' },
            ].map(({ active, set, color, Icon, label }) => (
              <button key={label} onClick={() => set(!active)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                  active && color === 'blue'  && 'bg-blue-500/15 border-blue-500/40 text-blue-300',
                  active && color === 'amber' && 'bg-amber-500/15 border-amber-500/40 text-amber-300',
                  !active && 'border-border-subtle text-white/30',
                )}>
                <Icon size={11} /> {label}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData} margin={{ top:5, right:20, left:-5, bottom:5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis dataKey="label" tick={{ fill:'#5a6385', fontSize:10 }} axisLine={false} tickLine={false}
              tickFormatter={tfmt} interval={0} />
            <YAxis yAxisId="elec" tick={{ fill:'#3b82f6', fontSize:10 }} axisLine={false} tickLine={false}
              tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : `${v}`} />
            <YAxis yAxisId="gas" orientation="right" tick={{ fill:'#f59e0b', fontSize:10 }}
              axisLine={false} tickLine={false} />
            <Tooltip contentStyle={TT}
              labelStyle={{ color:'#e8eaf2', fontWeight:600, marginBottom:4 }}
              formatter={(value: number, name: string) => [
                `${value.toLocaleString()} ${name === 'electricity' ? unit : 'm³'}`,
                name === 'electricity' ? '⚡ Electricity' : '🔥 Gas',
              ]} />
            <Legend wrapperStyle={{ fontSize:11 }} formatter={v => v === 'electricity' ? '⚡ Electricity' : '🔥 Gas'} />
            {showElec && (
              <Bar yAxisId="elec" dataKey="electricity" name="electricity" fill="#3b82f6"
                opacity={0.8} radius={[3,3,0,0]} maxBarSize={gran === 'year' ? 60 : 24} />
            )}
            {showGas && (
              <Line yAxisId="gas" type="monotone" dataKey="gas" name="gas"
                stroke="#f59e0b" strokeWidth={2}
                dot={labels.length <= 15 ? { r:3, fill:'#f59e0b' } : false}
                activeDot={{ r:4 }} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom mini charts */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        {[
          { key:'electricity', title:'⚡ Electricity Only', color:'#3b82f6', data: chartData, unit },
          { key:'gas',         title:'🔥 Gas Only',         color:'#f59e0b', data: chartData, unit:'m³' },
        ].map(({ key, title, color, data, unit: u }) => (
          <div key={key} className="card">
            <h2 className="section-title mb-3">{title}</h2>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={data} margin={{ top:0, right:0, left:-15, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="label" tick={{ fill:'#5a6385', fontSize:9 }} axisLine={false}
                  tickLine={false} tickFormatter={tfmt} interval={0} />
                <YAxis tick={{ fill:'#5a6385', fontSize:9 }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : `${v}`} />
                <Tooltip contentStyle={TT}
                  formatter={(v: number) => [`${v.toLocaleString()} ${u}`, title.replace(/[⚡🔥] /,'')]} />
                <Bar dataKey={key} fill={color} opacity={0.85} radius={[3,3,0,0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </>
  )
}

// ─── Grouped stacked-bar view ─────────────────────────────────────────────────
function GroupedView({
  gran, groupLevel,
}: {
  gran: Granularity
  groupLevel: Exclude<GroupLevel, 'portfolio'>
}) {
  const { labels, unit } = getFleetData(gran)
  const tfmt = tickFmt(labels)

  const elecGroups = groupByLevel(groupLevel, 'electricity', gran)
  const gasGroups  = groupByLevel(groupLevel, 'gas', gran)

  // Filter out groups with all-zero values
  const elecFiltered = elecGroups.filter(g => g.values.some(v => v > 0))
  const gasFiltered  = gasGroups.filter(g => g.values.some(v => v > 0))

  // Build chart data arrays
  const elecData = labels.map((label, i) => {
    const row: Record<string, string | number> = { label }
    elecFiltered.forEach(g => { row[g.name] = g.values[i] ?? 0 })
    return row
  })
  const gasData = labels.map((label, i) => {
    const row: Record<string, string | number> = { label }
    gasFiltered.forEach(g => { row[g.name] = g.values[i] ?? 0 })
    return row
  })

  // Build summary table
  const elecTotals = elecFiltered.map(g => ({ name: g.name, total: g.values.reduce((a,b)=>a+b,0) }))
  const gasTotals  = gasFiltered.map(g => ({ name: g.name, total: g.values.reduce((a,b)=>a+b,0) }))
  const grandElec  = elecTotals.reduce((a,g)=>a+g.total,0)
  const grandGas   = gasTotals.reduce((a,g)=>a+g.total,0)

  // Label for connection level: show product tag
  const connLabel = (name: string) => {
    if (groupLevel !== 'connection') return name
    const meta = CONNECTION_META.find(c => c.id === name || c.label === name)
    return meta ? `${meta.label} (${meta.product === 'Electricity' ? '⚡' : '🔥'})` : name
  }

  return (
    <>
      {/* Summary KPI row */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="card">
          <div className="label mb-1">Total Electricity ({unit})</div>
          <div className="text-xl font-semibold text-white">{grandElec.toLocaleString()}</div>
          <div className="text-xs text-white/40 mt-1">{elecFiltered.length} group(s) · {GROUP_LEVELS.find(l=>l.id===groupLevel)!.label} level</div>
        </div>
        <div className="card">
          <div className="label mb-1">Total Gas (m³)</div>
          <div className="text-xl font-semibold text-white">{grandGas.toLocaleString()}</div>
          <div className="text-xs text-white/40 mt-1">{gasFiltered.length} group(s)</div>
        </div>
      </div>

      {/* Electricity stacked bar */}
      {elecFiltered.length > 0 && (
        <div className="card mb-4">
          <h2 className="section-title mb-1">⚡ Electricity by {GROUP_LEVELS.find(l=>l.id===groupLevel)!.label} ({unit})</h2>
          <p className="text-xs text-white/30 mb-4">Stacked bars — each colour is one {groupLevel}</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={elecData} margin={{ top:5, right:10, left:-5, bottom:5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="label" tick={{ fill:'#5a6385', fontSize:10 }} axisLine={false}
                tickLine={false} tickFormatter={tfmt} interval={0} />
              <YAxis tick={{ fill:'#5a6385', fontSize:10 }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : `${v}`} />
              <Tooltip contentStyle={TT}
                formatter={(v: number, name: string) => [
                  `${v.toLocaleString()} ${unit}`,
                  connLabel(name),
                ]} />
              <Legend wrapperStyle={{ fontSize:10 }} formatter={connLabel} />
              {elecFiltered.map((g, i) => (
                <Bar key={g.name} dataKey={g.name} name={g.name}
                  stackId="e" fill={GROUP_COLORS[i % GROUP_COLORS.length]}
                  opacity={0.85} radius={i === elecFiltered.length-1 ? [3,3,0,0] : [0,0,0,0]}
                  maxBarSize={gran === 'year' ? 60 : gran === 'hour' ? 18 : 24} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Gas stacked bar */}
      {gasFiltered.length > 0 && (
        <div className="card mb-4">
          <h2 className="section-title mb-1">🔥 Gas by {GROUP_LEVELS.find(l=>l.id===groupLevel)!.label} (m³)</h2>
          <p className="text-xs text-white/30 mb-4">Stacked bars — each colour is one {groupLevel}</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={gasData} margin={{ top:5, right:10, left:-5, bottom:5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="label" tick={{ fill:'#5a6385', fontSize:10 }} axisLine={false}
                tickLine={false} tickFormatter={tfmt} interval={0} />
              <YAxis tick={{ fill:'#5a6385', fontSize:10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TT}
                formatter={(v: number, name: string) => [`${v.toLocaleString()} m³`, connLabel(name)]} />
              <Legend wrapperStyle={{ fontSize:10 }} formatter={connLabel} />
              {gasFiltered.map((g, i) => (
                <Bar key={g.name} dataKey={g.name} name={g.name}
                  stackId="g" fill={GROUP_COLORS[(i + 3) % GROUP_COLORS.length]}
                  opacity={0.85} radius={i === gasFiltered.length-1 ? [3,3,0,0] : [0,0,0,0]}
                  maxBarSize={gran === 'year' ? 60 : 24} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Breakdown table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-border-subtle">
          <h2 className="section-title">Breakdown by {GROUP_LEVELS.find(l=>l.id===groupLevel)!.label}</h2>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="tbl-th text-left">{GROUP_LEVELS.find(l=>l.id===groupLevel)!.label}</th>
              <th className="tbl-th text-right">Electricity ({unit})</th>
              <th className="tbl-th text-right">Share</th>
              <th className="tbl-th text-right">Gas (m³)</th>
              <th className="tbl-th text-right">Share</th>
            </tr>
          </thead>
          <tbody>
            {/* Merge electricity + gas rows by name */}
            {[...new Set([...elecTotals.map(e=>e.name), ...gasTotals.map(g=>g.name)])].map((name, i) => {
              const e = elecTotals.find(x=>x.name===name)?.total ?? 0
              const g = gasTotals.find(x=>x.name===name)?.total ?? 0
              const ePct = grandElec > 0 ? ((e/grandElec)*100).toFixed(1) : '—'
              const gPct = grandGas  > 0 ? ((g/grandGas)*100).toFixed(1)  : '—'
              return (
                <tr key={name} className={clsx(
                  'border-b border-border-subtle',
                  i % 2 === 0 ? 'bg-[#0d3d4a]/30' : ''
                )}>
                  <td className="tbl-td">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: GROUP_COLORS[i % GROUP_COLORS.length] }} />
                      <span className="text-white/80">{connLabel(name)}</span>
                    </div>
                  </td>
                  <td className="tbl-td text-right text-white/70 font-mono">{e > 0 ? e.toLocaleString() : '—'}</td>
                  <td className="tbl-td text-right text-white/40">{e > 0 ? `${ePct}%` : '—'}</td>
                  <td className="tbl-td text-right text-white/70 font-mono">{g > 0 ? g.toLocaleString() : '—'}</td>
                  <td className="tbl-td text-right text-white/40">{g > 0 ? `${gPct}%` : '—'}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-bg-card border-t border-border-default">
              <td className="tbl-td font-semibold text-white/60">Total</td>
              <td className="tbl-td text-right font-semibold text-white font-mono">{grandElec.toLocaleString()}</td>
              <td className="tbl-td text-right text-white/30">100%</td>
              <td className="tbl-td text-right font-semibold text-white font-mono">{grandGas.toLocaleString()}</td>
              <td className="tbl-td text-right text-white/30">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Analytics() {
  const { market } = useAppStore()
  const _cfg = MARKET_CONFIGS[market]   // available for future market-specific display
  void _cfg

  const [gran,      setGran]      = useState<Granularity>('month')
  const [groupLevel,setGroupLevel] = useState<GroupLevel>('portfolio')
  const [showElec,  setShowElec]  = useState(true)
  const [showGas,   setShowGas]   = useState(true)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Analytics" subtitle="Consumption analysis — electricity & gas" />
      <div className="flex-1 overflow-y-auto p-6">

        {/* ── Controls row ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">

          {/* Granularity tabs */}
          <div className="flex items-center gap-1 bg-bg-secondary border border-border-subtle rounded-xl p-1">
            {GRAN.map(g => (
              <button key={g.id} onClick={() => setGran(g.id)}
                className={clsx(
                  'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                  gran === g.id ? 'bg-accent text-white shadow' : 'text-white/40 hover:text-white/70'
                )}>
                {g.label}
              </button>
            ))}
          </div>

          {/* Separator */}
          <div className="w-px h-6 bg-border-subtle" />

          {/* Group by pills */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-white/35 uppercase tracking-widest font-medium">Group by</span>
            <div className="flex items-center gap-1 bg-bg-secondary border border-border-subtle rounded-xl p-1">
              {GROUP_LEVELS.map(l => (
                <button key={l.id} onClick={() => setGroupLevel(l.id)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    groupLevel === l.id
                      ? 'bg-purple text-white shadow'
                      : 'text-white/40 hover:text-white/70'
                  )}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Content ──────────────────────────────────────────────────────── */}
        {groupLevel === 'portfolio'
          ? <PortfolioView gran={gran} showElec={showElec} showGas={showGas}
              setShowElec={setShowElec} setShowGas={setShowGas} />
          : <GroupedView gran={gran} groupLevel={groupLevel} />
        }

      </div>
    </div>
  )
}
