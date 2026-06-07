import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useAppStore } from '@/lib/store'
import {
  MOCK_CONNECTIONS, MOCK_SITES,
  CO2_FACTORS, DEFAULT_ELEC_SOURCES, METER_ANNUAL_CONSUMPTION,
  calcMeterCO2, calcElecFactor,
  type ElecSource,
} from '@/lib/mockData'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, Legend,
} from 'recharts'
import { Leaf, Zap, Flame, Info } from 'lucide-react'
import clsx from 'clsx'

const TT = { background:'#111520', border:'1px solid #ffffff20', borderRadius:8, fontSize:12 }

const SOURCE_COLORS: Record<string, string> = {
  gas_fired: '#f59e0b',
  coal:      '#78716c',
  renewable: '#10b981',
  mix:       '#3b82f6',
}
const SOURCE_LABELS: Record<string, string> = {
  gas_fired: 'Gas Fired',
  coal:      'Coal',
  renewable: 'Renewable',
  mix:       'Grid Mix',
}

type ViewLevel = 'portfolio' | 'site' | 'meter'

// ─── Source editor for one meter ──────────────────────────────────────────────
function SourceEditor({
  connectionId, label, src, onChange,
}: {
  connectionId: string
  label: string
  src: ElecSource
  onChange: (src: ElecSource) => void
}) {
  const keys = ['gas_fired','coal','renewable','mix'] as const
  const total = keys.reduce((a,k) => a + src[k], 0)
  const factor = calcElecFactor(src)

  const update = (key: keyof ElecSource, val: number) => {
    onChange({ ...src, [key]: val })
  }

  return (
    <div className="border border-border-subtle rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-semibold text-white">{label}</div>
          <div className="text-xs text-white/40 font-mono mt-0.5">{connectionId.toUpperCase()}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-white/40">Emission factor</div>
          <div className={clsx('text-sm font-semibold', factor > 0.5 ? 'text-danger-light' : factor > 0.3 ? 'text-warning-light' : 'text-success-light')}>
            {factor.toFixed(3)} kgCO₂/kWh
          </div>
        </div>
      </div>

      {/* Stacked colour bar */}
      <div className="flex h-2 rounded-full overflow-hidden mb-3 gap-0.5">
        {keys.map(k => (
          <div
            key={k}
            style={{ width: `${src[k]}%`, background: SOURCE_COLORS[k] }}
            className="transition-all"
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {keys.map(k => (
          <div key={k}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-sm" style={{ background: SOURCE_COLORS[k] }} />
                <span className="text-xs text-white/60">{SOURCE_LABELS[k]}</span>
              </div>
              <span className="text-xs font-medium text-white">{src[k]}%</span>
            </div>
            <input
              type="range" min={0} max={100} step={5}
              value={src[k]}
              onChange={e => update(k, Number(e.target.value))}
              className="w-full h-1 rounded appearance-none cursor-pointer accent-accent"
            />
          </div>
        ))}
      </div>

      {Math.abs(total - 100) > 1 && (
        <div className="mt-2 text-xs text-warning-light flex items-center gap-1">
          <Info size={11} /> Sum = {total}% — adjust to reach 100%
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Emissions() {
  const { elecSources, setElecSource } = useAppStore()
  const [view, setView] = useState<ViewLevel>('portfolio')

  // Use store sources, falling back to defaults
  const sources = { ...DEFAULT_ELEC_SOURCES, ...elecSources }

  // ── Per-meter CO₂ ────────────────────────────────────────────────────────────
  const meterCO2 = MOCK_CONNECTIONS.map(c => {
    const tco2 = calcMeterCO2(c.id, sources)
    const consumption = METER_ANNUAL_CONSUMPTION[c.id]
    const isGas = c.connection_type === 'Gas'
    return {
      id: c.id,
      label: c.meter.meter_number,
      site: c.site_name,
      type: c.connection_type,
      tco2: Math.round(tco2 * 10) / 10,
      elecTco2:  isGas ? 0 : Math.round(tco2 * 10) / 10,
      gasTco2:   isGas ? Math.round(tco2 * 10) / 10 : 0,
      consumption,
    }
  }).filter(m => m.tco2 > 0)

  // ── Per-site CO₂ ─────────────────────────────────────────────────────────────
  const siteMap: Record<string, { elec: number; gas: number; site: string }> = {}
  meterCO2.forEach(m => {
    if (!siteMap[m.site]) siteMap[m.site] = { elec:0, gas:0, site:m.site }
    siteMap[m.site].elec += m.elecTco2
    siteMap[m.site].gas  += m.gasTco2
  })
  const siteCO2 = Object.values(siteMap).map(s => ({
    label: s.site.replace(' Zone','').replace(' Hub','').replace(' Tower',''),
    electricity: Math.round(s.elec * 10) / 10,
    gas:         Math.round(s.gas  * 10) / 10,
    total:       Math.round((s.elec + s.gas) * 10) / 10,
  }))

  // ── Portfolio totals ──────────────────────────────────────────────────────────
  const totalElecCO2 = Math.round(meterCO2.reduce((a,m) => a+m.elecTco2, 0) * 10) / 10
  const totalGasCO2  = Math.round(meterCO2.reduce((a,m) => a+m.gasTco2,  0) * 10) / 10
  const totalCO2     = totalElecCO2 + totalGasCO2

  // Electricity-only meters (for source editor)
  const elecConnections = MOCK_CONNECTIONS.filter(c => c.connection_type === 'Electricity' && METER_ANNUAL_CONSUMPTION[c.id]?.electricity)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="CO₂ Emissions" subtitle="Greenhouse gas emissions — electricity & gas" />
      <div className="flex-1 overflow-y-auto p-6">

        {/* ── Portfolio KPI row ───────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="card">
            <div className="label mb-1 flex items-center gap-1"><Leaf size={11}/> Total Portfolio CO₂</div>
            <div className="text-2xl font-semibold text-white">{totalCO2.toFixed(1)}</div>
            <div className="text-xs text-white/40 mt-1">tCO₂ per year</div>
          </div>
          <div className="card">
            <div className="label mb-1 flex items-center gap-1"><Zap size={11} className="text-blue-400"/> Electricity CO₂</div>
            <div className="text-2xl font-semibold text-blue-300">{totalElecCO2.toFixed(1)}</div>
            <div className="text-xs text-white/40 mt-1">{((totalElecCO2/totalCO2)*100).toFixed(0)}% of total</div>
          </div>
          <div className="card">
            <div className="label mb-1 flex items-center gap-1"><Flame size={11} className="text-amber-400"/> Gas CO₂</div>
            <div className="text-2xl font-semibold text-amber-300">{totalGasCO2.toFixed(1)}</div>
            <div className="text-xs text-white/40 mt-1">{((totalGasCO2/totalCO2)*100).toFixed(0)}% of total</div>
          </div>
          <div className="card">
            <div className="label mb-1">CO₂ Intensity</div>
            <div className="text-2xl font-semibold text-white">
              {(totalCO2 / (878000 / 1000)).toFixed(2)}
            </div>
            <div className="text-xs text-white/40 mt-1">tCO₂ / MWh consumed</div>
          </div>
        </div>

        {/* ── View level tabs ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 mb-5 bg-bg-secondary border border-border-subtle rounded-xl p-1 w-fit">
          {(['portfolio','site','meter'] as ViewLevel[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={clsx('px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize',
                view === v ? 'bg-accent text-white shadow' : 'text-white/40 hover:text-white/70'
              )}>
              {v}
            </button>
          ))}
        </div>

        {/* ── Charts ─────────────────────────────────────────────────────── */}
        {view === 'portfolio' && (
          <div className="card">
            <h2 className="section-title mb-1">Portfolio CO₂ — by Source Type</h2>
            <p className="text-xs text-white/30 mb-5">Annual tonnes CO₂ · stacked electricity + gas</p>
            <div className="flex items-center gap-8">
              {/* Donut-style summary */}
              <div className="flex flex-col items-center gap-2 min-w-[160px]">
                <div className="relative w-32 h-32">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#ffffff08" strokeWidth="4" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#3b82f6" strokeWidth="4"
                      strokeDasharray={`${(totalElecCO2/totalCO2*87.96).toFixed(1)} 87.96`} />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#f59e0b" strokeWidth="4"
                      strokeDasharray={`${(totalGasCO2/totalCO2*87.96).toFixed(1)} 87.96`}
                      strokeDashoffset={`-${(totalElecCO2/totalCO2*87.96).toFixed(1)}`} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-lg font-bold text-white">{totalCO2.toFixed(0)}</div>
                    <div className="text-[10px] text-white/40">tCO₂</div>
                  </div>
                </div>
                <div className="space-y-1.5 w-full">
                  {[
                    { label:'Electricity', val:totalElecCO2, color:'#3b82f6' },
                    { label:'Gas',         val:totalGasCO2,  color:'#f59e0b' },
                  ].map(d => (
                    <div key={d.label} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-sm" style={{background:d.color}}/>
                        <span className="text-white/60">{d.label}</span>
                      </div>
                      <span className="text-white font-medium">{d.val.toFixed(1)} t</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Stacked by site */}
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={siteCO2} margin={{top:0,right:0,left:-10,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08"/>
                    <XAxis dataKey="label" tick={{fill:'#5a6385',fontSize:10}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:'#5a6385',fontSize:10}} axisLine={false} tickLine={false} unit=" t"/>
                    <Tooltip contentStyle={TT} formatter={(v:number, name:string) => [`${v.toFixed(1)} tCO₂`, name === 'electricity' ? '⚡ Electricity' : '🔥 Gas']}/>
                    <Legend wrapperStyle={{fontSize:11,color:'#5a6385'}} formatter={v => v === 'electricity' ? '⚡ Electricity' : '🔥 Gas'}/>
                    <Bar dataKey="electricity" name="electricity" stackId="a" fill="#3b82f6" opacity={0.85} radius={[0,0,0,0]}/>
                    <Bar dataKey="gas"         name="gas"         stackId="a" fill="#f59e0b" opacity={0.85} radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {view === 'site' && (
          <div className="card">
            <h2 className="section-title mb-1">CO₂ by Site / Address</h2>
            <p className="text-xs text-white/30 mb-5">Annual tonnes CO₂ per site · stacked electricity + gas</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={siteCO2} margin={{top:5,right:10,left:-5,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08"/>
                <XAxis dataKey="label" tick={{fill:'#5a6385',fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:'#5a6385',fontSize:10}} axisLine={false} tickLine={false} unit=" t"/>
                <Tooltip contentStyle={TT} formatter={(v:number, name:string) => [`${v.toFixed(1)} tCO₂`, name === 'electricity' ? '⚡ Electricity' : '🔥 Gas']}/>
                <Legend wrapperStyle={{fontSize:11,color:'#5a6385'}} formatter={v => v === 'electricity' ? '⚡ Electricity' : '🔥 Gas'}/>
                <Bar dataKey="electricity" name="electricity" stackId="a" fill="#3b82f6" opacity={0.85} radius={[0,0,0,0]}>
                  {siteCO2.map((_, i) => <Cell key={i} />)}
                </Bar>
                <Bar dataKey="gas" name="gas" stackId="a" fill="#f59e0b" opacity={0.85} radius={[3,3,0,0]}>
                  {siteCO2.map((_, i) => <Cell key={i} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* Site table */}
            <table className="w-full mt-4">
              <thead>
                <tr>{['Site','Elec CO₂ (t)','Gas CO₂ (t)','Total CO₂ (t)','% Portfolio'].map(h=><th key={h} className="tbl-th">{h}</th>)}</tr>
              </thead>
              <tbody>
                {siteCO2.sort((a,b)=>b.total-a.total).map(s=>(
                  <tr key={s.label} className="tbl-row">
                    <td className="tbl-td text-white font-medium">{s.label}</td>
                    <td className="tbl-td text-blue-300">{s.electricity.toFixed(1)}</td>
                    <td className="tbl-td text-amber-300">{s.gas.toFixed(1)}</td>
                    <td className="tbl-td text-white font-semibold">{s.total.toFixed(1)}</td>
                    <td className="tbl-td text-white/60">{((s.total/totalCO2)*100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === 'meter' && (
          <div className="card">
            <h2 className="section-title mb-1">CO₂ by Meter</h2>
            <p className="text-xs text-white/30 mb-5">Annual tonnes CO₂ per individual meter</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={meterCO2} layout="vertical" margin={{top:0,right:20,left:10,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false}/>
                <XAxis type="number" tick={{fill:'#5a6385',fontSize:10}} axisLine={false} tickLine={false} unit=" t"/>
                <YAxis type="category" dataKey="label" tick={{fill:'#5a6385',fontSize:10}} axisLine={false} tickLine={false} width={100}/>
                <Tooltip contentStyle={TT} formatter={(v:number,name:string)=>[`${v.toFixed(1)} tCO₂`, name==='elecTco2'?'⚡ Electricity':'🔥 Gas']}/>
                <Legend wrapperStyle={{fontSize:11,color:'#5a6385'}} formatter={v=>v==='elecTco2'?'⚡ Electricity':'🔥 Gas'}/>
                <Bar dataKey="elecTco2" name="elecTco2" stackId="a" fill="#3b82f6" opacity={0.85} radius={[0,0,0,0]}/>
                <Bar dataKey="gasTco2"  name="gasTco2"  stackId="a" fill="#f59e0b" opacity={0.85} radius={[0,3,3,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Electricity Source Configuration ──────────────────────────── */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={14} className="text-accent-hover" />
            <h2 className="section-title">Electricity Source Mix — per Meter</h2>
          </div>
          <p className="text-xs text-white/40 mb-5 -mt-2">
            Configure the electricity generation source for each meter to calculate accurate CO₂ emissions.
            CO₂ factors: Gas Fired {CO2_FACTORS.electricity.gas_fired} · Coal {CO2_FACTORS.electricity.coal} · Renewable {CO2_FACTORS.electricity.renewable} · Grid Mix {CO2_FACTORS.electricity.mix} kgCO₂/kWh
          </p>
          <div className="grid grid-cols-3 gap-4">
            {elecConnections.map(c => (
              <SourceEditor
                key={c.id}
                connectionId={c.id}
                label={`${c.site_name} — ${c.meter.meter_number}`}
                src={sources[c.id] ?? DEFAULT_ELEC_SOURCES[c.id] ?? { gas_fired:60, coal:5, renewable:10, mix:25 }}
                onChange={src => setElecSource(c.id, src)}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
