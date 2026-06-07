import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useAppStore } from '@/lib/store'
import { MARKET_CONFIGS } from '@/types'
import {
  CONSUMPTION_HOURLY, CONSUMPTION_DAILY, CONSUMPTION_WEEKLY,
  CONSUMPTION_MONTHLY, CONSUMPTION_YEARLY, MONTHS,
} from '@/lib/mockData'
import { Zap, Flame } from 'lucide-react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import clsx from 'clsx'

// ─── Granularity config ────────────────────────────────────────────────────────
type Granularity = 'hour' | 'day' | 'week' | 'month' | 'year'

const GRAN: { id: Granularity; label: string; elecUnit: string; gasUnit: string }[] = [
  { id:'hour',  label:'Hourly',  elecUnit:'kWh',  gasUnit:'m³' },
  { id:'day',   label:'Daily',   elecUnit:'kWh',  gasUnit:'m³' },
  { id:'week',  label:'Weekly',  elecUnit:'kWh',  gasUnit:'m³' },
  { id:'month', label:'Monthly', elecUnit:'kWh',  gasUnit:'m³' },
  { id:'year',  label:'Yearly',  elecUnit:'MWh',  gasUnit:'m³' },
]

function getData(g: Granularity) {
  switch (g) {
    case 'hour':  return { labels: CONSUMPTION_HOURLY.labels,  elec: CONSUMPTION_HOURLY.electricity,  gas: CONSUMPTION_HOURLY.gas  }
    case 'day':   return { labels: CONSUMPTION_DAILY.labels,   elec: CONSUMPTION_DAILY.electricity,   gas: CONSUMPTION_DAILY.gas   }
    case 'week':  return { labels: CONSUMPTION_WEEKLY.labels,  elec: CONSUMPTION_WEEKLY.electricity,  gas: CONSUMPTION_WEEKLY.gas  }
    case 'month': return { labels: MONTHS,                     elec: CONSUMPTION_MONTHLY.electricity, gas: CONSUMPTION_MONTHLY.gas }
    case 'year':  return { labels: CONSUMPTION_YEARLY.labels,  elec: CONSUMPTION_YEARLY.electricity.map(v=>Math.round(v/1000)), gas: CONSUMPTION_YEARLY.gas }
  }
}

const TT = { background:'#111520', border:'1px solid #ffffff20', borderRadius:8, fontSize:12 }

// ─── Summary stats per granularity ────────────────────────────────────────────
function computeStats(g: Granularity) {
  const { elec, gas } = getData(g)
  const sumElec = elec.reduce((a,b)=>a+b,0)
  const sumGas  = gas.reduce((a,b)=>a+b,0)
  const avgElec = Math.round(sumElec / elec.length)
  const avgGas  = Math.round(sumGas  / gas.length)
  const peakElec = Math.max(...elec)
  const peakGas  = Math.max(...gas)
  return { sumElec, sumGas, avgElec, avgGas, peakElec, peakGas }
}

