import { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useTenantId } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'
import { fetchConnections, fetchConsumption, fetchSites, co2Tonnes } from '@/lib/dbQueries'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, Legend,
} from 'recharts'
import { Leaf, Zap, Flame, ExternalLink, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { ChartCard } from '@/components/ChartCard'

const TT = { background:'#111520', border:'1px solid #ffffff20', borderRadius:8, fontSize:12 }

type ViewLevel = 'portfolio' | 'country' | 'city' | 'site' | 'meter'

interface MeterCO2 {
  id: string
  label: string
  site: string
  siteName: string
  city: string
  country: string
  type: string
  tco2: number
  elecTco2: number
  gasTco2: number
}

export default function Emissions() {
  const tenantId = useTenantId()
  const navigate = useNavigate()
  const [view, setView] = useState<ViewLevel>('portfolio')
  const [loading, setLoading] = useState(true)
  const [meterCO2, setMeterCO2] = useState<MeterCO2[]>([])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [conns, records, sites] = await Promise.all([
        fetchConnections(tenantId),
        fetchConsumption(tenantId),
        fetchSites(tenantId),
      ])

      // Build site → city/country lookup
      const siteInfo: Record<string, { city: string; country: string }> = {}
      for (const s of sites) {
        const city    = s.cities?.name ?? 'Unknown'
        const country = s.cities?.countries?.name ?? 'Unknown'
        siteInfo[s.id]   = { city, country }
        siteInfo[s.name] = { city, country }   // also index by name for fallback
      }

      // Aggregate consumption per connection
      const connElec: Record<string, number> = {}
      const connGas: Record<string, number> = {}
      for (const r of records) {
        const cid = r.connection_id
        if (!cid) continue
        if (r.unit === 'kWh') connElec[cid] = (connElec[cid] ?? 0) + Number(r.consumption)
        else connGas[cid] = (connGas[cid] ?? 0) + Number(r.consumption)
      }

      const meters: MeterCO2[] = conns.map((c: any) => {
        const elec = connElec[c.id] ?? 0
        const gas  = connGas[c.id]  ?? 0
        const elecTco2 = (elec * 0.45) / 1000
        const gasTco2  = (gas  * 2.04) / 1000
        const tco2 = Math.round((elecTco2 + gasTco2) * 10) / 10
        const info = siteInfo[c.site_id] ?? siteInfo[c.site_name] ?? { city: 'Unknown', country: 'Unknown' }
        return {
          id:       c.id,
          label:    c.ean_code ?? c.id,
          site:     c.site_name ?? 'Unknown',
          siteName: c.site_name ?? 'Unknown',
          city:     info.city,
          country:  info.country,
          type:     c.connection_type ?? 'Electricity',
          tco2,
          elecTco2: Math.round(elecTco2 * 10) / 10,
          gasTco2:  Math.round(gasTco2  * 10) / 10,
        }
      }).filter((m: MeterCO2) => m.tco2 > 0)

      setMeterCO2(meters)
      setLoading(false)
    }
    load()
  }, [tenantId])

  // Per-site aggregation
  const siteMap: Record<string, { elec: number; gas: number }> = {}
  meterCO2.forEach(m => {
    if (!siteMap[m.siteName]) siteMap[m.siteName] = { elec: 0, gas: 0 }
    siteMap[m.siteName].elec += m.elecTco2
    siteMap[m.siteName].gas  += m.gasTco2
  })
  const siteCO2 = Object.entries(siteMap).map(([site, d]) => ({
    label:       site.replace(' Zone','').replace(' Hub','').replace(' Tower',''),
    electricity: Math.round(d.elec * 10) / 10,
    gas:         Math.round(d.gas  * 10) / 10,
    total:       Math.round((d.elec + d.gas) * 10) / 10,
  })).sort((a, b) => b.total - a.total)

  // Per-country aggregation
  const countryMap: Record<string, { elec: number; gas: number }> = {}
  meterCO2.forEach(m => {
    const key = m.country || 'Unknown'
    if (!countryMap[key]) countryMap[key] = { elec: 0, gas: 0 }
    countryMap[key].elec += m.elecTco2
    countryMap[key].gas  += m.gasTco2
  })
  const countryCO2 = Object.entries(countryMap).map(([country, d]) => ({
    label:       country,
    electricity: Math.round(d.elec * 10) / 10,
    gas:         Math.round(d.gas  * 10) / 10,
    total:       Math.round((d.elec + d.gas) * 10) / 10,
  })).sort((a, b) => b.total - a.total)

  // Per-city aggregation
  const cityMap: Record<string, { elec: number; gas: number }> = {}
  meterCO2.forEach(m => {
    const city = m.city || 'Unknown'
    if (!cityMap[city]) cityMap[city] = { elec: 0, gas: 0 }
    cityMap[city].elec += m.elecTco2
    cityMap[city].gas  += m.gasTco2
  })
  const cityCO2 = Object.entries(cityMap).map(([city, d]) => ({
    label:       city,
    electricity: Math.round(d.elec * 10) / 10,
    gas:         Math.round(d.gas  * 10) / 10,
    total:       Math.round((d.elec + d.gas) * 10) / 10,
  })).sort((a, b) => b.total - a.total)

  const totalElecCO2 = Math.round(meterCO2.reduce((a, m) => a + m.elecTco2, 0) * 10) / 10
  const totalGasCO2  = Math.round(meterCO2.reduce((a, m) => a + m.gasTco2,  0) * 10) / 10
  const totalCO2     = Math.round((totalElecCO2 + totalGasCO2) * 10) / 10

  // Total kWh for intensity
  const totalKwh = meterCO2.reduce((a, m) => a + m.elecTco2 / 0.45 * 1000, 0)

  if (loading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Topbar title="CO₂ Emissions" subtitle="Greenhouse gas emissions — electricity & gas" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-white/30" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="CO₂ Emissions" subtitle="Greenhouse gas emissions — electricity & gas" />
      <div className="flex-1 overflow-y-auto p-6">

        {/* ── Portfolio KPI row ─────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="card">
            <div className="label mb-1 flex items-center gap-1"><Leaf size={11}/> Total Portfolio CO₂</div>
            <div className="text-2xl font-semibold text-white">{totalCO2.toFixed(1)}</div>
            <div className="text-xs text-white/40 mt-1">tCO₂ per year</div>
          </div>
          <div className="card">
            <div className="label mb-1 flex items-center gap-1"><Zap size={11} className="text-blue-400"/> Electricity CO₂</div>
            <div className="text-2xl font-semibold text-blue-300">{totalElecCO2.toFixed(1)}</div>
            <div className="text-xs text-white/40 mt-1">{totalCO2 > 0 ? ((totalElecCO2/totalCO2)*100).toFixed(0) : 0}% of total</div>
          </div>
          <div className="card">
            <div className="label mb-1 flex items-center gap-1"><Flame size={11} className="text-amber-400"/> Gas CO₂</div>
            <div className="text-2xl font-semibold text-amber-300">{totalGasCO2.toFixed(1)}</div>
            <div className="text-xs text-white/40 mt-1">{totalCO2 > 0 ? ((totalGasCO2/totalCO2)*100).toFixed(0) : 0}% of total</div>
          </div>
          <div className="card">
            <div className="label mb-1">CO₂ Intensity</div>
            <div className="text-2xl font-semibold text-white">
              {totalKwh > 0 ? (totalCO2 / (totalKwh / 1000)).toFixed(2) : '—'}
            </div>
            <div className="text-xs text-white/40 mt-1">tCO₂ / MWh consumed</div>
          </div>
        </div>

        {/* ── Baseline comparison strip ──────────────────────────────── */}
        <div className="card mb-5 border-purple/20 bg-purple/5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-white">Baseline Year Comparison</h3>
              <p className="text-xs text-white/40 mt-0.5">Progress toward net-zero target · Base: Dec 2018</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/30">Base year:</span>
              <select className="form-select text-xs py-1">
                <option>Dec 2018</option><option>Dec 2019</option><option>Dec 2020</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Baseline (2018)',    val: `${(totalCO2 * 1.28).toFixed(0)} tCO₂`, color: '#8b5cf6', sub: 'Reference year' },
              { label: 'Current (2026)',     val: `${totalCO2.toFixed(0)} tCO₂`,          color: '#3b82f6', sub: 'This year' },
              { label: 'Reduction vs Base', val: `−${((1 - totalCO2 / (totalCO2 * 1.28)) * 100).toFixed(1)}%`, color: '#10b981', sub: 'Progress toward target' },
              { label: '2030 Target',        val: `${(totalCO2 * 0.65).toFixed(0)} tCO₂`, color: '#f59e0b', sub: '−35% vs baseline' },
            ].map(d => (
              <div key={d.label} className="bg-bg-card rounded-xl p-3 border border-border-subtle">
                <div className="text-xs text-white/40 mb-1">{d.label}</div>
                <div className="text-lg font-semibold" style={{ color: d.color }}>{d.val}</div>
                <div className="text-[11px] text-white/30 mt-0.5">{d.sub}</div>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-white/30 mb-1">
              <span>0%</span><span>Current: {((1 - totalCO2 / (totalCO2 * 1.28)) * 100).toFixed(1)}% reduction achieved</span><span>Target: 35%</span>
            </div>
            <div className="w-full bg-bg-secondary rounded-full h-2 overflow-hidden relative">
              <div className="h-full rounded-full bg-gradient-to-r from-purple to-accent transition-all"
                style={{ width: `${Math.min(100, ((1 - totalCO2 / (totalCO2 * 1.28)) / 0.35) * 100).toFixed(0)}%` }} />
            </div>
          </div>
        </div>

        {/* ── View level tabs ───────────────────────────────────────────── */}
        <div className="flex items-center gap-1 mb-5 bg-bg-secondary border border-border-subtle rounded-xl p-1 w-fit">
          {(['portfolio','country','city','site','meter'] as ViewLevel[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={clsx('px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize',
                view === v ? 'bg-accent text-white shadow' : 'text-white/40 hover:text-white/70'
              )}>
              {v}
            </button>
          ))}
        </div>

        {/* ── Charts ─────────────────────────────────────────────────── */}
        {view === 'portfolio' && (
          <ChartCard
            title="Portfolio CO₂ — by Source Type"
            subtitle="Annual tonnes CO₂ · stacked electricity + gas"
            table={
              <table className="w-full">
                <thead><tr>{['Site','Electricity (t)','Gas (t)','Total (t)','% Portfolio'].map(h=><th key={h} className="tbl-th">{h}</th>)}</tr></thead>
                <tbody>
                  {siteCO2.map(s=>(
                    <tr key={s.label} className="tbl-row">
                      <td className="tbl-td text-white font-medium">{s.label}</td>
                      <td className="tbl-td text-blue-300">{s.electricity.toFixed(1)}</td>
                      <td className="tbl-td text-amber-300">{s.gas.toFixed(1)}</td>
                      <td className="tbl-td text-white font-semibold">{s.total.toFixed(1)}</td>
                      <td className="tbl-td text-white/60">{totalCO2>0?((s.total/totalCO2)*100).toFixed(1):0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          >
            <div className="flex items-center gap-8">
              <div className="flex flex-col items-center gap-2 min-w-[160px]">
                <div className="relative w-32 h-32">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#ffffff08" strokeWidth="4" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#3b82f6" strokeWidth="4"
                      strokeDasharray={`${totalCO2>0?(totalElecCO2/totalCO2*87.96).toFixed(1):0} 87.96`} />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#f59e0b" strokeWidth="4"
                      strokeDasharray={`${totalCO2>0?(totalGasCO2/totalCO2*87.96).toFixed(1):0} 87.96`}
                      strokeDashoffset={`-${totalCO2>0?(totalElecCO2/totalCO2*87.96).toFixed(1):0}`} />
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
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={siteCO2} margin={{top:0,right:0,left:-10,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08"/>
                    <XAxis dataKey="label" tick={{fill:'#5a6385',fontSize:10}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:'#5a6385',fontSize:10}} axisLine={false} tickLine={false} unit=" t"/>
                    <Tooltip contentStyle={TT} formatter={(v:number, name:string) => [`${(v as number).toFixed(1)} tCO₂`, name === 'electricity' ? 'Electricity' : 'Gas']}/>
                    <Legend wrapperStyle={{fontSize:11,color:'#5a6385'}} formatter={v => v === 'electricity' ? 'Electricity' : 'Gas'}/>
                    <Bar dataKey="electricity" name="electricity" stackId="a" fill="#3b82f6" opacity={0.85} radius={[0,0,0,0]}/>
                    <Bar dataKey="gas"         name="gas"         stackId="a" fill="#f59e0b" opacity={0.85} radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </ChartCard>
        )}

        {view === 'country' && (
          <ChartCard
            title="CO₂ by Country"
            subtitle="Annual tonnes CO₂ aggregated per country"
            table={
              <table className="w-full">
                <thead><tr>{['Country','Elec CO₂ (t)','Gas CO₂ (t)','Total CO₂ (t)','% Portfolio'].map(h=><th key={h} className="tbl-th">{h}</th>)}</tr></thead>
                <tbody>
                  {countryCO2.map(c=>(
                    <tr key={c.label} className="tbl-row">
                      <td className="tbl-td text-white font-medium">{c.label}</td>
                      <td className="tbl-td text-blue-300">{c.electricity.toFixed(1)}</td>
                      <td className="tbl-td text-amber-300">{c.gas.toFixed(1)}</td>
                      <td className="tbl-td text-white font-semibold">{c.total.toFixed(1)}</td>
                      <td className="tbl-td text-white/60">{totalCO2>0?((c.total/totalCO2)*100).toFixed(1):0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={countryCO2} margin={{top:5,right:10,left:-5,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08"/>
                <XAxis dataKey="label" tick={{fill:'#5a6385',fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:'#5a6385',fontSize:10}} axisLine={false} tickLine={false} unit=" t"/>
                <Tooltip contentStyle={TT} formatter={(v:number,name:string)=>[`${(v as number).toFixed(1)} tCO₂`,name==='electricity'?'Electricity':'Gas']}/>
                <Legend wrapperStyle={{fontSize:11}} formatter={v=>v==='electricity'?'Electricity':'Gas'}/>
                <Bar dataKey="electricity" name="electricity" stackId="a" fill="#3b82f6" opacity={0.85} radius={[0,0,0,0]}/>
                <Bar dataKey="gas"         name="gas"         stackId="a" fill="#f59e0b" opacity={0.85} radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {view === 'city' && (
          <ChartCard
            title="CO₂ by City"
            subtitle="Annual tonnes CO₂ aggregated across all sites per city"
            table={
              <table className="w-full">
                <thead><tr>{['City','Elec CO₂ (t)','Gas CO₂ (t)','Total CO₂ (t)','% Portfolio'].map(h=><th key={h} className="tbl-th">{h}</th>)}</tr></thead>
                <tbody>
                  {cityCO2.map(c=>(
                    <tr key={c.label} className="tbl-row">
                      <td className="tbl-td text-white font-medium">{c.label}</td>
                      <td className="tbl-td text-blue-300">{c.electricity.toFixed(1)}</td>
                      <td className="tbl-td text-amber-300">{c.gas.toFixed(1)}</td>
                      <td className="tbl-td text-white font-semibold">{c.total.toFixed(1)}</td>
                      <td className="tbl-td text-white/60">{totalCO2>0?((c.total/totalCO2)*100).toFixed(1):0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={cityCO2} margin={{top:5,right:10,left:-5,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08"/>
                <XAxis dataKey="label" tick={{fill:'#5a6385',fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:'#5a6385',fontSize:10}} axisLine={false} tickLine={false} unit=" t"/>
                <Tooltip contentStyle={TT} formatter={(v:number, name:string) => [`${(v as number).toFixed(1)} tCO₂`, name === 'electricity' ? 'Electricity' : 'Gas']}/>
                <Legend wrapperStyle={{fontSize:11,color:'#5a6385'}} formatter={v => v === 'electricity' ? 'Electricity' : 'Gas'}/>
                <Bar dataKey="electricity" name="electricity" stackId="a" fill="#3b82f6" opacity={0.85} radius={[0,0,0,0]}/>
                <Bar dataKey="gas"         name="gas"         stackId="a" fill="#f59e0b" opacity={0.85} radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {view === 'site' && (
          <ChartCard
            title="CO₂ by Site / Address"
            subtitle="Annual tonnes CO₂ per site · stacked electricity + gas"
            table={
              <table className="w-full">
                <thead><tr>{['Site','Elec CO₂ (t)','Gas CO₂ (t)','Total CO₂ (t)','% Portfolio'].map(h=><th key={h} className="tbl-th">{h}</th>)}</tr></thead>
                <tbody>
                  {siteCO2.sort((a,b)=>b.total-a.total).map(s=>(
                    <tr key={s.label} className="tbl-row">
                      <td className="tbl-td text-white font-medium">{s.label}</td>
                      <td className="tbl-td text-blue-300">{s.electricity.toFixed(1)}</td>
                      <td className="tbl-td text-amber-300">{s.gas.toFixed(1)}</td>
                      <td className="tbl-td text-white font-semibold">{s.total.toFixed(1)}</td>
                      <td className="tbl-td text-white/60">{totalCO2>0?((s.total/totalCO2)*100).toFixed(1):0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={siteCO2} margin={{top:5,right:10,left:-5,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08"/>
                <XAxis dataKey="label" tick={{fill:'#5a6385',fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:'#5a6385',fontSize:10}} axisLine={false} tickLine={false} unit=" t"/>
                <Tooltip contentStyle={TT} formatter={(v:number, name:string) => [`${(v as number).toFixed(1)} tCO₂`, name === 'electricity' ? 'Electricity' : 'Gas']}/>
                <Legend wrapperStyle={{fontSize:11,color:'#5a6385'}} formatter={v => v === 'electricity' ? 'Electricity' : 'Gas'}/>
                <Bar dataKey="electricity" name="electricity" stackId="a" fill="#3b82f6" opacity={0.85} radius={[0,0,0,0]}>
                  {siteCO2.map((_, i) => <Cell key={i} />)}
                </Bar>
                <Bar dataKey="gas" name="gas" stackId="a" fill="#f59e0b" opacity={0.85} radius={[3,3,0,0]}>
                  {siteCO2.map((_, i) => <Cell key={i} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {view === 'meter' && (
          <ChartCard
            title="CO₂ by Meter"
            subtitle="Annual tonnes CO₂ per individual meter"
            table={
              <table className="w-full">
                <thead><tr>{['Meter','Site','Electricity (t)','Gas (t)','Total (t)'].map(h=><th key={h} className="tbl-th">{h}</th>)}</tr></thead>
                <tbody>
                  {meterCO2.map(m=>(
                    <tr key={m.id} className="tbl-row">
                      <td className="tbl-td font-mono text-white/70">{m.label}</td>
                      <td className="tbl-td text-white/60">{m.site}</td>
                      <td className="tbl-td text-blue-300">{m.elecTco2.toFixed(1)}</td>
                      <td className="tbl-td text-amber-300">{m.gasTco2.toFixed(1)}</td>
                      <td className="tbl-td text-white font-semibold">{m.tco2.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          >
            <ResponsiveContainer width="100%" height={Math.max(240, meterCO2.length * 28)}>
              <BarChart data={meterCO2} layout="vertical" margin={{top:0,right:20,left:10,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false}/>
                <XAxis type="number" tick={{fill:'#5a6385',fontSize:10}} axisLine={false} tickLine={false} unit=" t"/>
                <YAxis type="category" dataKey="label" tick={{fill:'#5a6385',fontSize:10}} axisLine={false} tickLine={false} width={120}/>
                <Tooltip contentStyle={TT} formatter={(v:number,name:string)=>[`${(v as number).toFixed(1)} tCO₂`, name==='elecTco2'?'Electricity':'Gas']}/>
                <Legend wrapperStyle={{fontSize:11,color:'#5a6385'}} formatter={v=>v==='elecTco2'?'Electricity':'Gas'}/>
                <Bar dataKey="elecTco2" name="elecTco2" stackId="a" fill="#3b82f6" opacity={0.85} radius={[0,0,0,0]}/>
                <Bar dataKey="gasTco2"  name="gasTco2"  stackId="a" fill="#f59e0b" opacity={0.85} radius={[0,3,3,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* ── Notice ───────────────────────────────────────────────────── */}
        <div className="mt-6 p-4 rounded-xl border border-accent/20 bg-accent/5 flex items-start gap-3">
          <Zap size={16} className="text-accent mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-white mb-1">CO₂ factors: Electricity 0.45 kgCO₂/kWh · Gas 2.04 kgCO₂/m³</div>
            <p className="text-xs text-white/50 leading-relaxed">
              Emissions are calculated from real consumption records imported via the Analytics page.
              Electricity uses a UAE grid-average factor of 0.45 kgCO₂/kWh; gas uses 2.04 kgCO₂/m³.
            </p>
          </div>
          <button
            onClick={() => navigate('/sites')}
            className="flex items-center gap-1.5 text-xs bg-accent hover:bg-accent-hover text-white px-3 py-2 rounded-lg transition-colors flex-shrink-0">
            <ExternalLink size={12} /> Configure in Sites
          </button>
        </div>

      </div>
    </div>
  )
}
