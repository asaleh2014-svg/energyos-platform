import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { HISTORIC_EMISSIONS, EMISSION_SCENARIOS } from '@/lib/mockData'
import { useAppStore } from '@/lib/store'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, Area, AreaChart,
} from 'recharts'
import clsx from 'clsx'
import { TrendingDown, Leaf, Zap, Target, AlertTriangle } from 'lucide-react'

const TT = { background:'#0d2b35', border:'1px solid #1a5568', borderRadius:8, fontSize:11 }

// Key decarbonisation milestones
const MILESTONES = [
  { year: 2027, label: 'DEWA 50% clean energy target (Dubai 2030 plan)',           scenario: 'moderate' },
  { year: 2030, label: 'UAE Net Zero 2050 roadmap checkpoint — 30% reduction',      scenario: 'moderate' },
  { year: 2035, label: 'Dubai Clean Energy Strategy — 75% renewables',              scenario: 'ambitious' },
  { year: 2050, label: 'UAE Net Zero 2050',                                          scenario: 'ambitious' },
]

const ACTIONS = [
  { label: 'Install rooftop PV (Masdar City Hub)',    impact: '-18 tCO₂/yr', cost: 'AED 380k', payback: '4.2 yr', icon: Zap,     color: '#10b981' },
  { label: 'Switch DIFC tower to DEWA green tariff',  impact: '-28 tCO₂/yr', cost: 'AED 22k/yr',payback: 'N/A',  icon: Leaf,    color: '#3b82f6' },
  { label: 'LED lighting retrofit — BBY Main',        impact: '-6 tCO₂/yr',  cost: 'AED 48k',   payback: '2.1 yr',icon: Zap,    color: '#f59e0b' },
  { label: 'Energy storage (BESS) — Sharjah site',   impact: '-12 tCO₂/yr', cost: 'AED 620k',  payback: '6.8 yr',icon: Target, color: '#8b5cf6' },
]

