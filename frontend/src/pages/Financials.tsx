import { useState, useMemo } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import {
  MOCK_SITES, UAE_TARIFFS, SITE_UTILITY, METER_ANNUAL_CONSUMPTION,
  CONSUMPTION_MONTHLY, MONTHS, METER_BUDGETS, type TariffStructure,
} from '@/lib/mockData'
import { useAppStore } from '@/lib/store'
import { MARKET_CONFIGS } from '@/types'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, Cell,
} from 'recharts'
import clsx from 'clsx'
import { Edit2, Check, X, Copy, ChevronDown, Download, RefreshCw } from 'lucide-react'
import { ChartCard } from '@/components/ChartCard'

type Tab = 'tariffs' | 'budget' | 'projections' | 'deviations' | 'cost-report'
const TABS: { id: Tab; label: string }[] = [
  { id:'tariffs',     label:'Tariffs'     },
  { id:'budget',      label:'Budget'      },
  { id:'projections', label:'Projections' },
  { id:'deviations',  label:'Deviations'  },
  { id:'cost-report', label:'Cost Report' },
]

const TT = { background:'#0d2b35', border:'1px solid #1a5568', borderRadius:8, fontSize:11 }

// ─── Cost report static data ──────────────────────────────────────────────────

const REPORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const ACTUAL_COUNT  = 5   // Jan–May are actuals, Jun–Dec are forecast

// Monthly kWh consumption
const CON_NORMAL = [324473,303011,317639,312178,311392,345305,361102,317892,336723,339431,313974,317543]
const CON_LOW    = [252614,213466,210126,233197,284486,262794,234861,249932,221536,217759,233854,242437]

// Monthly costs (AED)
const COST_NETWORK = [22345,20763,21987,21241,24372,23982,22748,22474,21858,22156,21535,21816]
const COST_ENTAX   = [40250,28097,24422,25203,25024,23463,24592,22319,21718,21266,20436,20609]
const COST_VAT     = [13145,10261, 9746, 9753,10373, 9964, 9941, 9406, 9151, 9119, 8814, 8909]
const COST_SUPPLY  = [   0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0]

// ─── Tariff editor ────────────────────────────────────────────────────────────

