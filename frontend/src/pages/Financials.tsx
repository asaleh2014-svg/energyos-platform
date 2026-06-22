import { useState, useEffect, useMemo } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useAppStore } from '@/lib/store'
import { MARKET_CONFIGS , getMarketConfig } from '@/types'
import { useTenantId } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { fetchConnections, fetchConsumption, groupByMonth } from '@/lib/dbQueries'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, Cell,
} from 'recharts'
import clsx from 'clsx'
import { Edit2, Check, X, Copy, ChevronDown, Download, RefreshCw, Loader2 } from 'lucide-react'
import { ChartCard } from '@/components/ChartCard'

type Tab = 'tariffs' | 'cost-summary' | 'deviations' | 'cost-report'
const TABS: { id: Tab; label: string }[] = [
  { id:'tariffs',      label:'Tariffs'      },
  { id:'cost-summary', label:'Cost Summary' },
  { id:'deviations',   label:'Deviations'   },
  { id:'cost-report',  label:'Cost Report'  },
]

const TT = { background:'#0d2b35', border:'1px solid #1a5568', borderRadius:8, fontSize:11 }
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ─── UAE Tariff data (reference) ──────────────────────────────────────────────
const UAE_TARIFFS: Record<string, {
  label: string; commodity_elec: number; commodity_gas: number;
  distribution: number; capacity_charge: number; municipality_tax: number; vat: number
}> = {
  DEWA: { label:'DEWA (Dubai)',       commodity_elec:0.23, commodity_gas:0.29, distribution:0.067, capacity_charge:0.0, municipality_tax:0.10, vat:0.05 },
  ADDC: { label:'ADDC (Abu Dhabi)',   commodity_elec:0.21, commodity_gas:0.25, distribution:0.055, capacity_charge:0.0, municipality_tax:0.05, vat:0.05 },
  SEWA: { label:'SEWA (Sharjah)',     commodity_elec:0.19, commodity_gas:0.22, distribution:0.048, capacity_charge:0.0, municipality_tax:0.10, vat:0.05 },
  FEWA: { label:'FEWA (N. Emirates)', commodity_elec:0.17, commodity_gas:0.20, distribution:0.042, capacity_charge:0.0, municipality_tax:0.05, vat:0.05 },
}

type TariffStructure = Omit<typeof UAE_TARIFFS[string], 'label'> & { label?: string }