export default function CO2Forecast() {
  const { siteMixes } = useAppStore()
  const [scenario, setScenario] = useState<'bau' | 'moderate' | 'ambitious'>('moderate')

  // Combine historic + forecast into a single series
  const historicYears = HISTORIC_EMISSIONS.map(e => e.year)
  const forecastData = [
    ...HISTORIC_EMISSIONS.map(e => ({
      year: String(e.year),
      historic: e.total,
      elec: e.elec,
      gas: e.gas,
      bau: null as number | null,
      moderate: null as number | null,
      ambitious: null as number | null,
      target: 0,
    })),
    ...EMISSION_SCENARIOS.slice(1).map(s => ({
      year: String(s.year),
      historic: null as number | null,
      elec: null as number | null,
      gas: null as number | null,
      bau: s.bau,
      moderate: s.moderate,
      ambitious: s.ambitious,
      target: s.target,
    })),
  ]

  const current2025 = HISTORIC_EMISSIONS[HISTORIC_EMISSIONS.length - 1].total
  const reduction2020 = HISTORIC_EMISSIONS[0].total - current2025
  const pctReduction = ((reduction2020 / HISTORIC_EMISSIONS[0].total) * 100).toFixed(1)

  const scenarioLabels: Record<string, string> = {
    bau: 'Business as Usual',
    moderate: 'Moderate Action',
    ambitious: 'Ambitious (Net Zero aligned)',
  }
  const scenarioColors: Record<string, string> = {
    bau: '#ef4444', moderate: '#f59e0b', ambitious: '#10b981',
  }

  const netZeroYear = scenario === 'ambitious' ? 2050 : scenario === 'moderate' ? 2050 : '—'
  const projected2030 = EMISSION_SCENARIOS.find(s => s.year === 2030)?.[scenario] ?? 0

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="CO₂ Forecast" subtitle="Path to net zero emissions" />
      <div className="flex-1 overflow-y-auto p-6">

        {/* KPI banner */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="card">
            <div className="label mb-1">Current Emissions (2025)</div>
            <div className="text-2xl font-semibold text-white">{current2025} <span className="text-sm font-normal text-white/40">tCO₂</span></div>
            <div className="text-xs text-success-light mt-1">↓ {pctReduction}% since 2020</div>
          </div>
          <div className="card">
            <div className="label mb-1">Reduction since 2020</div>
            <div className="text-2xl font-semibold text-success-light">{reduction2020} <span className="text-sm font-normal text-white/40">tCO₂</span></div>
            <div className="text-xs text-white/40 mt-1">Grid mix improvement (DEWA/ADC)</div>
          </div>
          <div className="card">
            <div className="label mb-1">Projected 2030</div>
            <div className="text-2xl font-semibold text-white" style={{ color: scenarioColors[scenario] }}>
              {projected2030} <span className="text-sm font-normal text-white/40">tCO₂</span>
            </div>
            <div className="text-xs text-white/40 mt-1">{scenarioLabels[scenario]}</div>
          </div>
          <div className="card">
            <div className="label mb-1">Net Zero Target</div>
            <div className="text-2xl font-semibold text-white">{netZeroYear}</div>
            <div className="text-xs text-white/40 mt-1">UAE national target: 2050</div>
          </div>
        </div>

        {/* Scenario selector */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-xs text-white/40 uppercase tracking-widest">Scenario:</span>
          <div className="flex gap-1 bg-bg-secondary border border-border-subtle rounded-xl p-1">
            {(['bau', 'moderate', 'ambitious'] as const).map(s => (
              <button key={s} onClick={() => setScenario(s)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  scenario === s ? 'text-white shadow' : 'text-white/40 hover:text-white/70'
                )}
                style={scenario === s ? { background: scenarioColors[s] } : {}}>
                {scenarioLabels[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Main forecast chart */}
        <div className="card mb-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="section-title">Emissions Trajectory — Path to Net Zero (tCO₂)</h2>
              <p className="text-xs text-white/30 mt-0.5">
                Historic 2020–2025 · Forecast 2026–2050 · Selected: <span style={{ color: scenarioColors[scenario] }}>{scenarioLabels[scenario]}</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-success-light bg-success/10 border border-success/20 rounded-lg px-3 py-1.5">
              <TrendingDown size={12} /> Declining trend
            </div>
          </div>

          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={forecastData} margin={{ top:5, right:20, left:-5, bottom:5 }}>
              <defs>
                <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="scnGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={scenarioColors[scenario]} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={scenarioColors[scenario]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="year" tick={{ fill:'#5a6385', fontSize:10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#5a6385', fontSize:10 }} axisLine={false} tickLine={false}
                tickFormatter={v => `${v}t`} domain={[0, 430]} />
              <Tooltip contentStyle={TT}
                formatter={(v: number, n: string) => [v != null ? `${v} tCO₂` : '—', n]}
                labelStyle={{ color:'#e8eaf2', fontWeight:600 }} />
              <Legend wrapperStyle={{ fontSize:10 }} />

              {/* Historic fill */}
              <Area dataKey="historic" name="Historic" stroke="#3b82f6" fill="url(#histGrad)"
                strokeWidth={2} dot={false} connectNulls={false} />

              {/* BAU dashed */}
              {scenario !== 'bau' && (
                <Line dataKey="bau" name="BAU (no action)" stroke="#ef4444"
                  strokeWidth={1.5} strokeDasharray="6 3" dot={false} connectNulls={false} />
              )}

              {/* Selected scenario */}
              <Area dataKey={scenario} name={scenarioLabels[scenario]}
                stroke={scenarioColors[scenario]} fill="url(#scnGrad)"
                strokeWidth={2.5} dot={false} connectNulls={false} />

              {/* Net zero reference */}
              <ReferenceLine y={0} stroke="#10b981" strokeDasharray="4 4" strokeWidth={1.5} label={{ value:'Net Zero', position:'insideTopLeft', fill:'#10b981', fontSize:10 }} />

              {/* Milestone markers */}
              {MILESTONES.filter(m => m.scenario === scenario || m.scenario === 'moderate').map(m => (
                <ReferenceLine key={m.year} x={String(m.year)} stroke="#ffffff15" strokeDasharray="3 3" />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Historic breakdown */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="card">
            <h2 className="section-title mb-1">Historic — Electricity vs Gas (tCO₂)</h2>
            <p className="text-xs text-white/30 mb-3">Electricity emissions are decreasing faster due to grid decarbonisation</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={HISTORIC_EMISSIONS.map(e => ({ ...e, year: String(e.year) }))}
                margin={{ top:0, right:0, left:-10, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="year" tick={{ fill:'#5a6385', fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'#5a6385', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}t`} />
                <Tooltip contentStyle={TT} formatter={(v: number, n: string) => [`${v} tCO₂`, n]} />
                <Legend wrapperStyle={{ fontSize:10 }} />
                <Bar dataKey="elec" name="Electricity" stackId="s" fill="#3b82f6" opacity={0.8} radius={[0,0,0,0]} />
                <Bar dataKey="gas"  name="Gas"          stackId="s" fill="#f59e0b" opacity={0.8} radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Milestones */}
          <div className="card">
            <h2 className="section-title mb-3">UAE Decarbonisation Milestones</h2>
            <div className="space-y-3">
              {MILESTONES.map(m => (
                <div key={m.year} className="flex items-start gap-3 p-2.5 rounded-lg border border-border-subtle bg-bg-card/30">
                  <div className="text-xs font-mono font-semibold text-accent-hover mt-0.5 min-w-[36px]">{m.year}</div>
                  <p className="text-xs text-white/60 leading-relaxed">{m.label}</p>
                  <span className={clsx(
                    'text-[9px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5',
                    m.scenario === 'ambitious' ? 'bg-success/15 text-success-light' : 'bg-warning/15 text-warning-light'
                  )}>
                    {m.scenario}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recommended decarbonisation actions */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Leaf size={14} className="text-success" />
            <h2 className="section-title">Recommended Actions</h2>
            <span className="text-[10px] text-white/40 ml-auto">Based on current portfolio & utility mix</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {ACTIONS.map((a, i) => {
              const Icon = a.icon
              return (
                <div key={i} className="flex items-start gap-3 p-3.5 rounded-lg border border-border-subtle bg-bg-card/40 hover:border-border-default transition-colors">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${a.color}20`, border: `1px solid ${a.color}40` }}>
                    <Icon size={14} style={{ color: a.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white/80 mb-1">{a.label}</p>
                    <div className="flex gap-3 text-[10px] text-white/40">
                      <span className="text-success-light font-semibold">{a.impact}</span>
                      <span>Cost: {a.cost}</span>
                      {a.payback !== 'N/A' && <span>Payback: {a.payback}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-4 p-3 rounded-lg border border-warning/20 bg-warning/5 flex items-start gap-2">
            <AlertTriangle size={13} className="text-warning mt-0.5 flex-shrink-0" />
            <p className="text-xs text-white/50">
              Implementing all 4 actions would reduce portfolio emissions by <strong className="text-white/70">~64 tCO₂/yr</strong> (20% reduction from 2025 baseline),
              putting the portfolio ahead of the moderate scenario and on track for UAE 2030 targets.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