function TariffField({
  label, value, unit, onChange,
}: { label: string; value: number; unit: string; onChange: (v: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))
  return (
    <div className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0">
      <span className="text-xs text-white/50">{label}</span>
      <div className="flex items-center gap-1.5">
        {editing ? (
          <>
            <input autoFocus type="number" step="0.001" value={draft}
              onChange={e => setDraft(e.target.value)}
              className="w-20 bg-bg-primary border border-accent text-white text-xs px-2 py-1 rounded-lg focus:outline-none text-right font-mono" />
            <span className="text-xs text-white/40">{unit}</span>
            <button onClick={() => { onChange(Number(draft)); setEditing(false) }}
              className="text-success hover:text-success-light w-6 h-6 flex items-center justify-center rounded hover:bg-success/10">
              <Check size={12} />
            </button>
            <button onClick={() => { setDraft(String(value)); setEditing(false) }}
              className="text-white/30 hover:text-white/60 w-6 h-6 flex items-center justify-center rounded hover:bg-white/5">
              <X size={12} />
            </button>
          </>
        ) : (
          <>
            <span className="text-xs font-mono font-semibold text-white">{value.toFixed(3)}</span>
            <span className="text-xs text-white/40">{unit}</span>
            <button onClick={() => { setDraft(String(value)); setEditing(true) }}
              className="text-white/25 hover:text-accent w-6 h-6 flex items-center justify-center rounded hover:bg-white/5">
              <Edit2 size={11} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Tariffs tab ──────────────────────────────────────────────────────────────

function TariffsTab() {
  const { siteTariffs, setSiteTariff, applyTariffToSites } = useAppStore()
  const [selectedSite, setSelectedSite] = useState('site-1')
  const [applyMsg, setApplyMsg] = useState('')

  const site = MOCK_SITES.find(s => s.id === selectedSite)!
  const tariff: TariffStructure = siteTariffs[selectedSite] ?? UAE_TARIFFS[SITE_UTILITY[selectedSite]]
  const utility = SITE_UTILITY[selectedSite]
  const reference = UAE_TARIFFS[utility]

  const setField = (field: keyof TariffStructure) => (v: number) => {
    setSiteTariff(selectedSite, { ...tariff, [field]: v })
  }

  const sameCitySites = MOCK_SITES.filter(s => s.city === site.city).map(s => s.id)
  const allSites = MOCK_SITES.map(s => s.id)

  const doApply = (targets: string[]) => {
    applyTariffToSites(selectedSite, targets)
    setApplyMsg(`Tariff applied to ${targets.length === allSites.length ? 'all sites' : `all sites in ${site.city}`}.`)
    setTimeout(() => setApplyMsg(''), 3000)
  }

  const totalRate = tariff.commodity_elec + tariff.distribution
  const effectiveRate = totalRate * (1 + tariff.municipality_tax) * (1 + tariff.vat)
  const refRate = (reference.commodity_elec + reference.distribution) * (1 + reference.municipality_tax) * (1 + reference.vat)

  return (
    <div className="grid grid-cols-2 gap-5">
      <div className="space-y-4">
        <div>
          <div className="text-[11px] text-white/40 mb-1.5">Select site</div>
          <select value={selectedSite} onChange={e => setSelectedSite(e.target.value)} className="w-full form-select text-sm">
            {MOCK_SITES.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({SITE_UTILITY[s.id]})</option>
            ))}
          </select>
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white">{site.name}</div>
              <div className="text-[10px] text-white/35 mt-0.5">{utility} — {site.city}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-white/35">Effective rate</div>
              <div className={clsx('text-sm font-semibold font-mono',
                effectiveRate > refRate * 1.05 ? 'text-danger-light' : effectiveRate < refRate * 0.95 ? 'text-success-light' : 'text-white'
              )}>{effectiveRate.toFixed(4)} AED/kWh</div>
            </div>
          </div>
          <div className="px-4 py-1">
            <div className="text-[10px] text-white/30 uppercase tracking-widest py-2 border-b border-border-subtle mb-1">Commodity</div>
            <TariffField label="Electricity" value={tariff.commodity_elec} unit="AED/kWh" onChange={setField('commodity_elec')} />
            <TariffField label="Gas"         value={tariff.commodity_gas}  unit="AED/m³"  onChange={setField('commodity_gas')} />
            <div className="text-[10px] text-white/30 uppercase tracking-widest py-2 border-b border-border-subtle mb-1 mt-2">Non-Commodity</div>
            <TariffField label="Distribution / Network" value={tariff.distribution}    unit="AED/kWh"    onChange={setField('distribution')} />
            <TariffField label="Capacity charge"        value={tariff.capacity_charge} unit="AED/kW/mo"  onChange={setField('capacity_charge')} />
            <div className="text-[10px] text-white/30 uppercase tracking-widest py-2 border-b border-border-subtle mb-1 mt-2">Taxes</div>
            <TariffField label="Municipality tax" value={tariff.municipality_tax * 100} unit="%" onChange={v => setField('municipality_tax')(v / 100)} />
            <TariffField label="VAT"               value={tariff.vat * 100}             unit="%" onChange={v => setField('vat')(v / 100)} />
          </div>
        </div>

        <div className="card">
          <div className="text-xs font-semibold text-white mb-3 flex items-center gap-2">
            <Copy size={12} className="text-accent" /> Apply this tariff to…
          </div>
          {applyMsg && (
            <div className="mb-3 text-xs text-success-light bg-success/10 border border-success/20 rounded-lg px-3 py-2">✓ {applyMsg}</div>
          )}
          <div className="space-y-2">
            <button onClick={() => doApply(sameCitySites)} className="w-full btn-secondary text-left justify-between">
              All sites in {site.city} ({sameCitySites.length}) <Copy size={12} />
            </button>
            <button onClick={() => doApply(allSites)} className="w-full btn-secondary text-left justify-between">
              All sites in portfolio ({allSites.length}) <Copy size={12} />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card">
          <h3 className="text-xs font-semibold text-white mb-3">Your Tariff vs {utility} Published Rate</h3>
          <div className="space-y-2">
            {[
              { label:'Electricity', yours: tariff.commodity_elec, ref: reference.commodity_elec, unit:'AED/kWh' },
              { label:'Distribution', yours: tariff.distribution, ref: reference.distribution, unit:'AED/kWh' },
              { label:'Gas', yours: tariff.commodity_gas, ref: reference.commodity_gas, unit:'AED/m³' },
              { label:'Municipality tax', yours: tariff.municipality_tax*100, ref: reference.municipality_tax*100, unit:'%' },
            ].map(({ label, yours, ref, unit }) => {
              const diff = yours - ref
              const pct = ref > 0 ? ((diff/ref)*100).toFixed(1) : '0'
              return (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-32 text-[11px] text-white/50">{label}</div>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1 bg-bg-primary rounded-full overflow-hidden relative">
                      <div className="h-full bg-white/10 rounded-full" style={{ width:`${Math.min((ref/0.6)*100,100)}%` }} />
                      <div className="absolute top-0 h-full rounded-full" style={{
                        left:0, width:`${Math.min((yours/0.6)*100,100)}%`,
                        background: diff > 0.002 ? '#ef4444' : diff < -0.002 ? '#10b981' : '#3b82f6',
                        opacity:0.7,
                      }} />
                    </div>
                    <span className="text-xs font-mono text-white w-16 text-right">{yours.toFixed(3)} {unit}</span>
                    <span className={clsx('text-[10px] font-semibold w-14 text-right',
                      diff > 0.001 ? 'text-danger-light' : diff < -0.001 ? 'text-success-light' : 'text-white/40'
                    )}>{diff >= 0 ? '+' : ''}{pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border-subtle">
            <h3 className="text-xs font-semibold text-white">UAE Published Commercial Rates 2024</h3>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border-subtle">
                {['Utility','Elec (AED/kWh)','Gas (AED/m³)','Distribution','Mun. Tax'].map(h => (
                  <th key={h} className="tbl-th text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(UAE_TARIFFS).map(([key, t]) => (
                <tr key={key} className={clsx('border-b border-border-subtle hover:bg-bg-card/50', key === utility ? 'bg-accent/5' : '')}>
                  <td className="tbl-td font-semibold text-white/80">{t.label.split(' ')[0]}</td>
                  <td className="tbl-td font-mono text-white/70">{t.commodity_elec.toFixed(2)}</td>
                  <td className="tbl-td font-mono text-white/70">{t.commodity_gas.toFixed(2)}</td>
                  <td className="tbl-td font-mono text-white/60">{t.distribution.toFixed(3)}</td>
                  <td className="tbl-td font-mono text-white/60">{(t.municipality_tax*100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Budget tab ───────────────────────────────────────────────────────────────

function BudgetTab() {
  const totalBudget = METER_BUDGETS.reduce((sum, m) =>
    sum + m.monthly.reduce((s, mo) => s + mo.commodity_budget + mo.transport_budget + mo.tax_budget, 0), 0)
  const totalActual = METER_BUDGETS.reduce((sum, m) =>
    sum + m.monthly.reduce((s, mo) => s + mo.commodity_actual + mo.transport_actual + mo.tax_actual, 0), 0)
  const deviation = totalActual - totalBudget
  const pct = ((deviation / totalBudget) * 100).toFixed(1)

  const monthlyData = MONTHS.map((month, i) => {
    const budget = METER_BUDGETS.reduce((s, m) => { const mo = m.monthly[i]; return s + mo.commodity_budget + mo.transport_budget + mo.tax_budget }, 0)
    const actual = METER_BUDGETS.reduce((s, m) => { const mo = m.monthly[i]; return s + mo.commodity_actual + mo.transport_actual + mo.tax_actual }, 0)
    return { month, budget, actual, deviation: actual - budget }
  })

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <div className="card"><div className="label mb-1">Annual Budget</div><div className="text-xl font-semibold text-white">AED {(totalBudget/1000).toFixed(0)}k</div></div>
        <div className="card"><div className="label mb-1">YTD Actual</div><div className="text-xl font-semibold text-white">AED {(totalActual/1000).toFixed(0)}k</div></div>
        <div className="card">
          <div className="label mb-1">Deviation</div>
          <div className={clsx('text-xl font-semibold', deviation > 0 ? 'text-danger-light' : 'text-success-light')}>
            {deviation > 0 ? '+' : ''}AED {(deviation/1000).toFixed(0)}k
          </div>
          <div className="text-xs text-white/40 mt-0.5">{deviation > 0 ? '+' : ''}{pct}%</div>
        </div>
        <div className="card">
          <div className="label mb-1">Budget Coverage</div>
          <div className={clsx('text-xl font-semibold', totalActual/totalBudget > 1.05 ? 'text-danger-light' : 'text-success-light')}>
            {((totalActual/totalBudget)*100).toFixed(1)}%
          </div>
        </div>
      </div>

      <ChartCard
        title="Monthly Budget vs Actual (AED)"
        table={
          <table className="w-full">
            <thead><tr>{['Month','Budget (AED)','Actual (AED)','Deviation'].map(h=><th key={h} className="tbl-th">{h}</th>)}</tr></thead>
            <tbody>
              {monthlyData.map(row=>(
                <tr key={row.month} className="tbl-row">
                  <td className="tbl-td text-white/70">{row.month}</td>
                  <td className="tbl-td font-mono text-blue-300">{row.budget.toLocaleString()}</td>
                  <td className="tbl-td font-mono text-white/70">{row.actual.toLocaleString()}</td>
                  <td className={clsx('tbl-td font-mono font-semibold', row.deviation>0?'text-danger-light':'text-success-light')}>
                    {row.deviation>0?'+':''}{row.deviation.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      >
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyData} margin={{ top:5, right:20, left:-5, bottom:5 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis dataKey="month" tick={{ fill:'#5a6385', fontSize:10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill:'#5a6385', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={TT} formatter={(v: number, n: string) => [`AED ${v.toLocaleString()}`, n]} />
            <Legend wrapperStyle={{ fontSize:10 }} />
            <Bar dataKey="budget" name="Budget" fill="#3b82f6" opacity={0.3} radius={[3,3,0,0]} maxBarSize={28} />
            <Bar dataKey="actual" name="Actual" fill="#3b82f6" opacity={0.85} radius={[3,3,0,0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-border-subtle"><h2 className="section-title">Per-Meter Budget Summary</h2></div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border-subtle">
              {['Meter','Site','Type','Annual Budget (AED)','YTD Actual (AED)','Deviation','%'].map(h => (
                <th key={h} className="tbl-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METER_BUDGETS.map((m, i) => {
              const budget = m.monthly.reduce((s, mo) => s + mo.commodity_budget + mo.transport_budget + mo.tax_budget, 0)
              const actual = m.monthly.reduce((s, mo) => s + mo.commodity_actual + mo.transport_actual + mo.tax_actual, 0)
              const dev = actual - budget
              const p = ((dev/budget)*100).toFixed(1)
              return (
                <tr key={m.connection_id} className={clsx('border-b border-border-subtle hover:bg-bg-card/50', i%2===0 ? 'bg-[#0d3d4a]/30' : '')}>
                  <td className="tbl-td font-mono text-white/60 text-[10px]">{m.meter}</td>
                  <td className="tbl-td text-white/70 max-w-[130px] truncate">{m.site}</td>
                  <td className="tbl-td">
                    <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-full', m.type==='Electricity' ? 'bg-blue-500/15 text-blue-300' : 'bg-amber-500/15 text-amber-300')}>{m.type}</span>
                  </td>
                  <td className="tbl-td font-mono text-white/70 text-right">{budget.toLocaleString()}</td>
                  <td className="tbl-td font-mono text-white/70 text-right">{actual.toLocaleString()}</td>
                  <td className={clsx('tbl-td font-mono font-semibold text-right', dev>0 ? 'text-danger-light' : 'text-success-light')}>
                    {dev>0?'+':''}{dev.toLocaleString()}
                  </td>
                  <td className={clsx('tbl-td font-semibold text-right text-[10px]', dev>0 ? 'text-danger-light' : 'text-success-light')}>
                    {dev>0?'+':''}{p}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Projections tab ──────────────────────────────────────────────────────────

function ProjectionsTab() {
  const { siteTariffs } = useAppStore()

  const projData = MONTHS.map((month, i) => {
    const elecKwh = CONSUMPTION_MONTHLY.electricity[i]
    const gasM3   = CONSUMPTION_MONTHLY.gas[i]
    const sites = MOCK_SITES.map(s => siteTariffs[s.id] ?? UAE_TARIFFS[SITE_UTILITY[s.id]])
    const avgTariff = sites.reduce((a, t) => ({
      commodity_elec: a.commodity_elec + t.commodity_elec / sites.length,
      commodity_gas:  a.commodity_gas  + t.commodity_gas  / sites.length,
      distribution:   a.distribution   + t.distribution   / sites.length,
      municipality_tax: a.municipality_tax + t.municipality_tax / sites.length,
      vat:            a.vat            + t.vat            / sites.length,
      capacity_charge: a.capacity_charge + t.capacity_charge / sites.length,
    }), { commodity_elec:0, commodity_gas:0, distribution:0, municipality_tax:0, vat:0, capacity_charge:0 })

    const elecCommodity = Math.round(elecKwh * avgTariff.commodity_elec)
    const gasCommmodity = Math.round(gasM3   * avgTariff.commodity_gas)
    const transport     = Math.round(elecKwh * avgTariff.distribution)
    const subtotal      = elecCommodity + gasCommmodity + transport
    const tax           = Math.round(subtotal * avgTariff.municipality_tax)
    const vat           = Math.round((subtotal + tax) * avgTariff.vat)
    const total         = subtotal + tax + vat
    return { month, elecCommodity, gasCommmodity, transport, tax, vat, total }
  })

  const annualTotal = projData.reduce((s, d) => s + d.total, 0)
  const budgetTotal = METER_BUDGETS.reduce((s, m) => s + m.monthly.reduce((a, mo) => a + mo.commodity_budget + mo.transport_budget + mo.tax_budget, 0), 0)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <div className="label mb-1">Projected Annual Cost</div>
          <div className="text-xl font-semibold text-white">AED {(annualTotal/1000).toFixed(0)}k</div>
          <div className="text-xs text-white/40 mt-1">Based on current tariffs</div>
        </div>
        <div className="card">
          <div className="label mb-1">vs Annual Budget</div>
          <div className={clsx('text-xl font-semibold', annualTotal > budgetTotal ? 'text-danger-light' : 'text-success-light')}>
            {annualTotal > budgetTotal ? '+' : ''}AED {((annualTotal-budgetTotal)/1000).toFixed(0)}k
          </div>
          <div className="text-xs text-white/40 mt-1">{((annualTotal/budgetTotal-1)*100).toFixed(1)}% vs budget</div>
        </div>
        <div className="card">
          <div className="label mb-1">Peak Month Cost</div>
          <div className="text-xl font-semibold text-white">AED {Math.max(...projData.map(d=>d.total)).toLocaleString()}</div>
          <div className="text-xs text-white/40 mt-1">{projData.find(d => d.total === Math.max(...projData.map(x=>x.total)))?.month}</div>
        </div>
      </div>

      <ChartCard
        title="12-Month Cost Projection (AED)"
        subtitle="Stacked: Commodity + Transport/Network + Taxes"
        table={
          <table className="w-full">
            <thead><tr>{['Month','Elec Commodity','Gas Commodity','Transport','Tax','VAT','Total'].map(h=><th key={h} className="tbl-th">{h}</th>)}</tr></thead>
            <tbody>
              {projData.map(row=>(
                <tr key={row.month} className="tbl-row">
                  <td className="tbl-td text-white/70">{row.month}</td>
                  <td className="tbl-td font-mono text-blue-300">{row.elecCommodity.toLocaleString()}</td>
                  <td className="tbl-td font-mono text-amber-300">{row.gasCommmodity.toLocaleString()}</td>
                  <td className="tbl-td font-mono text-purple-300">{row.transport.toLocaleString()}</td>
                  <td className="tbl-td font-mono text-red-300">{row.tax.toLocaleString()}</td>
                  <td className="tbl-td font-mono text-white/50">{row.vat.toLocaleString()}</td>
                  <td className="tbl-td font-mono text-white font-semibold">{row.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      >
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={projData} margin={{ top:5, right:20, left:-5, bottom:5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis dataKey="month" tick={{ fill:'#5a6385', fontSize:10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill:'#5a6385', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={TT} formatter={(v: number, n: string) => [`AED ${v.toLocaleString()}`, n]} />
            <Legend wrapperStyle={{ fontSize:10 }} />
            <Bar dataKey="elecCommodity" name="Elec Commodity"     stackId="c" fill="#3b82f6" opacity={0.85} />
            <Bar dataKey="gasCommmodity" name="Gas Commodity"      stackId="c" fill="#f59e0b" opacity={0.85} />
            <Bar dataKey="transport"     name="Transport/Network"  stackId="c" fill="#8b5cf6" opacity={0.85} />
            <Bar dataKey="tax"           name="Tax"                stackId="c" fill="#ef4444" opacity={0.7} />
            <Bar dataKey="vat"           name="VAT"                stackId="c" fill="#6b7280" opacity={0.7} radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}

// ─── Deviations tab ───────────────────────────────────────────────────────────

function DeviationsTab() {
  const monthlyData = MONTHS.map((month, i) => {
    const budget = METER_BUDGETS.reduce((s, m) => { const mo = m.monthly[i]; return s + mo.commodity_budget + mo.transport_budget + mo.tax_budget }, 0)
    const actual = METER_BUDGETS.reduce((s, m) => { const mo = m.monthly[i]; return s + mo.commodity_actual + mo.transport_actual + mo.tax_actual }, 0)
    return { month, deviation: actual - budget, pct: ((actual - budget) / budget * 100) }
  })

  return (
    <div className="space-y-5">
      <ChartCard
        title="Monthly Deviation vs Budget (AED)"
        subtitle="Green = under budget · Red = over budget"
        table={
          <table className="w-full">
            <thead><tr>{['Month','Deviation (AED)','%'].map(h=><th key={h} className="tbl-th">{h}</th>)}</tr></thead>
            <tbody>
              {monthlyData.map(row=>(
                <tr key={row.month} className="tbl-row">
                  <td className="tbl-td text-white/70">{row.month}</td>
                  <td className={clsx('tbl-td font-mono font-semibold', row.deviation>0?'text-danger-light':'text-success-light')}>
                    {row.deviation>0?'+':''}{row.deviation.toLocaleString()}
                  </td>
                  <td className={clsx('tbl-td text-[11px] font-semibold', row.deviation>0?'text-danger-light':'text-success-light')}>
                    {row.deviation>0?'+':''}{row.pct.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      >
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={monthlyData} margin={{ top:5, right:20, left:-5, bottom:5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis dataKey="month" tick={{ fill:'#5a6385', fontSize:10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill:'#5a6385', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={TT} formatter={(v: number) => [`AED ${v.toLocaleString()}`, 'Deviation']} />
            <ReferenceLine y={0} stroke="#ffffff30" strokeWidth={1.5} />
            <Bar dataKey="deviation" name="Deviation" radius={[3,3,0,0]} maxBarSize={32}>
              {monthlyData.map((d, i) => (
                <Cell key={i} fill={d.deviation > 0 ? '#ef4444' : '#10b981'} opacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-border-subtle"><h2 className="section-title">Monthly Deviation Detail</h2></div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border-subtle">
              {['Month','Budget (AED)','Actual (AED)','Deviation (AED)','Deviation %','Status'].map(h => (
                <th key={h} className="tbl-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MONTHS.map((month, i) => {
              const budget = METER_BUDGETS.reduce((s, m) => { const mo = m.monthly[i]; return s + mo.commodity_budget + mo.transport_budget + mo.tax_budget }, 0)
              const actual = METER_BUDGETS.reduce((s, m) => { const mo = m.monthly[i]; return s + mo.commodity_actual + mo.transport_actual + mo.tax_actual }, 0)
              const dev = actual - budget
              const p = ((dev/budget)*100).toFixed(1)
              return (
                <tr key={month} className={clsx('border-b border-border-subtle hover:bg-bg-card/50', i%2===0 ? 'bg-[#0d3d4a]/30' : '')}>
                  <td className="tbl-td text-white/70 font-medium">{month}</td>
                  <td className="tbl-td font-mono text-white/60 text-right">{budget.toLocaleString()}</td>
                  <td className="tbl-td font-mono text-white/70 text-right">{actual.toLocaleString()}</td>
                  <td className={clsx('tbl-td font-mono font-semibold text-right', dev>0 ? 'text-danger-light' : 'text-success-light')}>
                    {dev>0?'+':''}{dev.toLocaleString()}
                  </td>
                  <td className={clsx('tbl-td text-right text-[10px] font-semibold', dev>0 ? 'text-danger-light' : 'text-success-light')}>
                    {dev>0?'+':''}{p}%
                  </td>
                  <td className="tbl-td">
                    <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-medium',
                      dev > 0.05*budget ? 'bg-danger/15 text-danger-light'
                        : dev < -0.02*budget ? 'bg-success/15 text-success-light'
                        : 'bg-white/10 text-white/50'
                    )}>
                      {dev > 0.05*budget ? 'Over budget' : dev < 0 ? 'Under budget' : 'On track'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Cost Report tab ──────────────────────────────────────────────────────────

interface CostReportFilters {
  product: 'electricity' | 'gas'
  year: string
  client: string
  department: string
  usageCat: string
  usageType: string
  costCenter: string
  savings: number
}

function CostReportTab({ filters, setFilters }: {
  filters: CostReportFilters
  setFilters: React.Dispatch<React.SetStateAction<CostReportFilters>>
}) {
  const factor = 1 - filters.savings / 100

  // Build chart data: actuals for first ACTUAL_COUNT months, forecast for rest
  const chartData = REPORT_MONTHS.map((m, i) => {
    const isActual = i < ACTUAL_COUNT
    const network   = Math.round(COST_NETWORK[i] * factor)
    const entax     = Math.round(COST_ENTAX[i]   * factor)
    const vat       = Math.round(COST_VAT[i]     * factor)
    const supply    = Math.round(COST_SUPPLY[i]  * factor)
    return {
      month: `${m} ${filters.year}`,
      // Actual series
      vat:     isActual ? vat     : 0,
      network: isActual ? network : 0,
      supply:  isActual ? supply  : 0,
      entax:   isActual ? entax   : 0,
      // Forecast series
      vat_v:     !isActual ? vat     : 0,
      network_v: !isActual ? network : 0,
      supply_v:  !isActual ? supply  : 0,
      entax_v:   !isActual ? entax   : 0,
    }
  })

  const yearTotal = REPORT_MONTHS.reduce((sum, _, i) =>
    sum + Math.round((COST_NETWORK[i] + COST_ENTAX[i] + COST_VAT[i] + COST_SUPPLY[i]) * factor), 0)

  const SERIES = [
    { key:'vat',     name:'VAT',                  color:'#ef4444' },
    { key:'network', name:'Network',               color:'#06b6d4' },
    { key:'supply',  name:'Supply',                color:'#10b981' },
    { key:'entax',   name:'Energy Tax + ODE',      color:'#374151' },
    { key:'vat_v',   name:'VAT (forecast)',         color:'#fca5a5' },
    { key:'network_v',name:'Network (forecast)',    color:'#a5f3fc' },
    { key:'supply_v', name:'Supply (forecast)',     color:'#6ee7b7' },
    { key:'entax_v',  name:'Energy Tax (forecast)', color:'#9ca3af' },
  ]

  return (
    <div className="space-y-5">
      {/* Title breadcrumb */}
      <div>
        <div className="text-[11px] text-white/35 mb-0.5">Financial Reports</div>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Cost Forecast Report</h2>
          <button className="flex items-center gap-1.5 text-xs border border-border-default text-white/60 hover:text-white px-3 py-1.5 rounded-lg transition-all">
            <Download size={12} /> Download
          </button>
        </div>
      </div>

      {/* Stacked bar chart */}
      <div className="card">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top:5, right:10, left:-5, bottom:5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis dataKey="month" tick={{ fill:'#5a6385', fontSize:10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill:'#5a6385', fontSize:10 }} axisLine={false} tickLine={false}
              tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
            <Tooltip
              contentStyle={TT}
              formatter={(v: number, name: string) => {
                const s = SERIES.find(s => s.key === name)
                return v > 0 ? [`AED ${v.toLocaleString()}`, s?.name ?? name] : null as unknown as [string, string]
              }}
            />
            <Legend
              wrapperStyle={{ fontSize:10, paddingTop:8 }}
              formatter={(v: string) => SERIES.find(s => s.key === v)?.name ?? v}
            />
            {SERIES.map(s => (
              <Bar key={s.key} dataKey={s.key} name={s.key} stackId="a"
                fill={s.color} opacity={0.9}
                radius={['entax','entax_v'].includes(s.key) ? [3,3,0,0] : [0,0,0,0]}
                maxBarSize={40}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly Consumption table */}
      <div>
        <div className="bg-accent px-4 py-2 rounded-t-lg">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Monthly Consumption (kWh)</h3>
        </div>
        <div className="card p-0 overflow-x-auto rounded-t-none border-t-0">
          <table className="w-full text-[11px] min-w-[900px]">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="tbl-th text-left w-24">Tariff</th>
                {REPORT_MONTHS.map(m => <th key={m} className="tbl-th text-right">{m}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border-subtle">
                <td className="tbl-td font-semibold" style={{ color:'#10b981' }}>Normal</td>
                {CON_NORMAL.map((v, i) => (
                  <td key={i} className="tbl-td text-right font-semibold" style={{ color: i < ACTUAL_COUNT ? '#10b981' : '#6ee7b7' }}>
                    {Math.round(v * factor).toLocaleString()}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-border-subtle">
                <td className="tbl-td text-white/70">Low</td>
                {CON_LOW.map((v, i) => (
                  <td key={i} className="tbl-td text-right text-white/60">
                    {Math.round(v * factor).toLocaleString()}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="tbl-td font-semibold text-white/80">Total</td>
                {CON_NORMAL.map((v, i) => (
                  <td key={i} className="tbl-td text-right font-semibold text-white/80">
                    {Math.round((v + CON_LOW[i]) * factor).toLocaleString()}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Costs table */}
      <div>
        <div className="bg-accent px-4 py-2 rounded-t-lg">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Monthly Costs (AED)</h3>
        </div>
        <div className="card p-0 overflow-x-auto rounded-t-none border-t-0">
          <table className="w-full text-[11px] min-w-[900px]">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="tbl-th text-left w-36">Cost type</th>
                {REPORT_MONTHS.map(m => <th key={m} className="tbl-th text-right">{m}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Normal',          values: Array(12).fill(0), color: '#10b981' },
                { label: 'Low',             values: Array(12).fill(0), color: '#ffffff99' },
                { label: 'Network',         values: COST_NETWORK,      color: '#06b6d4' },
                { label: 'Energy Tax',      values: COST_ENTAX,        color: '#ffffff99' },
                { label: 'VAT',             values: COST_VAT,          color: '#ef4444' },
              ].map(({ label, values, color }) => (
                <tr key={label} className="border-b border-border-subtle hover:bg-bg-card/30">
                  <td className="tbl-td font-semibold" style={{ color }}>{label}</td>
                  {values.map((v, i) => (
                    <td key={i} className="tbl-td text-right" style={{ color: v === 0 ? '#ffffff33' : color }}>
                      {v === 0 ? '0' : Math.round(v * factor).toLocaleString()}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-b border-border-default bg-bg-card/40">
                <td className="tbl-td font-bold text-white">Total</td>
                {REPORT_MONTHS.map((_, i) => (
                  <td key={i} className="tbl-td text-right font-bold text-white">
                    {Math.round((COST_NETWORK[i] + COST_ENTAX[i] + COST_VAT[i] + COST_SUPPLY[i]) * factor).toLocaleString()}
                  </td>
                ))}
              </tr>
              <tr className="bg-bg-secondary/60">
                <td className="tbl-td font-semibold text-accent-hover">Year total</td>
                <td className="tbl-td text-right font-bold text-accent-hover" colSpan={12}>
                  AED {yearTotal.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Report conditions notice */}
      <div className="text-[10px] text-white/30 leading-relaxed border border-border-subtle rounded-lg p-3 space-y-0.5">
        <div>· Forecasts are based on consumption from previous years</div>
        <div>· Network costs are calculated only for fully registered connections</div>
        <div>· Supply costs are based on supplier contracts</div>
        <div>· Energy tax is calculated based on tax clusters</div>
      </div>
    </div>
  )
}

// ─── Cost Report sidebar ──────────────────────────────────────────────────────

function CostReportSidebar({ filters, setFilters }: {
  filters: CostReportFilters
  setFilters: React.Dispatch<React.SetStateAction<CostReportFilters>>
}) {
  const set = <K extends keyof CostReportFilters>(key: K) => (val: CostReportFilters[K]) =>
    setFilters(f => ({ ...f, [key]: val }))

  return (
    <aside className="w-[220px] min-w-[220px] bg-bg-secondary border-r border-border-subtle flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <span className="text-sm font-semibold text-white">Search filter</span>
        <button
          onClick={() => setFilters({ product:'electricity', year:'2026', client:'', department:'', usageCat:'', usageType:'', costCenter:'', savings:0 })}
          className="text-white/30 hover:text-white/70 transition-colors"
          title="Reset filters"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      <div className="px-4 py-4 flex-1 space-y-5">

        {/* Product */}
        <div>
          <div className="text-[10px] font-semibold text-accent-hover uppercase tracking-widest mb-2 pb-1 border-b border-border-subtle">Product</div>
          {(['electricity','gas'] as const).map(p => (
            <label key={p} className="flex items-center gap-2 py-1 cursor-pointer group">
              <div className={clsx(
                'w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 transition-colors',
                filters.product === p ? 'border-accent bg-accent' : 'border-white/30 group-hover:border-white/60'
              )} onClick={() => set('product')(p)} />
              <span className="text-xs text-white/70 capitalize">{p}</span>
            </label>
          ))}
        </div>

        {/* Period */}
        <div>
          <div className="text-[10px] font-semibold text-accent-hover uppercase tracking-widest mb-2 pb-1 border-b border-border-subtle">Period</div>
          <select value={filters.year} onChange={e => set('year')(e.target.value)}
            className="w-full bg-bg-card border border-border-subtle text-white/70 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-accent">
            {['2024','2025','2026','2027'].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>

        {/* Client */}
        <div>
          <div className="text-[10px] font-semibold text-accent-hover uppercase tracking-widest mb-2 pb-1 border-b border-border-subtle">Client</div>
          <div className="text-[11px] text-white/40 mb-1">Client</div>
          <select value={filters.client} onChange={e => set('client')(e.target.value)}
            className="w-full bg-bg-card border border-border-subtle text-white/70 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-accent mb-2">
            <option value="">All clients</option>
            <option>Masdar City Group</option>
            <option>DEWA</option>
          </select>
          <div className="text-[11px] text-white/40 mb-1">Department</div>
          <select value={filters.department} onChange={e => set('department')(e.target.value)}
            className="w-full bg-bg-card border border-border-subtle text-white/70 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-accent">
            <option value="">All departments</option>
            <option>Real Estate</option>
            <option>Operations</option>
            <option>Construction</option>
          </select>
        </div>

        {/* Object */}
        <div>
          <div className="text-[10px] font-semibold text-accent-hover uppercase tracking-widest mb-2 pb-1 border-b border-border-subtle">Object</div>
          <div className="text-[11px] text-white/40 mb-1">Usage category</div>
          <select value={filters.usageCat} onChange={e => set('usageCat')(e.target.value)}
            className="w-full bg-bg-card border border-border-subtle text-white/70 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-accent mb-2">
            <option value="">Select</option>
            <option>Office</option>
            <option>Industrial</option>
            <option>Residential</option>
          </select>
          <div className="text-[11px] text-white/40 mb-1">Usage type</div>
          <select value={filters.usageType} onChange={e => set('usageType')(e.target.value)}
            className="w-full bg-bg-card border border-border-subtle text-white/70 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-accent">
            <option value="">Select</option>
            <option>Standard</option>
            <option>Large user</option>
          </select>
        </div>

        {/* Other */}
        <div>
          <div className="text-[10px] font-semibold text-accent-hover uppercase tracking-widest mb-2 pb-1 border-b border-border-subtle">Other</div>
          <div className="text-[11px] text-white/40 mb-1">Cost center</div>
          <div className="text-xs text-white/50 py-1 mb-2 border-b border-border-subtle">All cost centers</div>
          <div className="text-[11px] text-white/40 mb-1">Tax cluster</div>
          <select className="w-full bg-bg-card border border-border-subtle text-white/70 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-accent">
            <option value="">Select</option>
            <option>VAT-5</option>
            <option>VAT-0</option>
          </select>
        </div>

        {/* Savings */}
        <div>
          <div className="text-[10px] font-semibold text-accent-hover uppercase tracking-widest mb-2 pb-1 border-b border-border-subtle">Savings</div>
          <div className="text-[11px] text-white/40 mb-1">Savings (%)</div>
          <input
            type="number" min={0} max={50} step={0.5}
            value={filters.savings}
            onChange={e => set('savings')(Number(e.target.value))}
            className="w-full bg-bg-card border border-border-subtle text-white/70 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-accent font-mono"
          />
          {filters.savings > 0 && (
            <div className="mt-1.5 text-[10px] text-success-light">
              Applying {filters.savings}% saving factor to all costs
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="p-3 border-t border-border-subtle space-y-2">
        <button className="w-full btn-primary text-xs py-2 flex items-center justify-center gap-1.5">
          Show report
        </button>
        <button className="w-full btn-secondary text-xs py-2 flex items-center justify-center gap-1.5">
          <Download size={12} /> Download
        </button>
      </div>
    </aside>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Financials() {
  const [tab, setTab] = useState<Tab>('tariffs')
  const [costFilters, setCostFilters] = useState<CostReportFilters>({
    product: 'electricity', year: '2026', client: '', department: '',
    usageCat: '', usageType: '', costCenter: '', savings: 0,
  })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Financials" subtitle="Tariffs · budget · projections · deviations" />

      {/* Tabs row — fixed above content */}
      <div className="flex-shrink-0 px-6 pt-4 pb-0 border-b border-border-subtle">
        <div className="flex items-center gap-1 bg-bg-secondary border border-border-subtle rounded-xl p-1 w-fit mb-4">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={clsx(
                'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                tab === t.id ? 'bg-accent text-white shadow' : 'text-white/40 hover:text-white/70'
              )}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content area */}
      {tab === 'cost-report' ? (
        <div className="flex flex-1 overflow-hidden">
          <CostReportSidebar filters={costFilters} setFilters={setCostFilters} />
          <div className="flex-1 overflow-y-auto p-6">
            <CostReportTab filters={costFilters} setFilters={setCostFilters} />
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'tariffs'     && <TariffsTab />}
          {tab === 'budget'      && <BudgetTab />}
          {tab === 'projections' && <ProjectionsTab />}
          {tab === 'deviations'  && <DeviationsTab />}
        </div>
      )}
    </div>
  )
}