export default function Analytics() {
  const { market } = useAppStore()
  const cfg = MARKET_CONFIGS[market]
  const [gran, setGran] = useState<Granularity>('month')
  const [showElec, setShowElec] = useState(true)
  const [showGas,  setShowGas]  = useState(true)

  const granCfg = GRAN.find(g => g.id === gran)!
  const { labels, elec, gas } = getData(gran)
  const stats = computeStats(gran)

  const chartData = labels.map((label, i) => ({
    label,
    electricity: showElec ? elec[i] : undefined,
    gas:         showGas  ? gas[i]  : undefined,
  }))

  // Determine tick interval for dense datasets
  const tickEvery = labels.length > 40 ? 4 : labels.length > 20 ? 2 : 1
  const tickFormatter = (_: unknown, idx: number) =>
    idx % tickEvery === 0 ? labels[idx] : ''

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Analytics" subtitle="Consumption analysis — electricity & gas" />
      <div className="flex-1 overflow-y-auto p-6">

        {/* ── Granularity tabs ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 mb-6 bg-bg-secondary border border-border-subtle rounded-xl p-1 w-fit">
          {GRAN.map(g => (
            <button
              key={g.id}
              onClick={() => setGran(g.id)}
              className={clsx(
                'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                gran === g.id
                  ? 'bg-accent text-white shadow'
                  : 'text-white/40 hover:text-white/70'
              )}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* ── Summary stat cards ───────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card">
            <div className="label mb-2">Total Electricity ({gran === 'year' ? 'MWh' : 'kWh'})</div>
            <div className="text-xl font-semibold text-white">{stats.sumElec.toLocaleString()}</div>
            <div className="text-xs text-white/40 mt-1">avg {stats.avgElec.toLocaleString()} / {granCfg.id === 'hour' ? 'hr' : granCfg.id === 'day' ? 'day' : granCfg.id === 'week' ? 'wk' : granCfg.id === 'month' ? 'mo' : 'yr'} · peak {stats.peakElec.toLocaleString()}</div>
          </div>
          <div className="card">
            <div className="label mb-2">Total Gas (m³)</div>
            <div className="text-xl font-semibold text-white">{stats.sumGas.toLocaleString()}</div>
            <div className="text-xs text-white/40 mt-1">avg {stats.avgGas.toLocaleString()} · peak {stats.peakGas.toLocaleString()}</div>
          </div>
          <div className="card">
            <div className="label mb-2">Elec / Gas Ratio</div>
            <div className="text-xl font-semibold text-white">
              {stats.sumGas > 0 ? (stats.sumElec / stats.sumGas).toFixed(0) : '—'} kWh/m³
            </div>
            <div className="text-xs text-white/40 mt-1">across selected period</div>
          </div>
        </div>

        {/* ── Main chart ───────────────────────────────────────────────────── */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="section-title">
                Consumption — {granCfg.label} View
              </h2>
              <p className="text-xs text-white/30 mt-0.5">
                Fleet total · dual-axis (electricity left, gas right)
              </p>
            </div>
            {/* Commodity toggles */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowElec(v => !v)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                  showElec
                    ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                    : 'border-border-subtle text-white/30'
                )}
              >
                <Zap size={11} /> Electricity
              </button>
              <button
                onClick={() => setShowGas(v => !v)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                  showGas
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    : 'border-border-subtle text-white/30'
                )}
              >
                <Flame size={11} /> Gas
              </button>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={chartData} margin={{ top:5, right:20, left:-5, bottom:5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis
                dataKey="label"
                tick={{ fill:'#5a6385', fontSize:10 }}
                axisLine={false} tickLine={false}
                tickFormatter={tickFormatter}
                interval={0}
              />
              {/* Left axis — electricity */}
              <YAxis
                yAxisId="elec"
                tick={{ fill:'#3b82f6', fontSize:10 }}
                axisLine={false} tickLine={false}
                tickFormatter={v => gran === 'year' ? `${v}` : v >= 1000 ? `${(v/1000).toFixed(1)}K` : `${v}`}
              />
              {/* Right axis — gas */}
              <YAxis
                yAxisId="gas"
                orientation="right"
                tick={{ fill:'#f59e0b', fontSize:10 }}
                axisLine={false} tickLine={false}
                tickFormatter={v => `${v}`}
              />
              <Tooltip
                contentStyle={TT}
                labelStyle={{ color:'#e8eaf2', fontWeight:600, marginBottom:4 }}
                formatter={(value: number, name: string) => [
                  `${value.toLocaleString()} ${name === 'electricity' ? (gran === 'year' ? 'MWh' : 'kWh') : 'm³'}`,
                  name === 'electricity' ? '⚡ Electricity' : '🔥 Gas',
                ]}
              />
              <Legend
                wrapperStyle={{ fontSize:11, color:'#5a6385' }}
                formatter={(v) => v === 'electricity' ? '⚡ Electricity' : '🔥 Gas'}
              />
              {showElec && (
                <Bar
                  yAxisId="elec"
                  dataKey="electricity"
                  name="electricity"
                  fill="#3b82f6"
                  opacity={0.8}
                  radius={[3,3,0,0]}
                  maxBarSize={gran === 'year' ? 60 : gran === 'hour' ? 18 : 24}
                />
              )}
              {showGas && (
                <Line
                  yAxisId="gas"
                  type="monotone"
                  dataKey="gas"
                  name="gas"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={labels.length <= 15 ? { r:3, fill:'#f59e0b' } : false}
                  activeDot={{ r:4 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* ── Electricity-only bar chart ───────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="card">
            <h2 className="section-title mb-1">⚡ Electricity Only</h2>
            <p className="text-xs text-white/30 mb-4">{granCfg.elecUnit} · fleet total</p>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={chartData} margin={{ top:0, right:0, left:-15, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="label" tick={{ fill:'#5a6385', fontSize:9 }} axisLine={false} tickLine={false} tickFormatter={tickFormatter} interval={0} />
                <YAxis tick={{ fill:'#5a6385', fontSize:9 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : `${v}`} />
                <Tooltip contentStyle={TT} formatter={(v: number) => [`${v.toLocaleString()} ${gran === 'year' ? 'MWh' : 'kWh'}`, '⚡ Electricity']} />
                <Bar dataKey="electricity" fill="#3b82f6" opacity={0.85} radius={[3,3,0,0]} maxBarSize={28} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h2 className="section-title mb-1">🔥 Gas Only</h2>
            <p className="text-xs text-white/30 mb-4">m³ · fleet total</p>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={chartData} margin={{ top:0, right:0, left:-15, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="label" tick={{ fill:'#5a6385', fontSize:9 }} axisLine={false} tickLine={false} tickFormatter={tickFormatter} interval={0} />
                <YAxis tick={{ fill:'#5a6385', fontSize:9 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TT} formatter={(v: number) => [`${v.toLocaleString()} m³`, '🔥 Gas']} />
                <Bar dataKey="gas" fill="#f59e0b" opacity={0.85} radius={[3,3,0,0]} maxBarSize={28} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  )
}
