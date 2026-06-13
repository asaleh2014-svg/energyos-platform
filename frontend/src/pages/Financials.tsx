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
import { Edit2, Check, X, Copy, ChevronDown } from 'lucide-react'

type Tab = 'tariffs' | 'budget' | 'projections' | 'deviations'
const TABS: { id: Tab; label: string }[] = [
  { id:'tariffs',     label:'Tariffs'     },
  { id:'budget',      label:'Budget'      },
  { id:'projections', label:'Projections' },
  { id:'deviations',  label:'Deviations'  },
]

const TT = { background:'#0d2b35', border:'1px solid #1a5568', borderRadius:8, fontSize:11 }

// ─── Tariff editor row ────────────────────────────────────────────────────────
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
            <input
              autoFocus
              type="number" step="0.001" value={draft}
              onChange={e => setDraft(e.target.value)}
              className="w-20 bg-bg-primary border border-accent text-white text-xs px-2 py-1 rounded-lg focus:outline-none text-right font-mono"
            />
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
  const [applyTarget, setApplyTarget] = useState<'city' | 'all' | null>(null)
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
    const label = targets.length === allSites.length ? 'all sites'
      : `all sites in ${site.city}`
    setApplyMsg(`Tariff applied to ${label}.`)
    setApplyTarget(null)
    setTimeout(() => setApplyMsg(''), 3000)
  }

  const totalRate = tariff.commodity_elec + tariff.distribution
  const effectiveRate = totalRate * (1 + tariff.municipality_tax) * (1 + tariff.vat)
  const refRate = (reference.commodity_elec + reference.distribution) * (1 + reference.municipality_tax) * (1 + reference.vat)

  return (
    <div className="grid grid-cols-2 gap-5">
      {/* Site selector + tariff editor */}
      <div className="space-y-4">
        <div>
          <div className="text-[11px] text-white/40 mb-1.5">Select site</div>
          <select value={selectedSite} onChange={e => setSelectedSite(e.target.value)}
            className="w-full form-select text-sm">
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
              )}>
                {effectiveRate.toFixed(4)} AED/kWh
              </div>
            </div>
          </div>
          <div className="px-4 py-1">
            <div className="text-[10px] text-white/30 uppercase tracking-widest py-2 border-b border-border-subtle mb-1">Commodity</div>
            <TariffField label="Electricity" value={tariff.commodity_elec} unit="AED/kWh" onChange={setField('commodity_elec')} />
            <TariffField label="Gas" value={tariff.commodity_gas} unit="AED/m³" onChange={setField('commodity_gas')} />
            <div className="text-[10px] text-white/30 uppercase tracking-widest py-2 border-b border-border-subtle mb-1 mt-2">Non-Commodity</div>
            <TariffField label="Distribution / Network" value={tariff.distribution} unit="AED/kWh" onChange={setField('distribution')} />
            <TariffField label="Capacity charge" value={tariff.capacity_charge} unit="AED/kW/mo" onChange={setField('capacity_charge')} />
            <div className="text-[10px] text-white/30 uppercase tracking-widest py-2 border-b border-border-subtle mb-1 mt-2">Taxes</div>
            <TariffField label="Municipality tax" value={tariff.municipality_tax * 100} unit="%" onChange={v => setField('municipality_tax')(v / 100)} />
            <TariffField label="VAT" value={tariff.vat * 100} unit="%" onChange={v => setField('vat')(v / 100)} />
          </div>
        </div>

        {/* Apply to other levels */}
        <div className="card">
          <div className="text-xs font-semibold text-white mb-3 flex items-center gap-2">
            <Copy size={12} className="text-accent" /> Apply this tariff to…
          </div>
          {applyMsg && (
            <div className="mb-3 text-xs text-success-light bg-success/10 border border-success/20 rounded-lg px-3 py-2">✓ {applyMsg}</div>
          )}
          <div className="space-y-2">
            <button onClick={() => doApply(sameCitySites)}
              className="w-full btn-secondary text-left justify-between">
              All sites in {site.city} ({sameCitySites.length})
              <Copy size={12} />
            </button>
            <button onClick={() => doApply(allSites)}
              className="w-full btn-secondary text-left justify-between">
              All sites in portfolio ({allSites.length})
              <Copy size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Right: comparison + utility standards */}
      <div className="space-y-4">
        {/* Comparison vs utility standard */}
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
                        left: 0, width:`${Math.min((yours/0.6)*100,100)}%`,
                        background: diff > 0.002 ? '#ef4444' : diff < -0.002 ? '#10b981' : '#3b82f6',
                        opacity: 0.7,
                      }} />
                    </div>
                    <span className="text-xs font-mono text-white w-16 text-right">{yours.toFixed(3)} {unit}</span>
                    <span className={clsx('text-[10px] font-semibold w-14 text-right',
                      diff > 0.001 ? 'text-danger-light' : diff < -0.001 ? 'text-success-light' : 'text-white/40'
                    )}>
                      {diff >= 0 ? '+' : ''}{pct}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* UAE utility tariff reference table */}
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border-subtle">
            <h3 className="text-xs font-semibold text-white">UAE Published Commercial Rates 2024</h3>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border-subtle">
                {['Utility', 'Elec (AED/kWh)', 'Gas (AED/m³)', 'Distribution', 'Mun. Tax'].map(h => (
                  <th key={h} className="tbl-th text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(UAE_TARIFFS).map(([key, t]) => (
                <tr key={key} className={clsx(
                  'border-b border-border-subtle hover:bg-bg-card/50',
                  key === utility ? 'bg-accent/5' : ''
                )}>
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

// ─── Budget tab (summary of existing budget data) ─────────────────────────────
function BudgetTab() {
  const totalBudget = METER_BUDGETS.reduce((sum, m) => {
    return sum + m.monthly.reduce((s, mo) => s + mo.commodity_budget + mo.transport_budget + mo.tax_budget, 0)
  }, 0)
  const totalActual = METER_BUDGETS.reduce((sum, m) => {
    return sum + m.monthly.reduce((s, mo) => s + mo.commodity_actual + mo.transport_actual + mo.tax_actual, 0)
  }, 0)
  const deviation = totalActual - totalBudget
  const pct = ((deviation / totalBudget) * 100).toFixed(1)

  const monthlyData = MONTHS.map((month, i) => {
    const budget = METER_BUDGETS.reduce((s, m) => {
      const mo = m.monthly[i]
      return s + mo.commodity_budget + mo.transport_budget + mo.tax_budget
    }, 0)
    const actual = METER_BUDGETS.reduce((s, m) => {
      const mo = m.monthly[i]
      return s + mo.commodity_actual + mo.transport_actual + mo.tax_actual
    }, 0)
    return { month, budget, actual, deviation: actual - budget }
  })

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card">
          <div className="label mb-1">Annual Budget</div>
          <div className="text-xl font-semibold text-white">AED {(totalBudget/1000).toFixed(0)}k</div>
        </div>
        <div className="card">
          <div className="label mb-1">YTD Actual</div>
          <div className="text-xl font-semibold text-white">AED {(totalActual/1000).toFixed(0)}k</div>
        </div>
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

      {/* Monthly budget vs actual */}
      <div className="card">
        <h2 className="section-title mb-4">Monthly Budget vs Actual (AED)</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyData} margin={{ top:5, right:20, left:-5, bottom:5 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis dataKey="month" tick={{ fill:'#5a6385', fontSize:10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill:'#5a6385', fontSize:10 }} axisLine={false} tickLine={false}
              tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={TT} formatter={(v: number, n: string) => [`AED ${v.toLocaleString()}`, n]} />
            <Legend wrapperStyle={{ fontSize:10 }} />
            <Bar dataKey="budget" name="Budget" fill="#3b82f6" opacity={0.3} radius={[3,3,0,0]} maxBarSize={28} />
            <Bar dataKey="actual" name="Actual" fill="#3b82f6" opacity={0.85} radius={[3,3,0,0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Per-meter breakdown table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-border-subtle">
          <h2 className="section-title">Per-Meter Budget Summary</h2>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border-subtle">
              {['Meter', 'Site', 'Type', 'Annual Budget (AED)', 'YTD Actual (AED)', 'Deviation', '%'].map(h => (
                <th key={h} className="tbl-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METER_BUDGETS.map((m, i) => {
              const budget = m.monthly.reduce((s, mo) => s + mo.commodity_budget + mo.transport_budget + mo.tax_budget, 0)
              const actual = m.monthly.reduce((s, mo) => s + mo.commodity_actual + mo.transport_actual + mo.tax_actual, 0)
              const dev = actual - budget
              const pct = ((dev/budget)*100).toFixed(1)
              return (
                <tr key={m.connection_id} className={clsx(
                  'border-b border-border-subtle hover:bg-bg-card/50',
                  i % 2 === 0 ? 'bg-[#0d3d4a]/30' : ''
                )}>
                  <td className="tbl-td font-mono text-white/60 text-[10px]">{m.meter}</td>
                  <td className="tbl-td text-white/70 max-w-[130px] truncate">{m.site}</td>
                  <td className="tbl-td">
                    <span className={clsx(
                      'text-[10px] px-1.5 py-0.5 rounded-full',
                      m.type === 'Electricity' ? 'bg-blue-500/15 text-blue-300' : 'bg-amber-500/15 text-amber-300'
                    )}>{m.type}</span>
                  </td>
                  <td className="tbl-td font-mono text-white/70 text-right">{budget.toLocaleString()}</td>
                  <td className="tbl-td font-mono text-white/70 text-right">{actual.toLocaleString()}</td>
                  <td className={clsx('tbl-td font-mono font-semibold text-right', dev > 0 ? 'text-danger-light' : 'text-success-light')}>
                    {dev > 0 ? '+' : ''}{dev.toLocaleString()}
                  </td>
                  <td className={clsx('tbl-td font-semibold text-right text-[10px]', dev > 0 ? 'text-danger-light' : 'text-success-light')}>
                    {dev > 0 ? '+' : ''}{pct}%
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

  // Project next 12 months cost using current tariffs + seasonal consumption
  const projData = MONTHS.map((month, i) => {
    const elecKwh = CONSUMPTION_MONTHLY.electricity[i]
    const gasM3   = CONSUMPTION_MONTHLY.gas[i]

    // Weighted average tariff across sites
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
          <div className="text-xl font-semibold text-white">
            AED {Math.max(...projData.map(d=>d.total)).toLocaleString()}
          </div>
          <div className="text-xs text-white/40 mt-1">
            {projData.find(d => d.total === Math.max(...projData.map(x=>x.total)))?.month}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title mb-1">12-Month Cost Projection (AED)</h2>
        <p className="text-xs text-white/30 mb-4">Stacked: Commodity + Transport/Network + Taxes</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={projData} margin={{ top:5, right:20, left:-5, bottom:5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis dataKey="month" tick={{ fill:'#5a6385', fontSize:10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill:'#5a6385', fontSize:10 }} axisLine={false} tickLine={false}
              tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={TT}
              formatter={(v: number, n: string) => [`AED ${v.toLocaleString()}`, n]} />
            <Legend wrapperStyle={{ fontSize:10 }} />
            <Bar dataKey="elecCommodity" name="Elec Commodity" stackId="c" fill="#3b82f6" opacity={0.85} />
            <Bar dataKey="gasCommmodity" name="Gas Commodity"  stackId="c" fill="#f59e0b" opacity={0.85} />
            <Bar dataKey="transport"     name="Transport / Network" stackId="c" fill="#8b5cf6" opacity={0.85} />
            <Bar dataKey="tax"           name="Tax"            stackId="c" fill="#ef4444"  opacity={0.7} />
            <Bar dataKey="vat"           name="VAT"            stackId="c" fill="#6b7280"  opacity={0.7} radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Deviations tab ───────────────────────────────────────────────────────────
function DeviationsTab() {
  const monthlyData = MONTHS.map((month, i) => {
    const budget = METER_BUDGETS.reduce((s, m) => {
      const mo = m.monthly[i]
      return s + mo.commodity_budget + mo.transport_budget + mo.tax_budget
    }, 0)
    const actual = METER_BUDGETS.reduce((s, m) => {
      const mo = m.monthly[i]
      return s + mo.commodity_actual + mo.transport_actual + mo.tax_actual
    }, 0)
    return { month, deviation: actual - budget, pct: ((actual - budget) / budget * 100) }
  })

  return (
    <div className="space-y-5">
      <div className="card">
        <h2 className="section-title mb-1">Monthly Deviation vs Budget (AED)</h2>
        <p className="text-xs text-white/30 mb-4">Green = under budget · Red = over budget</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={monthlyData} margin={{ top:5, right:20, left:-5, bottom:5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis dataKey="month" tick={{ fill:'#5a6385', fontSize:10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill:'#5a6385', fontSize:10 }} axisLine={false} tickLine={false}
              tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={TT}
              formatter={(v: number) => [`AED ${v.toLocaleString()}`, 'Deviation']} />
            <ReferenceLine y={0} stroke="#ffffff30" strokeWidth={1.5} />
            <Bar dataKey="deviation" name="Deviation" radius={[3,3,0,0]} maxBarSize={32}>
              {monthlyData.map((d, i) => (
                <Cell key={i} fill={d.deviation > 0 ? '#ef4444' : '#10b981'} opacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-border-subtle">
          <h2 className="section-title">Monthly Deviation Detail</h2>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border-subtle">
              {['Month', 'Budget (AED)', 'Actual (AED)', 'Deviation (AED)', 'Deviation %', 'Status'].map(h => (
                <th key={h} className="tbl-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MONTHS.map((month, i) => {
              const budget = METER_BUDGETS.reduce((s, m) => {
                const mo = m.monthly[i]
                return s + mo.commodity_budget + mo.transport_budget + mo.tax_budget
              }, 0)
              const actual = METER_BUDGETS.reduce((s, m) => {
                const mo = m.monthly[i]
                return s + mo.commodity_actual + mo.transport_actual + mo.tax_actual
              }, 0)
              const dev = actual - budget
              const pct = ((dev/budget)*100).toFixed(1)
              return (
                <tr key={month} className={clsx(
                  'border-b border-border-subtle hover:bg-bg-card/50',
                  i % 2 === 0 ? 'bg-[#0d3d4a]/30' : ''
                )}>
                  <td className="tbl-td text-white/70 font-medium">{month}</td>
                  <td className="tbl-td font-mono text-white/60 text-right">{budget.toLocaleString()}</td>
                  <td className="tbl-td font-mono text-white/70 text-right">{actual.toLocaleString()}</td>
                  <td className={clsx('tbl-td font-mono font-semibold text-right', dev > 0 ? 'text-danger-light' : 'text-success-light')}>
                    {dev > 0 ? '+' : ''}{dev.toLocaleString()}
                  </td>
                  <td className={clsx('tbl-td text-right text-[10px] font-semibold', dev > 0 ? 'text-danger-light' : 'text-success-light')}>
                    {dev > 0 ? '+' : ''}{pct}%
                  </td>
                  <td className="tbl-td">
                    <span className={clsx(
                      'text-[10px] px-2 py-0.5 rounded-full font-medium',
                      dev > 0.05 * budget ? 'bg-danger/15 text-danger-light'
                        : dev < -0.02 * budget ? 'bg-success/15 text-success-light'
                        : 'bg-white/10 text-white/50'
                    )}>
                      {dev > 0.05 * budget ? 'Over budget' : dev < 0 ? 'Under budget' : 'On track'}
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

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Financials() {
  const [tab, setTab] = useState<Tab>('tariffs')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Financials" subtitle="Tariffs · budget · projections · deviations" />
      <div className="flex-1 overflow-y-auto p-6">

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 bg-bg-secondary border border-border-subtle rounded-xl p-1 w-fit">
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

        {tab === 'tariffs'     && <TariffsTab />}
        {tab === 'budget'      && <BudgetTab />}
        {tab === 'projections' && <ProjectionsTab />}
        {tab === 'deviations'  && <DeviationsTab />}

      </div>
    </div>
  )
}
