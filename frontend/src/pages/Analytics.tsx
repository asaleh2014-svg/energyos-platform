import { useState, useEffect, useRef, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useAppStore } from '@/lib/store'
import { MARKET_CONFIGS } from '@/types'
import {
  CONSUMPTION_HOURLY, CONSUMPTION_DAILY, CONSUMPTION_WEEKLY,
  CONSUMPTION_MONTHLY, CONSUMPTION_YEARLY, MONTHS,
  groupByLevel, CONNECTION_META,
  type GroupLevel,
} from '@/lib/mockData'
import { Zap, Flame, Upload, Download, CheckCircle, AlertTriangle, X, Loader2 } from 'lucide-react'
import { ChartCard } from '@/components/ChartCard'
import { UnitSelect } from '@/components/UnitSelect'
import {
  ComposedChart, BarChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import clsx from 'clsx'
import { supabase } from '@/lib/supabase'
import { useTenantId } from '@/lib/auth'

// ─── Types ────────────────────────────────────────────────────────────────────
type Granularity = 'hour' | 'day' | 'week' | 'month' | 'year'
type PageTab = 'charts' | 'import'

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

const GROUP_COLORS = [
  '#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4',
  '#f97316','#84cc16','#ec4899','#14b8a6',
]

// ─── Real consumption hook ────────────────────────────────────────────────────
interface MonthlyPoint { label: string; electricity: number; gas: number; cost: number }

function useRealConsumption(tenantId: string) {
  const [data, setData]       = useState<MonthlyPoint[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState(0)

  const refresh = useCallback(() => setVersion(v => v + 1), [])

  useEffect(() => {
    setLoading(true)
    supabase
      .from('consumption_records')
      .select('period_start, consumption, unit, cost, connection_id')
      .eq('tenant_id', tenantId)
      .order('period_start')
      .then(({ data: rows }) => {
        if (!rows || rows.length === 0) { setData(null); setLoading(false); return }

        // Group by YYYY-MM month
        const buckets: Record<string, { electricity: number; gas: number; cost: number }> = {}
        for (const r of rows) {
          const key = r.period_start.slice(0, 7) // "2025-01"
          if (!buckets[key]) buckets[key] = { electricity: 0, gas: 0, cost: 0 }
          if (r.unit === 'kWh') buckets[key].electricity += Number(r.consumption)
          else                  buckets[key].gas          += Number(r.consumption)
          buckets[key].cost += Number(r.cost ?? 0)
        }

        const points = Object.entries(buckets)
          .sort(([a],[b]) => a.localeCompare(b))
          .map(([key, v]) => ({
            label: new Date(key + '-01').toLocaleString('default', { month:'short', year:'2-digit' }),
            electricity: Math.round(v.electricity),
            gas:  Math.round(v.gas),
            cost: Math.round(v.cost),
          }))

        setData(points)
        setLoading(false)
      })
  }, [tenantId, version])

  return { data, loading, refresh }
}

// ─── Fleet total data lookup (mock fallback) ───────────────────────────────────
function getFleetData(g: Granularity, energyUnit: 'kWh' | 'MWh') {
  const raw = (() => {
    switch (g) {
      case 'hour':  return { labels: CONSUMPTION_HOURLY.labels,  elec: CONSUMPTION_HOURLY.electricity,  gas: CONSUMPTION_HOURLY.gas  }
      case 'day':   return { labels: CONSUMPTION_DAILY.labels,   elec: CONSUMPTION_DAILY.electricity,   gas: CONSUMPTION_DAILY.gas   }
      case 'week':  return { labels: CONSUMPTION_WEEKLY.labels,  elec: CONSUMPTION_WEEKLY.electricity,  gas: CONSUMPTION_WEEKLY.gas  }
      case 'month': return { labels: MONTHS,                     elec: CONSUMPTION_MONTHLY.electricity, gas: CONSUMPTION_MONTHLY.gas }
      case 'year':  return { labels: CONSUMPTION_YEARLY.labels,  elec: CONSUMPTION_YEARLY.electricity,  gas: CONSUMPTION_YEARLY.gas  }
    }
  })()
  const elec = energyUnit === 'MWh'
    ? raw.elec.map(v => parseFloat((v / 1000).toFixed(2)))
    : raw.elec
  return { ...raw, elec, unit: energyUnit }
}

const TT = { background:'#0d2b35', border:'1px solid #1a5568', borderRadius:8, fontSize:11 }

function tickFmt(labels: string[]) {
  const every = labels.length > 40 ? 4 : labels.length > 20 ? 2 : 1
  return (_: unknown, idx: number) => idx % every === 0 ? labels[idx] : ''
}

// ─── Portfolio view ────────────────────────────────────────────────────────────
function PortfolioView({
  gran, showElec, showGas, setShowElec, setShowGas, realData,
}: {
  gran: Granularity
  showElec: boolean; showGas: boolean
  setShowElec: (v: boolean) => void; setShowGas: (v: boolean) => void
  realData: MonthlyPoint[] | null
}) {
  const [energyUnit, setEnergyUnit] = useState<'kWh' | 'MWh'>('kWh')

  // Use real data for monthly view when available, otherwise mock
  const useReal = realData !== null && gran === 'month'
  const mock = getFleetData(gran, energyUnit)

  const chartData = useReal
    ? realData!.map(p => ({
        label: p.label,
        electricity: showElec ? (energyUnit === 'MWh' ? p.electricity / 1000 : p.electricity) : undefined,
        gas: showGas ? p.gas : undefined,
      }))
    : mock.labels.map((label, i) => ({
        label,
        electricity: showElec ? mock.elec[i] : undefined,
        gas:         showGas  ? mock.gas[i]  : undefined,
      }))

  const unit = useReal ? energyUnit : mock.unit
  const elecArr = useReal ? realData!.map(p => energyUnit === 'MWh' ? p.electricity / 1000 : p.electricity) : mock.elec
  const gasArr  = useReal ? realData!.map(p => p.gas) : mock.gas

  const sumElec = elecArr.reduce((a,b)=>a+b,0)
  const sumGas  = gasArr.reduce((a,b)=>a+b,0)
  const avgElec = elecArr.length ? Math.round(sumElec / elecArr.length) : 0
  const avgGas  = gasArr.length  ? Math.round(sumGas  / gasArr.length)  : 0
  const tfmt = tickFmt(chartData.map(d => d.label))

  return (
    <>
      {useReal && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
          <CheckCircle size={12} />
          Showing {realData!.length} months of real imported data
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="card">
          <div className="label mb-1">Total Electricity ({unit})</div>
          <div className="text-xl font-semibold text-white">{sumElec.toLocaleString()}</div>
          <div className="text-xs text-white/40 mt-1">avg {avgElec.toLocaleString()} · peak {Math.max(...elecArr, 0).toLocaleString()}</div>
        </div>
        <div className="card">
          <div className="label mb-1">Total Gas (m³)</div>
          <div className="text-xl font-semibold text-white">{sumGas.toLocaleString()}</div>
          <div className="text-xs text-white/40 mt-1">avg {avgGas.toLocaleString()} · peak {Math.max(...gasArr, 0).toLocaleString()}</div>
        </div>
        <div className="card">
          <div className="label mb-1">Elec / Gas Ratio</div>
          <div className="text-xl font-semibold text-white">
            {sumGas > 0 ? (sumElec / sumGas).toFixed(0) : '—'} kWh/m³
          </div>
          <div className="text-xs text-white/40 mt-1">across selected period</div>
        </div>
      </div>

      <ChartCard
        title={`Fleet Total — ${GRAN.find(g=>g.id===gran)!.label} View`}
        subtitle={useReal ? 'Real imported data' : 'Demo data — import CSV to replace'}
        action={
          <div className="flex items-center gap-2">
            <UnitSelect value={energyUnit} onChange={setEnergyUnit} />
            {[
              { active: showElec, set: setShowElec, color:'blue',  Icon: Zap,   label:'Electricity' },
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
        }
        table={
          <table className="w-full">
            <thead><tr>
              <th className="tbl-th">Period</th>
              {showElec && <th className="tbl-th">Electricity ({unit})</th>}
              {showGas  && <th className="tbl-th">Gas (m³)</th>}
            </tr></thead>
            <tbody>
              {chartData.map(row => (
                <tr key={row.label} className="tbl-row">
                  <td className="tbl-td text-white/70">{row.label}</td>
                  {showElec && <td className="tbl-td text-blue-300">{(row.electricity as number ?? 0).toLocaleString()}</td>}
                  {showGas  && <td className="tbl-td text-amber-300">{(row.gas as number ?? 0).toLocaleString()}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        }
      >
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
                dot={chartData.length <= 15 ? { r:3, fill:'#f59e0b' } : false}
                activeDot={{ r:4 }} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-2 gap-4 mt-4">
        {[
          { key:'electricity', title:'⚡ Electricity Only', color:'#3b82f6', data: chartData, unit },
          { key:'gas',         title:'🔥 Gas Only',         color:'#f59e0b', data: chartData, unit:'m³' },
        ].map(({ key, title, color, data, unit: u }) => (
          <ChartCard
            key={key}
            title={title}
            table={
              <table className="w-full">
                <thead><tr><th className="tbl-th">Period</th><th className="tbl-th">{u}</th></tr></thead>
                <tbody>
                  {data.map(row => (
                    <tr key={row.label} className="tbl-row">
                      <td className="tbl-td text-white/70">{row.label}</td>
                      <td className="tbl-td" style={{ color }}>{(row[key as keyof typeof row] as number ?? 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          >
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
          </ChartCard>
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
  const [energyUnit, setEnergyUnit] = useState<'kWh' | 'MWh'>('kWh')
  const { labels, unit } = getFleetData(gran, energyUnit)
  const tfmt = tickFmt(labels)

  const elecGroups = groupByLevel(groupLevel, 'electricity', gran)
  const gasGroups  = groupByLevel(groupLevel, 'gas', gran)

  const elecFiltered = elecGroups.filter(g => g.values.some(v => v > 0))
  const gasFiltered  = gasGroups.filter(g => g.values.some(v => v > 0))

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

  const elecTotals = elecFiltered.map(g => ({ name: g.name, total: g.values.reduce((a,b)=>a+b,0) }))
  const gasTotals  = gasFiltered.map(g => ({ name: g.name, total: g.values.reduce((a,b)=>a+b,0) }))
  const grandElec  = elecTotals.reduce((a,g)=>a+g.total,0)
  const grandGas   = gasTotals.reduce((a,g)=>a+g.total,0)

  const connLabel = (name: string) => {
    if (groupLevel !== 'connection') return name
    const meta = CONNECTION_META.find(c => c.id === name || c.label === name)
    return meta ? `${meta.label} (${meta.product === 'Electricity' ? '⚡' : '🔥'})` : name
  }

  return (
    <>
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

      {elecFiltered.length > 0 && (
        <ChartCard
          title={`⚡ Electricity by ${GROUP_LEVELS.find(l=>l.id===groupLevel)!.label} (${unit})`}
          subtitle={`Stacked bars — each colour is one ${groupLevel}`}
          action={<UnitSelect value={energyUnit} onChange={setEnergyUnit} />}
          className="mb-4"
          table={
            <table className="w-full">
              <thead><tr><th className="tbl-th">Group</th><th className="tbl-th">Total ({unit})</th><th className="tbl-th">% of fleet</th></tr></thead>
              <tbody>
                {elecTotals.sort((a,b)=>b.total-a.total).map(g=>(
                  <tr key={g.name} className="tbl-row">
                    <td className="tbl-td text-white/80">{connLabel(g.name)}</td>
                    <td className="tbl-td text-blue-300">{g.total.toLocaleString()}</td>
                    <td className="tbl-td text-white/50">{grandElec>0?((g.total/grandElec)*100).toFixed(1):0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
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
        </ChartCard>
      )}

      {gasFiltered.length > 0 && (
        <ChartCard
          title={`🔥 Gas by ${GROUP_LEVELS.find(l=>l.id===groupLevel)!.label} (m³)`}
          subtitle={`Stacked bars — each colour is one ${groupLevel}`}
          className="mb-4"
          table={
            <table className="w-full">
              <thead><tr><th className="tbl-th">Group</th><th className="tbl-th">Total (m³)</th><th className="tbl-th">% of fleet</th></tr></thead>
              <tbody>
                {gasTotals.sort((a,b)=>b.total-a.total).map(g=>(
                  <tr key={g.name} className="tbl-row">
                    <td className="tbl-td text-white/80">{connLabel(g.name)}</td>
                    <td className="tbl-td text-amber-300">{g.total.toLocaleString()}</td>
                    <td className="tbl-td text-white/50">{grandGas>0?((g.total/grandGas)*100).toFixed(1):0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
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
        </ChartCard>
      )}

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

// ─── CSV Import view ──────────────────────────────────────────────────────────
interface ParsedRow {
  period_start: string
  period_end:   string
  ean_code:     string
  consumption:  number
  unit:         'kWh' | 'm3'
  cost:         number
  currency:     string
  // resolved
  connection_id: string | null
  error:         string | null
}

interface ConnectionOption {
  id: string
  ean_code: string
  label: string
}

function parseCSV(text: string): Omit<ParsedRow, 'connection_id' | 'error'>[] {
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'))

  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const get  = (key: string) => vals[headers.indexOf(key)] ?? ''
    const unit = get('unit').toLowerCase()
    return {
      period_start: get('period_start'),
      period_end:   get('period_end'),
      ean_code:     get('ean_code') || get('connection_id'),
      consumption:  parseFloat(get('consumption')) || 0,
      unit:         (unit === 'kwh' || unit === 'kWh') ? 'kWh' : 'm3',
      cost:         parseFloat(get('cost')) || 0,
      currency:     get('currency') || 'AED',
    }
  })
}

function downloadTemplate() {
  const csv = [
    'period_start,period_end,ean_code,consumption,unit,cost,currency',
    '2025-01-01,2025-01-31,EAN871234567890123456,45000,kWh,17100,AED',
    '2025-02-01,2025-02-28,EAN871234567890123456,42000,kWh,15960,AED',
    '2025-01-01,2025-01-31,EAN871234567890654321,800,m3,2560,AED',
  ].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = 'consumption_import_template.csv'
  a.click()
}

function ImportView({ tenantId, onImported }: { tenantId: string; onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging]   = useState(false)
  const [rows, setRows]           = useState<ParsedRow[] | null>(null)
  const [connections, setConns]   = useState<ConnectionOption[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult]       = useState<{ ok: number; err: number } | null>(null)

  // Load tenant connections for EAN resolution
  useEffect(() => {
    supabase.from('energy_connections')
      .select('id, ean_code, connection_type, site_name')
      .eq('tenant_id', tenantId)
      .then(({ data }) => setConns((data ?? []).map((c: any) => ({
        id: c.id,
        ean_code: c.ean_code ?? '',
        label: `${c.ean_code} · ${c.connection_type}${c.site_name ? ` · ${c.site_name}` : ''}`,
      }))))
  }, [tenantId])

  function resolveRows(parsed: Omit<ParsedRow, 'connection_id' | 'error'>[]): ParsedRow[] {
    return parsed.map(r => {
      const conn = connections.find(c => c.ean_code === r.ean_code || c.id === r.ean_code)
      const error = !r.period_start ? 'Missing period_start'
        : !r.period_end   ? 'Missing period_end'
        : isNaN(r.consumption) || r.consumption <= 0 ? 'Invalid consumption'
        : !conn           ? `Unknown EAN: ${r.ean_code}`
        : null
      return { ...r, connection_id: conn?.id ?? null, error }
    })
  }

  function handleFile(file: File) {
    setResult(null)
    file.text().then(text => {
      const parsed = parseCSV(text)
      setRows(resolveRows(parsed))
    })
  }

  async function handleImport() {
    if (!rows) return
    setImporting(true)
    const valid = rows.filter(r => !r.error && r.connection_id)
    let ok = 0; let err = 0

    const records = valid.map(r => ({
      tenant_id:    tenantId,
      connection_id: r.connection_id!,
      period_start:  r.period_start,
      period_end:    r.period_end,
      consumption:   r.consumption,
      unit:          r.unit,
      cost:          r.cost,
      currency:      r.currency,
    }))

    const { error } = await supabase.from('consumption_records').upsert(records, {
      onConflict: 'connection_id,period_start',
    })

    if (error) err = valid.length
    else ok = valid.length

    setResult({ ok, err: err + rows.filter(r => !!r.error).length })
    setImporting(false)
    if (ok > 0) onImported()
  }

  const validCount   = rows?.filter(r => !r.error).length ?? 0
  const invalidCount = rows?.filter(r => !!r.error).length ?? 0

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-white">Import Consumption Data</h2>
          <p className="text-xs text-white/40 mt-1">Upload a CSV file to load meter readings into the platform</p>
        </div>
        <button onClick={downloadTemplate}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border-subtle text-xs text-white/50 hover:text-white/80 transition-colors">
          <Download size={12} /> Download template
        </button>
      </div>

      {/* Format guide */}
      <div className="card mb-5 text-xs text-white/50 space-y-1">
        <p className="text-white/70 font-medium mb-2">Required columns</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          {[
            ['period_start', 'YYYY-MM-DD — start of billing period'],
            ['period_end',   'YYYY-MM-DD — end of billing period'],
            ['ean_code',     'EAN / meter ID (must match a connection)'],
            ['consumption',  'Numeric value'],
            ['unit',         'kWh or m3'],
            ['cost',         'Amount in local currency'],
            ['currency',     'AED, EUR, etc. (optional, defaults AED)'],
          ].map(([col, desc]) => (
            <div key={col} className="flex gap-2">
              <span className="font-mono text-accent">{col}</span>
              <span>{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      {!rows && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          onClick={() => fileRef.current?.click()}
          className={clsx(
            'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-16 cursor-pointer transition-colors',
            dragging ? 'border-accent bg-accent/5' : 'border-border-subtle hover:border-accent/40',
          )}>
          <Upload size={28} className="text-white/30" />
          <div className="text-sm text-white/50">Drop CSV here or <span className="text-accent">browse</span></div>
          <div className="text-xs text-white/30">Only .csv files</div>
          <input ref={fileRef} type="file" accept=".csv" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        </div>
      )}

      {/* Preview */}
      {rows && !result && (
        <>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm text-white/70">{rows.length} rows parsed</span>
            {validCount > 0   && <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle size={11}/> {validCount} valid</span>}
            {invalidCount > 0 && <span className="flex items-center gap-1 text-xs text-red-400"><AlertTriangle size={11}/> {invalidCount} errors</span>}
            <button onClick={() => setRows(null)} className="ml-auto text-white/30 hover:text-white/60">
              <X size={14} />
            </button>
          </div>

          <div className="card p-0 overflow-hidden mb-5">
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-bg-secondary">
                  <tr>
                    {['Period', 'EAN / ID', 'Consumption', 'Unit', 'Cost', 'Status'].map(h => (
                      <th key={h} className="tbl-th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className={clsx('tbl-row', r.error ? 'bg-red-500/5' : '')}>
                      <td className="tbl-td text-white/70">{r.period_start} → {r.period_end}</td>
                      <td className="tbl-td font-mono text-white/60">{r.ean_code}</td>
                      <td className="tbl-td text-right text-white/80">{r.consumption.toLocaleString()}</td>
                      <td className="tbl-td text-white/50">{r.unit}</td>
                      <td className="tbl-td text-right text-white/60">{r.cost.toLocaleString()} {r.currency}</td>
                      <td className="tbl-td">
                        {r.error
                          ? <span className="flex items-center gap-1 text-red-400"><AlertTriangle size={10}/>{r.error}</span>
                          : <span className="flex items-center gap-1 text-emerald-400"><CheckCircle size={10}/>Ready</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {connections.length === 0 && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center gap-2">
              <AlertTriangle size={12} />
              No connections found for this tenant — add connections first so EAN codes can be matched.
            </div>
          )}

          <div className="flex items-center gap-3">
            <button onClick={() => setRows(null)}
              className="px-4 py-2 rounded-lg border border-border-subtle text-sm text-white/50 hover:text-white/70">
              Cancel
            </button>
            <button
              disabled={validCount === 0 || importing}
              onClick={handleImport}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-40">
              {importing ? <><Loader2 size={14} className="animate-spin"/> Importing…</> : `Import ${validCount} record${validCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </>
      )}

      {/* Result */}
      {result && (
        <div className="flex flex-col items-center gap-4 py-12">
          <CheckCircle size={40} className="text-emerald-400" />
          <div className="text-center">
            <p className="text-white font-semibold">{result.ok} record{result.ok !== 1 ? 's' : ''} imported</p>
            {result.err > 0 && <p className="text-xs text-red-400 mt-1">{result.err} row{result.err !== 1 ? 's' : ''} skipped due to errors</p>}
            <p className="text-xs text-white/40 mt-2">Charts will now show your real data</p>
          </div>
          <button onClick={() => { setRows(null); setResult(null) }}
            className="px-4 py-2 rounded-lg border border-border-subtle text-sm text-white/60 hover:text-white/80">
            Import more
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Analytics() {
  const { market } = useAppStore()
  const tenantId = useTenantId()
  const _cfg = MARKET_CONFIGS[market]
  void _cfg

  const [tab,        setTab]        = useState<PageTab>('charts')
  const [gran,       setGran]       = useState<Granularity>('month')
  const [groupLevel, setGroupLevel] = useState<GroupLevel>('portfolio')
  const [showElec,   setShowElec]   = useState(true)
  const [showGas,    setShowGas]    = useState(true)

  const { data: realData, loading: realLoading, refresh } = useRealConsumption(tenantId)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Analytics" subtitle="Consumption analysis — electricity & gas" />
      <div className="flex-1 overflow-y-auto p-6">

        {/* ── Tab bar ──────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 mb-6 bg-bg-secondary border border-border-subtle rounded-xl p-1 w-fit">
          {([['charts', 'Charts'], ['import', 'Import CSV']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={clsx(
                'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                tab === id ? 'bg-accent text-white shadow' : 'text-white/40 hover:text-white/70'
              )}>
              {id === 'import' && <Upload size={11} className="inline mr-1.5 -mt-px" />}
              {label}
            </button>
          ))}
        </div>

        {tab === 'import' ? (
          <ImportView tenantId={tenantId} onImported={() => { refresh(); setTab('charts') }} />
        ) : (
          <>
            {/* ── Controls row ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-4 mb-6 flex-wrap">
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

              <div className="w-px h-6 bg-border-subtle" />

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

              {realLoading && <Loader2 size={13} className="animate-spin text-white/30 ml-auto" />}
            </div>

            {groupLevel === 'portfolio'
              ? <PortfolioView gran={gran} showElec={showElec} showGas={showGas}
                  setShowElec={setShowElec} setShowGas={setShowGas} realData={realData} />
              : <GroupedView gran={gran} groupLevel={groupLevel} />
            }
          </>
        )}

      </div>
    </div>
  )
}