// ─── Tariff field editor ──────────────────────────────────────────────────────
function TariffField({
  label, value, unit, onChange,
}: { label: string; value: number; unit: string; onChange: (v: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(String(value))
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
function TariffsTab({ tenantId }: { tenantId: string }) {
  const { siteTariffs, setSiteTariff, applyTariffToSites } = useAppStore()
  const [sites, setSites]         = useState<any[]>([])
  const [selectedSite, setSelectedSite] = useState('')
  const [applyMsg, setApplyMsg]   = useState('')

  useEffect(() => {
    fetchConnections(tenantId).then(conns => {
      // deduplicate site names
      const unique: Record<string, any> = {}
      for (const c of conns) {
        if (c.site_id && !unique[c.site_id]) unique[c.site_id] = { id: c.site_id, name: c.site_name ?? c.site_id }
      }
      const arr = Object.values(unique)
      setSites(arr)
      if (arr.length > 0 && !selectedSite) setSelectedSite(arr[0].id)
    })
  }, [tenantId])

  const site       = sites.find(s => s.id === selectedSite) ?? { name: '—', id: selectedSite }
  const defaultT   = UAE_TARIFFS.DEWA
  const tariff: TariffStructure = siteTariffs[selectedSite] ?? defaultT
  const reference  = UAE_TARIFFS.DEWA

  const setField = (field: keyof TariffStructure) => (v: number) => {
    setSiteTariff(selectedSite, { ...tariff, [field]: v })
  }

  const totalRate     = tariff.commodity_elec + tariff.distribution
  const effectiveRate = totalRate * (1 + tariff.municipality_tax) * (1 + tariff.vat)
  const refRate       = (reference.commodity_elec + reference.distribution) * (1 + reference.municipality_tax) * (1 + reference.vat)

  const doApply = (targets: string[]) => {
    applyTariffToSites(selectedSite, targets)
    setApplyMsg(`Tariff applied to ${targets.length} site${targets.length !== 1 ? 's' : ''}.`)
    setTimeout(() => setApplyMsg(''), 3000)
  }

  return (
    <div className="grid grid-cols-2 gap-5">
      <div className="space-y-4">
        <div>
          <div className="text-[11px] text-white/40 mb-1.5">Select site</div>
          <select value={selectedSite} onChange={e => setSelectedSite(e.target.value)} className="w-full form-select text-sm">
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white">{site.name}</div>
              <div className="text-[10px] text-white/35 mt-0.5">DEWA UAE</div>
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
            <TariffField label="Distribution / Network" value={tariff.distribution}    unit="AED/kWh"   onChange={setField('distribution')} />
            <TariffField label="Capacity charge"        value={tariff.capacity_charge} unit="AED/kW/mo" onChange={setField('capacity_charge')} />
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
            <button onClick={() => doApply(sites.map(s => s.id))} className="w-full btn-secondary text-left justify-between">
              All sites in portfolio ({sites.length}) <Copy size={12} />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
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
                <tr key={key} className="border-b border-border-subtle hover:bg-bg-card/50">
                  <td className="tbl-td font-semibold text-white/80">{key}</td>
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

// ─── Cost Summary tab ─────────────────────────────────────────────────────────
function CostSummaryTab({ tenantId, currencySymbol }: { tenantId: string; currencySymbol: string }) {
  const [loading, setLoading]   = useState(true)
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [siteCosts,  setSiteCosts]    = useState<any[]>([])
  const [totalCost,  setTotalCost]    = useState(0)
  const [totalElec,  setTotalElec]    = useState(0)
  const [totalGas,   setTotalGas]     = useState(0)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [records, conns] = await Promise.all([
        fetchConsumption(tenantId),
        fetchConnections(tenantId),
      ])

      // Monthly totals
      const monthly = groupByMonth(records)
      const mData = monthly.map(m => ({
        month: new Date(m.month + '-01').toLocaleString('default', { month:'short', year:'2-digit' }),
        electricity: Math.round(m.cost * (m.elec / (m.elec + m.gas || 1))),
        gas:         Math.round(m.cost * (m.gas  / (m.elec + m.gas || 1))),
        total:       Math.round(m.cost),
      }))
      setMonthlyData(mData)

      // Site costs
      const connMap: Record<string, string> = {}
      for (const c of conns) connMap[c.id] = c.site_name ?? 'Unknown'

      const siteCostMap: Record<string, number> = {}
      for (const r of records) {
        const site = connMap[r.connection_id] ?? 'Unknown'
        siteCostMap[site] = (siteCostMap[site] ?? 0) + Number(r.cost ?? 0)
      }
      const sArr = Object.entries(siteCostMap)
        .map(([site, cost]) => ({ site, cost: Math.round(cost) }))
        .sort((a, b) => b.cost - a.cost)
      setSiteCosts(sArr)

      const tCost = records.reduce((a, r) => a + Number(r.cost ?? 0), 0)
      const tElec = records.filter(r => r.unit === 'kWh').reduce((a, r) => a + Number(r.cost ?? 0), 0)
      const tGas  = records.filter(r => r.unit !== 'kWh').reduce((a, r) => a + Number(r.cost ?? 0), 0)
      setTotalCost(tCost)
      setTotalElec(tElec)
      setTotalGas(tGas)
      setLoading(false)
    }
    load()
  }, [tenantId])

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={20} className="animate-spin text-white/30"/></div>

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <div className="label mb-1">Total Cost</div>
          <div className="text-xl font-semibold text-white">{currencySymbol} {Math.round(totalCost).toLocaleString()}</div>
          <div className="text-xs text-white/40 mt-1">All records in DB</div>
        </div>
        <div className="card">
          <div className="label mb-1">Electricity Cost</div>
          <div className="text-xl font-semibold text-blue-300">{currencySymbol} {Math.round(totalElec).toLocaleString()}</div>
          <div className="text-xs text-white/40 mt-1">{totalCost > 0 ? ((totalElec/totalCost)*100).toFixed(1) : 0}% of total</div>
        </div>
        <div className="card">
          <div className="label mb-1">Gas Cost</div>
          <div className="text-xl font-semibold text-amber-300">{currencySymbol} {Math.round(totalGas).toLocaleString()}</div>
          <div className="text-xs text-white/40 mt-1">{totalCost > 0 ? ((totalGas/totalCost)*100).toFixed(1) : 0}% of total</div>
        </div>
      </div>

      <ChartCard
        title="Monthly Cost Trend (AED)"
        subtitle="From real consumption_records — electricity vs gas cost split"
        table={
          <table className="w-full">
            <thead><tr>{['Month','Electricity','Gas','Total'].map(h=><th key={h} className="tbl-th">{h}</th>)}</tr></thead>
            <tbody>
              {monthlyData.map(row=>(
                <tr key={row.month} className="tbl-row">
                  <td className="tbl-td text-white/70">{row.month}</td>
                  <td className="tbl-td font-mono text-blue-300">{row.electricity.toLocaleString()}</td>
                  <td className="tbl-td font-mono text-amber-300">{row.gas.toLocaleString()}</td>
                  <td className="tbl-td font-mono text-white font-semibold">{row.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      >
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyData} margin={{ top:5, right:20, left:-5, bottom:5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis dataKey="month" tick={{ fill:'#5a6385', fontSize:10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill:'#5a6385', fontSize:10 }} axisLine={false} tickLine={false}
              tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={TT} formatter={(v: number, n: string) => [`${currencySymbol} ${v.toLocaleString()}`, n === 'electricity' ? 'Electricity' : 'Gas']} />
            <Legend wrapperStyle={{ fontSize:10 }} formatter={v => v === 'electricity' ? 'Electricity' : 'Gas'} />
            <Bar dataKey="electricity" name="electricity" stackId="a" fill="#3b82f6" opacity={0.85} radius={[0,0,0,0]} maxBarSize={32} />
            <Bar dataKey="gas"         name="gas"         stackId="a" fill="#f59e0b" opacity={0.85} radius={[3,3,0,0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {siteCosts.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-border-subtle">
            <h2 className="section-title">Cost by Site</h2>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border-subtle">
                {['Site','Total Cost (AED)','% of Portfolio'].map(h => <th key={h} className="tbl-th">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {siteCosts.map((s, i) => (
                <tr key={s.site} className={clsx('border-b border-border-subtle hover:bg-bg-card/50', i%2===0 ? 'bg-[#0d3d4a]/30' : '')}>
                  <td className="tbl-td text-white/80 font-medium">{s.site}</td>
                  <td className="tbl-td font-mono text-white/70 text-right">{s.cost.toLocaleString()}</td>
                  <td className="tbl-td text-white/50 text-right">
                    {totalCost > 0 ? ((s.cost / totalCost) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Deviations tab ───────────────────────────────────────────────────────────
function DeviationsTab({ tenantId, currencySymbol }: { tenantId: string; currencySymbol: string }) {
  const [loading,  setLoading]  = useState(true)
  const [monthly,  setMonthly]  = useState<any[]>([])
  const [year,     setYear]     = useState(2025)

  useEffect(() => {
    async function load() {
      setLoading(true)
      // Fetch budgets and actuals for the year
      const [budgetsRaw, recordsRaw] = await Promise.all([
        supabase.from('budgets').select('*').eq('tenant_id', tenantId).eq('year', year),
        fetchConsumption(tenantId, `${year}-01-01`),
      ])

      const budgetRows  = budgetsRaw.data ?? []
      const MONTH_KEYS  = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'] as const

      // Sum budgets per month
      const budgetByMonth = MONTH_KEYS.map(k =>
        budgetRows.reduce((a: number, b: any) => a + Number(b[k] ?? 0), 0)
      )

      // Sum actual costs per month
      const actualByMonth = Array(12).fill(0)
      for (const r of recordsRaw) {
        const yr = r.period_start?.slice(0, 4)
        if (String(yr) !== String(year)) continue
        const mo = Number(r.period_start?.slice(5, 7) ?? 0) - 1
        if (mo >= 0 && mo < 12) actualByMonth[mo] += Number(r.cost ?? 0)
      }

      const rows = MONTHS.map((month, i) => ({
        month,
        budget:    Math.round(budgetByMonth[i]),
        actual:    Math.round(actualByMonth[i]),
        deviation: Math.round(actualByMonth[i] - budgetByMonth[i]),
        pct:       budgetByMonth[i] > 0 ? ((actualByMonth[i] - budgetByMonth[i]) / budgetByMonth[i] * 100) : 0,
      }))

      setMonthly(rows)
      setLoading(false)
    }
    load()
  }, [tenantId, year])

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={20} className="animate-spin text-white/30"/></div>

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <select className="form-select text-sm" value={year} onChange={e => setYear(+e.target.value)}>
          {[2023,2024,2025].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <ChartCard
        title="Monthly Deviation vs Budget (AED)"
        subtitle="Green = under budget · Red = over budget"
        table={
          <table className="w-full">
            <thead><tr>{['Month','Budget (AED)','Actual (AED)','Deviation','%'].map(h=><th key={h} className="tbl-th">{h}</th>)}</tr></thead>
            <tbody>
              {monthly.map(row=>(
                <tr key={row.month} className="tbl-row">
                  <td className="tbl-td text-white/70">{row.month}</td>
                  <td className="tbl-td font-mono text-blue-300">{row.budget.toLocaleString()}</td>
                  <td className="tbl-td font-mono text-white/70">{row.actual.toLocaleString()}</td>
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
          <BarChart data={monthly} margin={{ top:5, right:20, left:-5, bottom:5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis dataKey="month" tick={{ fill:'#5a6385', fontSize:10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill:'#5a6385', fontSize:10 }} axisLine={false} tickLine={false}
              tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={TT} formatter={(v: number) => [`${currencySymbol} ${v.toLocaleString()}`, 'Deviation']} />
            <ReferenceLine y={0} stroke="#ffffff30" strokeWidth={1.5} />
            <Bar dataKey="deviation" name="Deviation" radius={[3,3,0,0]} maxBarSize={32}>
              {monthly.map((d, i) => (
                <Cell key={i} fill={d.deviation > 0 ? '#ef4444' : '#10b981'} opacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}

// ─── Cost Report tab ──────────────────────────────────────────────────────────
function CostReportTab({ tenantId, currencySymbol }: { tenantId: string; currencySymbol: string }) {
  const [loading, setLoading]  = useState(true)
  const [chartData, setChart]  = useState<any[]>([])
  const [yearTotal, setYearTotal] = useState(0)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const records = await fetchConsumption(tenantId)
      const monthly = groupByMonth(records)

      const data = monthly.map(m => ({
        month:   new Date(m.month + '-01').toLocaleString('default', { month:'short', year:'2-digit' }),
        cost:    Math.round(m.cost),
        elec:    Math.round(m.cost * (m.elec / (m.elec + m.gas || 1))),
        gas:     Math.round(m.cost * (m.gas  / (m.elec + m.gas || 1))),
      }))
      setChart(data)
      setYearTotal(data.reduce((a, d) => a + d.cost, 0))
      setLoading(false)
    }
    load()
  }, [tenantId])

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={20} className="animate-spin text-white/30"/></div>

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[11px] text-white/35 mb-0.5">Financial Reports</div>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Cost Report</h2>
          <button className="flex items-center gap-1.5 text-xs border border-border-default text-white/60 hover:text-white px-3 py-1.5 rounded-lg transition-all">
            <Download size={12} /> Download
          </button>
        </div>
      </div>

      <div className="card">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top:5, right:10, left:-5, bottom:5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis dataKey="month" tick={{ fill:'#5a6385', fontSize:10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill:'#5a6385', fontSize:10 }} axisLine={false} tickLine={false}
              tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
            <Tooltip contentStyle={TT} formatter={(v: number, n: string) => [`${currencySymbol} ${v.toLocaleString()}`, n === 'elec' ? 'Electricity' : n === 'gas' ? 'Gas' : 'Total']} />
            <Legend wrapperStyle={{ fontSize:10, paddingTop:8 }} formatter={v => v === 'elec' ? 'Electricity' : 'Gas'} />
            <Bar dataKey="elec" name="elec" stackId="a" fill="#3b82f6" opacity={0.9} radius={[0,0,0,0]} maxBarSize={40} />
            <Bar dataKey="gas"  name="gas"  stackId="a" fill="#f59e0b" opacity={0.9} radius={[3,3,0,0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-[11px] min-w-[900px]">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="tbl-th text-left w-32">Cost type</th>
              {chartData.map(d => <th key={d.month} className="tbl-th text-right">{d.month}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border-subtle">
              <td className="tbl-td font-semibold text-blue-300">Electricity</td>
              {chartData.map((d, i) => <td key={i} className="tbl-td text-right text-blue-300">{d.elec.toLocaleString()}</td>)}
            </tr>
            <tr className="border-b border-border-subtle">
              <td className="tbl-td font-semibold text-amber-300">Gas</td>
              {chartData.map((d, i) => <td key={i} className="tbl-td text-right text-amber-300">{d.gas.toLocaleString()}</td>)}
            </tr>
            <tr className="border-b border-border-default bg-bg-card/40">
              <td className="tbl-td font-bold text-white">Total</td>
              {chartData.map((d, i) => <td key={i} className="tbl-td text-right font-bold text-white">{d.cost.toLocaleString()}</td>)}
            </tr>
            <tr className="bg-bg-secondary/60">
              <td className="tbl-td font-semibold text-accent-hover">Period total</td>
              <td className="tbl-td text-right font-bold text-accent-hover" colSpan={chartData.length}>
                {currencySymbol} {yearTotal.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="text-[10px] text-white/30 leading-relaxed border border-border-subtle rounded-lg p-3 space-y-0.5">
        <div>· Data sourced directly from consumption_records table</div>
        <div>· Electricity/Gas cost split is proportional to kWh vs m³ consumption volumes</div>
        <div>· Import additional records via the Analytics page</div>
      </div>
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
interface SidebarFilters { product: 'electricity' | 'gas'; year: string; savings: number }

function Sidebar({ filters, setFilters }: {
  filters: SidebarFilters
  setFilters: React.Dispatch<React.SetStateAction<SidebarFilters>>
}) {
  const set = <K extends keyof SidebarFilters>(key: K) => (val: SidebarFilters[K]) =>
    setFilters(f => ({ ...f, [key]: val }))

  return (
    <aside className="w-[220px] min-w-[220px] bg-bg-secondary border-r border-border-subtle flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <span className="text-sm font-semibold text-white">Filters</span>
        <button
          onClick={() => setFilters({ product:'electricity', year:'2025', savings:0 })}
          className="text-white/30 hover:text-white/70 transition-colors"
          title="Reset filters">
          <RefreshCw size={13} />
        </button>
      </div>

      <div className="px-4 py-4 flex-1 space-y-5">
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

        <div>
          <div className="text-[10px] font-semibold text-accent-hover uppercase tracking-widest mb-2 pb-1 border-b border-border-subtle">Period</div>
          <select value={filters.year} onChange={e => set('year')(e.target.value)}
            className="w-full bg-bg-card border border-border-subtle text-white/70 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-accent">
            {['2023','2024','2025'].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>

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
              Applying {filters.savings}% saving factor
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Financials() {
  const { market } = useAppStore()
  const cfg        = getMarketConfig(market)
  const tenantId   = useTenantId()

  const [tab, setTab] = useState<Tab>('tariffs')
  const [filters, setFilters] = useState<SidebarFilters>({
    product: 'electricity', year: '2025', savings: 0,
  })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Financials" subtitle="Tariffs · costs · deviations · reports" />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar filters={filters} setFilters={setFilters} />

        <div className="flex flex-col flex-1 overflow-hidden">
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

          <div className="flex-1 overflow-y-auto p-6">
            {tab === 'tariffs'      && <TariffsTab     tenantId={tenantId} />}
            {tab === 'cost-summary' && <CostSummaryTab tenantId={tenantId} currencySymbol={cfg.currencySymbol} />}
            {tab === 'deviations'   && <DeviationsTab  tenantId={tenantId} currencySymbol={cfg.currencySymbol} />}
            {tab === 'cost-report'  && <CostReportTab  tenantId={tenantId} currencySymbol={cfg.currencySymbol} />}
          </div>
        </div>
      </div>
    </div>
  )
}
