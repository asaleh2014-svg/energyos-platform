import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Topbar } from '@/components/layout/Topbar'
import { useAppStore } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { MARKET_CONFIGS, type Market } from '@/types'
import { CO2_FACTORS, type ElecSource, MONTHS } from '@/lib/mockData'
import {
  MapPin, X, Search, Globe, CopyCheck, ChevronDown, ChevronUp,
  Plus, Building2, Zap, Loader2, Trash2, RefreshCw, AlertCircle,
  Flame, ExternalLink, Hotel, ChevronRight,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { mockBuildingsForSite, LABEL_COLORS } from '@/lib/buildingMocks'
import { PeriodSelector, DEFAULT_PERIOD, type Period } from '@/components/PeriodSelector'
import clsx from 'clsx'

// ── Energy mix helpers ─────────────────────────────────────────────────────────
const DEFAULT_MIX: ElecSource = { gas_fired: 52, coal: 0, renewable: 35, mix: 13 }

const MIX_COLORS = { gas_fired: '#f59e0b', coal: '#6b7280', renewable: '#10b981', mix: '#3b82f6' }
const MIX_LABELS = { gas_fired: 'Gas', coal: 'Coal', renewable: 'Renewable', mix: 'Grid Mix' }

function calcEmissionFactor(mix: ElecSource) {
  return (
    (mix.gas_fired  / 100) * CO2_FACTORS.electricity.gas_fired  +
    (mix.coal       / 100) * CO2_FACTORS.electricity.coal        +
    (mix.renewable  / 100) * CO2_FACTORS.electricity.renewable   +
    (mix.mix        / 100) * CO2_FACTORS.electricity.mix
  )
}

const MONTH_NAMES_S = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const SEASONAL_S    = [1.12,1.08,1.0,0.92,0.85,0.82,0.84,0.86,0.93,1.0,1.06,1.10]

// ── Seeded mock consumption per site (period-aware) ────────────────────────────
function siteConsumption(siteId: string, period?: Period) {
  const seed = siteId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const baseElec = 8000 + (seed % 12000)   // kWh/month
  const baseGas  = 200  + (seed % 800)     // m³/month
  const rng = (i: number) => 0.90 + ((seed * (i+1) * 9301 + 49297) % 233280) / 233280 * 0.20

  if (!period) {
    return MONTH_NAMES_S.map((m, i) => ({
      month: m,
      elec: Math.round(baseElec * SEASONAL_S[i] * rng(i)),
      gas:  Math.round(baseGas  * SEASONAL_S[i] * rng(i + 13)),
    }))
  }

  const rows: { month: string; elec: number; gas: number }[] = []
  const now = new Date()

  // Daily granularity (single month)
  if (period.granularity === 'day') {
    const dayElec = baseElec / 30
    const dayGas  = baseGas  / 30
    const cur = new Date(period.from.getFullYear(), period.from.getMonth(), period.from.getDate())
    const end = new Date(period.to.getFullYear(),   period.to.getMonth(),   period.to.getDate())
    let idx = 0
    while (cur <= end) {
      const m = cur.getMonth()
      rows.push({
        month: `${cur.getDate()} ${MONTH_NAMES_S[m]}`,
        elec:  Math.round(dayElec * SEASONAL_S[m] * rng(idx)),
        gas:   Math.round(dayGas  * SEASONAL_S[m] * rng(idx + 13)),
      })
      cur.setDate(cur.getDate() + 1)
      idx++
    }
    return rows
  }

  // Monthly granularity
  const cur = new Date(period.from.getFullYear(), period.from.getMonth(), 1)
  const end = new Date(period.to.getFullYear(),   period.to.getMonth(),   1)
  let idx = 0
  while (cur <= end) {
    const m  = cur.getMonth()
    const yr = cur.getFullYear()
    const label = `${MONTH_NAMES_S[m]}${yr !== now.getFullYear() ? ` ${yr}` : ''}`
    rows.push({
      month: label,
      elec: Math.round(baseElec * SEASONAL_S[m] * rng(idx)),
      gas:  Math.round(baseGas  * SEASONAL_S[m] * rng(idx + 13)),
    })
    cur.setMonth(cur.getMonth() + 1)
    idx++
  }
  return rows
}

function prevYearTotals(siteId: string) {
  const rows = siteConsumption(siteId)
  return {
    elec: rows.reduce((a, r) => a + r.elec, 0),
    gas:  rows.reduce((a, r) => a + r.gas,  0),
  }
}

// ── Mix slider ─────────────────────────────────────────────────────────────────
function MixSlider({ field, value, color, label, onChange }: {
  field: string; value: number; color: string; label: string
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-20 text-[10px] text-white/50 flex-shrink-0">{label}</div>
      <input type="range" min={0} max={100} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1 h-1.5 rounded-full cursor-pointer accent-current"
        style={{ accentColor: color }} />
      <div className="w-8 text-right text-xs font-mono font-semibold" style={{ color }}>{value}%</div>
    </div>
  )
}

// ── Site panel (slide-over) ────────────────────────────────────────────────────
interface SitePanelProps {
  site: DBSite
  city: string
  citySiteIds: string[]
  onClose: () => void
}

function SitePanel({ site, city, citySiteIds, onClose }: SitePanelProps) {
  const { siteMixes, setSiteMix } = useAppStore()
  const navigate = useNavigate()

  const [mix, setMix] = useState<ElecSource>(siteMixes[site.id] ?? DEFAULT_MIX)
  const [applied, setApplied] = useState<null | 'site' | 'city'>(null)
  const [period, setPeriod] = useState<Period>(DEFAULT_PERIOD)

  const factor = calcEmissionFactor(mix)
  const factorColor = factor < 0.15 ? '#10b981' : factor < 0.35 ? '#f59e0b' : '#ef4444'
  const total = mix.gas_fired + mix.coal + mix.renewable + mix.mix
  const isValid = total === 100

  const updateField = (field: keyof ElecSource, v: number) => {
    setMix(m => ({ ...m, [field]: v }))
    setApplied(null)
  }

  const applyToSite = () => {
    setSiteMix(site.id, mix)
    setApplied('site')
  }

  const applyToCity = () => {
    citySiteIds.forEach(id => setSiteMix(id, mix))
    setApplied('city')
  }

  const consumption = useMemo(() => siteConsumption(site.id, period), [site.id, period])
  const totals = prevYearTotals(site.id)

  const TT = { background: '#0d2b35', border: '1px solid #1a5568', borderRadius: 8, fontSize: 11 }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-bg-primary border-l border-border-subtle flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle bg-bg-secondary">
          <div>
            <div className="text-base font-semibold text-white flex items-center gap-2">
              <Building2 size={15} className="text-accent" />
              {site.name}
            </div>
            <div className="text-xs text-white/40 mt-0.5 flex items-center gap-1">
              <MapPin size={10} /> {city} · <span className={`status-${site.status.toLowerCase()}`}>{site.status}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { onClose(); navigate(`/buildings?site=${site.id}`) }}
              className="btn-secondary text-xs flex items-center gap-1">
              <ExternalLink size={11} /> View buildings
            </button>
            <button onClick={onClose} className="text-white/30 hover:text-white/60"><X size={18} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Prev year KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card bg-bg-secondary">
              <div className="flex items-center gap-1.5 mb-1">
                <Zap size={11} className="text-blue-400" />
                <span className="label">Electricity (prev yr)</span>
              </div>
              <div className="text-xl font-semibold text-white">{(totals.elec / 1000).toFixed(1)}K kWh</div>
              <div className="text-[10px] text-white/35 mt-1">≈ {(totals.elec / 1000 / 8.76).toFixed(0)} kW avg</div>
            </div>
            <div className="card bg-bg-secondary">
              <div className="flex items-center gap-1.5 mb-1">
                <Flame size={11} className="text-amber-400" />
                <span className="label">Gas (prev yr)</span>
              </div>
              <div className="text-xl font-semibold text-white">{totals.gas.toLocaleString()} m³</div>
              <div className="text-[10px] text-white/35 mt-1">≈ {(totals.gas * 10.55 / 1000).toFixed(1)} MWh equiv.</div>
            </div>
          </div>

          {/* Consumption chart */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-white/50 uppercase tracking-widest">Consumption</span>
              <PeriodSelector value={period} onChange={setPeriod} />
            </div>
            <div className="card p-3">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={consumption} barGap={2} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#6b8fa3' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#6b8fa3' }} axisLine={false} tickLine={false}
                    tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                  <Tooltip contentStyle={TT} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="elec" name="Elec (kWh)" fill="#3b82f6" opacity={0.85} radius={[2,2,0,0]} />
                  <Bar dataKey="gas"  name="Gas (m³)"   fill="#f59e0b" opacity={0.75} radius={[2,2,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Consumption table */}
            <div className="card p-0 overflow-hidden mt-2">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="tbl-th">Month</th>
                    <th className="tbl-th text-right">Elec (kWh)</th>
                    <th className="tbl-th text-right">Gas (m³)</th>
                    <th className="tbl-th text-right">CO₂ (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {consumption.map((r, i) => (
                    <tr key={i} className="tbl-row">
                      <td className="tbl-td text-white/70">{r.month}</td>
                      <td className="tbl-td text-right font-mono text-blue-300">{r.elec.toLocaleString()}</td>
                      <td className="tbl-td text-right font-mono text-amber-300">{r.gas.toLocaleString()}</td>
                      <td className="tbl-td text-right font-mono text-white/50">
                        {Math.round(r.elec * factor).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border-default bg-bg-card">
                    <td className="tbl-td font-bold text-white/50">Total</td>
                    <td className="tbl-td text-right font-bold font-mono text-blue-300">{totals.elec.toLocaleString()}</td>
                    <td className="tbl-td text-right font-bold font-mono text-amber-300">{totals.gas.toLocaleString()}</td>
                    <td className="tbl-td text-right font-bold font-mono text-white/50">
                      {Math.round(totals.elec * factor).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Energy mix editor */}
          <div>
            <div className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">Energy Mix</div>
            <div className="card bg-bg-secondary">
              {/* CO2 factor */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-white/40">CO₂ factor</span>
                <span className="font-mono text-sm font-semibold" style={{ color: factorColor }}>
                  {factor.toFixed(3)} kgCO₂/kWh
                </span>
              </div>

              {/* Mix strip */}
              <div className="h-2 rounded-full overflow-hidden flex mb-3">
                {(Object.keys(MIX_COLORS) as (keyof ElecSource)[]).map(k => (
                  <div key={k} style={{ width: `${mix[k]}%`, background: MIX_COLORS[k] }} />
                ))}
              </div>

              {/* Sliders */}
              {(Object.entries(MIX_LABELS) as [keyof ElecSource, string][]).map(([k, label]) => (
                <MixSlider key={k} field={k} value={mix[k]} color={MIX_COLORS[k]}
                  label={label} onChange={v => updateField(k, v)} />
              ))}

              {/* Total indicator */}
              <div className={clsx('text-xs mt-2 text-right font-mono', isValid ? 'text-success-light' : 'text-danger-light')}>
                Total: {total}% {!isValid && '⚠ must equal 100%'}
              </div>

              {/* Apply buttons */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-border-subtle">
                <button onClick={applyToSite} disabled={!isValid}
                  className="flex-1 btn-secondary text-xs disabled:opacity-40">
                  Apply to this site
                </button>
                <button onClick={applyToCity} disabled={!isValid}
                  className="flex-1 btn-primary text-xs disabled:opacity-40">
                  Apply to all {city} sites
                </button>
              </div>

              {applied && (
                <div className="text-xs text-success-light mt-2 text-center">
                  ✓ Applied to {applied === 'city' ? `all ${city} sites` : 'this site'}
                </div>
              )}
            </div>
          </div>

          {/* Buildings under this site */}
          <div>
            <div className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">Buildings</div>
            <div className="space-y-2">
              {mockBuildingsForSite(site.id, 3).map(b => {
                const eff = (b.elec_kwh_year / b.area_m2).toFixed(1)
                const effColor = Number(eff) < 100 ? '#10b981' : Number(eff) < 200 ? '#f59e0b' : '#ef4444'
                return (
                  <div key={b.id}
                    className="card bg-bg-secondary flex items-start justify-between gap-3 cursor-pointer hover:border-accent/30 transition-colors group"
                    onClick={() => { onClose(); navigate(`/buildings/${b.id}`) }}>
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <div className="mt-0.5 w-8 h-6 rounded text-[10px] font-bold text-white flex items-center justify-center flex-shrink-0"
                        style={{ background: LABEL_COLORS[b.energy_label] ?? '#6b7280' }}>
                        {b.energy_label}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white group-hover:text-accent-hover transition-colors">
                          {b.name}
                        </div>
                        <div className="text-[10px] text-white/40 flex items-center gap-1 mt-0.5 truncate">
                          <MapPin size={8} className="flex-shrink-0" /> {b.address}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[10px] text-white/40">{b.area_m2.toLocaleString()} m²</span>
                          <span className="text-[10px] font-mono" style={{ color: effColor }}>{eff} kWh/m²</span>
                          <span className="text-[10px] text-blue-300 font-mono flex items-center gap-0.5">
                            <Zap size={8} /> {(b.elec_kwh_year/1000).toFixed(0)}K kWh
                          </span>
                          <span className="text-[10px] text-amber-300 font-mono flex items-center gap-0.5">
                            <Flame size={8} /> {b.gas_m3_year.toLocaleString()} m³
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`status-${b.status.toLowerCase().replace(' ', '-')}`}>{b.status}</span>
                      <ChevronRight size={13} className="text-white/20 group-hover:text-accent transition-colors" />
                    </div>
                  </div>
                )
              })}
            </div>
            <button
              onClick={() => { onClose(); navigate('/buildings') }}
              className="mt-2 w-full text-[11px] text-white/30 hover:text-accent-hover flex items-center justify-center gap-1.5 py-2 transition-colors">
              <Hotel size={11} /> View all buildings →
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface DBMeter {
  id: string
  ean: string | null
  meter_number: string | null
  utility: string
  status: string
  addresses: { id: string; full_address: string } | null
}

interface DBSite {
  id: string
  name: string
  status: string
  created_at: string
  city_id: string
  cities: {
    id: string
    name: string
    countries: { id: string; name: string; code: string } | null
  } | null
  meters_count?: number
}

interface ConnectionRow {
  address: string
  ean: string
  utility: 'Electricity' | 'Gas' | 'Water' | 'Heat'
  meter_number: string
}

const UTILITY_OPTIONS = ['Electricity', 'Gas', 'Water', 'Heat'] as const

// ── Add Site Modal ─────────────────────────────────────────────────────────────
function AddSiteModal({
  onClose,
  onCreated,
  tenantId,
}: {
  onClose: () => void
  onCreated: () => void
  tenantId: string
}) {
  const [step, setStep]           = useState<1 | 2 | 3>(1)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  // Step 1 — location
  const [countries, setCountries]   = useState<{ id: string; name: string; code: string }[]>([])
  const [cities, setCities]         = useState<{ id: string; name: string }[]>([])
  const [countryId, setCountryId]   = useState('')
  const [newCountry, setNewCountry] = useState('')
  const [newCountryCode, setNewCountryCode] = useState('')
  const [cityId, setCityId]         = useState('')
  const [newCity, setNewCity]       = useState('')
  const [loadingCities, setLoadingCities] = useState(false)

  // Step 2 — site details
  const [siteName, setSiteName]   = useState('')
  const [siteStatus, setSiteStatus] = useState<'Active' | 'Inactive' | 'Pending'>('Active')

  // Step 3 — connections
  const [connections, setConnections] = useState<ConnectionRow[]>([
    { address: '', ean: '', utility: 'Electricity', meter_number: '' },
  ])

  // Load existing countries
  useEffect(() => {
    supabase.from('countries').select('id,name,code').eq('tenant_id', tenantId)
      .then(({ data }) => setCountries(data ?? []))
  }, [tenantId])

  // Load cities when country changes
  useEffect(() => {
    if (!countryId) { setCities([]); setCityId(''); return }
    setLoadingCities(true)
    supabase.from('cities').select('id,name').eq('tenant_id', tenantId).eq('country_id', countryId)
      .then(({ data }) => { setCities(data ?? []); setLoadingCities(false) })
  }, [countryId, tenantId])

  const addConnection = () =>
    setConnections(c => [...c, { address: '', ean: '', utility: 'Electricity', meter_number: '' }])

  const removeConnection = (i: number) =>
    setConnections(c => c.filter((_, idx) => idx !== i))

  const updateConnection = (i: number, field: keyof ConnectionRow, value: string) =>
    setConnections(c => c.map((row, idx) => idx === i ? { ...row, [field]: value } : row))

  const handleSave = async () => {
    setError('')
    setSaving(true)
    try {
      // 1. Resolve or create country
      let resolvedCountryId = countryId
      if (!resolvedCountryId) {
        if (!newCountry || !newCountryCode) throw new Error('Enter country name and code')
        const { data, error } = await supabase.from('countries')
          .insert({ tenant_id: tenantId, name: newCountry, code: newCountryCode.toUpperCase() })
          .select('id').single()
        if (error) throw error
        resolvedCountryId = data.id
      }

      // 2. Resolve or create city
      let resolvedCityId = cityId
      if (!resolvedCityId) {
        if (!newCity) throw new Error('Enter a city name')
        const { data, error } = await supabase.from('cities')
          .insert({ tenant_id: tenantId, country_id: resolvedCountryId, name: newCity })
          .select('id').single()
        if (error) throw error
        resolvedCityId = data.id
      }

      // 3. Create site
      if (!siteName.trim()) throw new Error('Enter a site name')
      const { data: site, error: siteErr } = await supabase.from('sites')
        .insert({ tenant_id: tenantId, city_id: resolvedCityId, name: siteName.trim(), status: siteStatus })
        .select('id').single()
      if (siteErr) throw siteErr

      // 4. Create addresses + meters
      for (const conn of connections) {
        if (!conn.address.trim()) continue
        const { data: addr, error: addrErr } = await supabase.from('addresses')
          .insert({
            tenant_id: tenantId,
            site_id: site.id,
            street: conn.address.trim(),
          })
          .select('id').single()
        if (addrErr) throw addrErr

        if (conn.ean.trim() || conn.meter_number.trim()) {
          const { error: meterErr } = await supabase.from('meters').insert({
            tenant_id: tenantId,
            address_id: addr.id,
            ean: conn.ean.trim() || null,
            meter_number: conn.meter_number.trim() || null,
            utility: conn.utility,
            status: 'Active',
          })
          if (meterErr) throw meterErr
        }
      }

      onCreated()
      onClose()
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl bg-bg-secondary border border-border-default rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <div>
            <h2 className="text-sm font-semibold text-white">Add New Site</h2>
            <p className="text-xs text-white/30 mt-0.5">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1 px-6 pt-4">
          {[1,2,3].map(s => (
            <div key={s} className={clsx('h-1 flex-1 rounded-full transition-colors',
              s <= step ? 'bg-accent' : 'bg-bg-hover')} />
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── Step 1: Location ── */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest">Location</h3>

              <div>
                <label className="label mb-1.5 block">Country</label>
                <select className="form-select w-full" value={countryId}
                  onChange={e => { setCountryId(e.target.value); setNewCountry(''); setNewCountryCode('') }}>
                  <option value="">+ Add new country</option>
                  {countries.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                </select>
              </div>

              {!countryId && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label mb-1.5 block">Country name</label>
                    <input className="form-input w-full" placeholder="Netherlands"
                      value={newCountry} onChange={e => setNewCountry(e.target.value)} />
                  </div>
                  <div>
                    <label className="label mb-1.5 block">Code</label>
                    <input className="form-input w-full" placeholder="NL" maxLength={4}
                      value={newCountryCode} onChange={e => setNewCountryCode(e.target.value)} />
                  </div>
                </div>
              )}

              <div>
                <label className="label mb-1.5 block">City</label>
                {loadingCities ? (
                  <div className="flex items-center gap-2 text-xs text-white/30 py-2">
                    <Loader2 size={12} className="animate-spin" /> Loading cities…
                  </div>
                ) : (
                  <select className="form-select w-full" value={cityId}
                    onChange={e => { setCityId(e.target.value); setNewCity('') }}>
                    <option value="">+ Add new city</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>

              {!cityId && (
                <div>
                  <label className="label mb-1.5 block">City name</label>
                  <input className="form-input w-full" placeholder="Amsterdam"
                    value={newCity} onChange={e => setNewCity(e.target.value)} />
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Site details ── */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest">Site Details</h3>
              <div>
                <label className="label mb-1.5 block">Site name</label>
                <input className="form-input w-full" placeholder="e.g. Kalverstraat"
                  value={siteName} onChange={e => setSiteName(e.target.value)} autoFocus />
                <p className="text-[10px] text-white/25 mt-1">A site is a street, complex, or cluster of addresses.</p>
              </div>
              <div>
                <label className="label mb-1.5 block">Status</label>
                <select className="form-select w-full" value={siteStatus}
                  onChange={e => setSiteStatus(e.target.value as typeof siteStatus)}>
                  <option>Active</option>
                  <option>Pending</option>
                  <option>Inactive</option>
                </select>
              </div>
            </div>
          )}

          {/* ── Step 3: Connections ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest">Connections</h3>
                <span className="text-[10px] text-white/25">Optional — can be added later</span>
              </div>

              {connections.map((conn, i) => (
                <div key={i} className="p-3 rounded-xl border border-border-subtle bg-bg-card/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white/60">Connection {i + 1}</span>
                    {connections.length > 1 && (
                      <button onClick={() => removeConnection(i)} className="text-white/20 hover:text-red-400 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="label mb-1 block">Address / House number</label>
                    <input className="form-input w-full" placeholder="Kalverstraat 10"
                      value={conn.address} onChange={e => updateConnection(i, 'address', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label mb-1 block">Utility</label>
                      <select className="form-select w-full" value={conn.utility}
                        onChange={e => updateConnection(i, 'utility', e.target.value)}>
                        {UTILITY_OPTIONS.map(u => <option key={u}>{u}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label mb-1 block">EAN / POD code</label>
                      <input className="form-input w-full" placeholder="871234567890123456"
                        value={conn.ean} onChange={e => updateConnection(i, 'ean', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="label mb-1 block">Meter number <span className="text-white/25">(optional)</span></label>
                    <input className="form-input w-full" placeholder="MTR-NL-1234"
                      value={conn.meter_number} onChange={e => updateConnection(i, 'meter_number', e.target.value)} />
                  </div>
                </div>
              ))}

              <button onClick={addConnection}
                className="w-full flex items-center justify-center gap-2 border border-dashed border-border-subtle rounded-xl py-2.5 text-xs text-white/30 hover:text-white/60 hover:border-border-default transition-all">
                <Plus size={12} /> Add another connection
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t border-border-subtle">
          {step > 1 && (
            <button onClick={() => setStep(s => (s - 1) as 1|2|3)}
              className="px-4 py-2 text-sm rounded-lg border border-border-subtle text-white/50 hover:text-white hover:border-border-default transition-all">
              Back
            </button>
          )}
          <div className="flex-1" />
          {step < 3 ? (
            <button onClick={() => setStep(s => (s + 1) as 1|2|3)} className="btn-primary">
              Continue →
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : <><Zap size={13} /> Create site</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function Sites() {
  const { siteMixes, setCityMarket, getCityMarket, applyMarketToCountry } = useAppStore()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [sites, setSites]               = useState<DBSite[]>([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [collapsedCities, setCollapsedCities] = useState<Set<string>>(new Set())
  const [showAddSite, setShowAddSite]   = useState(false)
  const [appliedCountry, setAppliedCountry] = useState<string | null>(null)
  const [selectedSite, setSelectedSite] = useState<{ site: DBSite; city: string; citySiteIds: string[] } | null>(null)

  const fetchSites = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('sites')
      .select('id, name, status, created_at, city_id, cities(id, name, countries(id, name, code))')
      .order('name')
    setSites((data as unknown as DBSite[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchSites() }, [])

  const filtered = sites.filter(s => {
    const q = search.toLowerCase()
    const cityName  = s.cities?.name ?? ''
    const countryName = s.cities?.countries?.name ?? ''
    return !q || s.name.toLowerCase().includes(q) || cityName.toLowerCase().includes(q) || countryName.toLowerCase().includes(q)
  })

  // Group: country → city → sites
  const countries = Array.from(new Set(filtered.map(s => s.cities?.countries?.name ?? 'Unknown')))

  const toggleCity = (city: string) =>
    setCollapsedCities(prev => {
      const next = new Set(prev)
      next.has(city) ? next.delete(city) : next.add(city)
      return next
    })

  const collapseAllInCountry = (country: string) => {
    const citiesInCountry = Array.from(new Set(
      filtered.filter(s => s.cities?.countries?.name === country).map(s => s.cities?.name ?? '')
    ))
    setCollapsedCities(prev => {
      const next = new Set(prev)
      const allCollapsed = citiesInCountry.every(c => next.has(c))
      citiesInCountry.forEach(c => allCollapsed ? next.delete(c) : next.add(c))
      return next
    })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Sites" subtitle="Operational facility overview" />
      <div className="flex-1 overflow-y-auto p-6">

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search sites, cities, countries…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-bg-card border border-border-subtle rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-accent/50 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                <X size={13} />
              </button>
            )}
          </div>
          <button onClick={fetchSites} className="text-white/30 hover:text-white/60 transition-colors p-2" title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowAddSite(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={14} /> Add Site
          </button>
        </div>

        {/* No tenant account — needs signup */}
        {!profile && !loading && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <AlertCircle size={36} className="text-warning mb-4" />
            <div className="text-white/60 text-sm font-medium mb-1">No company account linked</div>
            <div className="text-white/30 text-xs mb-5 max-w-xs">
              Your login is not linked to a company yet. Complete the company setup to start managing sites.
            </div>
            <button onClick={() => navigate('/settings')} className="btn-primary">
              Go to Settings →
            </button>
          </div>
        )}

        {/* Loading */}
        {profile && loading && (
          <div className="flex items-center justify-center py-20 text-white/30 gap-2">
            <Loader2 size={16} className="animate-spin" /> Loading sites…
          </div>
        )}

        {/* Empty state */}
        {profile && !loading && sites.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Building2 size={36} className="text-white/10 mb-4" />
            <div className="text-white/40 text-sm font-medium mb-1">No sites yet</div>
            <div className="text-white/25 text-xs mb-5">Add your first site to start managing your energy portfolio.</div>
            <button onClick={() => setShowAddSite(true)} className="btn-primary">
              <Plus size={13} /> Add your first site
            </button>
          </div>
        )}

        {/* No search results */}
        {profile && !loading && sites.length > 0 && filtered.length === 0 && (
          <div className="text-center py-16 text-white/30 text-sm">No sites match "{search}"</div>
        )}

        {/* Country → City → Sites */}
        {profile && !loading && countries.map(country => {
          const countrySites = filtered.filter(s => (s.cities?.countries?.name ?? 'Unknown') === country)
          const countryCities = Array.from(new Set(countrySites.map(s => s.cities?.name ?? 'Unknown')))
          const countryCode = countrySites[0]?.cities?.countries?.code ?? ''
          const representativeMarket = getCityMarket(countryCities[0] ?? '')
          const allSame = countryCities.every(c => getCityMarket(c) === representativeMarket)
          const cfg = MARKET_CONFIGS[representativeMarket]

          return (
            <div key={country} className="mb-10">

              {/* Country row */}
              <div className="flex items-center gap-3 mb-4 pb-2 border-b-2 border-border-subtle">
                <span className="text-sm font-bold text-white">{cfg.flag} {country}</span>
                <span className="text-xs text-white/25 font-mono">{countryCode}</span>
                <span className="text-xs text-white/30">· {countryCities.length} cit{countryCities.length !== 1 ? 'ies' : 'y'} · {countrySites.length} sites</span>
                <div className="flex-1" />
                <button
                  onClick={() => collapseAllInCountry(country)}
                  className="text-[11px] text-white/30 hover:text-white/60 transition-colors px-2 py-1"
                >
                  {countryCities.every(c => collapsedCities.has(c)) ? 'Expand all' : 'Collapse all'}
                </button>
                {countryCities.length > 1 && (
                  appliedCountry === country ? (
                    <span className="text-[10px] text-success-light bg-success/10 border border-success/20 rounded px-2 py-0.5">
                      ✓ Applied to all cities
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        applyMarketToCountry(country, countryCities, representativeMarket)
                        setAppliedCountry(country)
                        setTimeout(() => setAppliedCountry(null), 2500)
                      }}
                      className="flex items-center gap-1.5 text-[11px] bg-bg-card border border-border-subtle hover:border-accent/50 text-white/50 hover:text-accent-hover px-2.5 py-1 rounded-lg transition-all"
                    >
                      <CopyCheck size={11} />
                      {!allSame && <span className="text-warning-light">Mixed · </span>}
                      Apply {representativeMarket} to all cities
                    </button>
                  )
                )}
              </div>

              {/* Cities */}
              {countryCities.map(city => {
                const citySites = countrySites.filter(s => (s.cities?.name ?? 'Unknown') === city)
                const cityMarket = getCityMarket(city)
                const cityCfg = MARKET_CONFIGS[cityMarket]
                const isCollapsed = collapsedCities.has(city)

                return (
                  <div key={city} className="mb-5">

                    {/* City header */}
                    <button
                      onClick={() => toggleCity(city)}
                      className="w-full flex items-center gap-2.5 py-2 px-3 rounded-xl hover:bg-bg-card/60 transition-colors group mb-2"
                    >
                      <MapPin size={12} className="text-accent flex-shrink-0" />
                      <span className="text-sm font-semibold text-white">{city}</span>
                      <span className="text-xs text-white/30">{citySites.length} site{citySites.length !== 1 ? 's' : ''}</span>
                      <div className="flex-1" />

                      {/* Market selector */}
                      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <Globe size={10} className="text-white/25" />
                        <select
                          value={cityMarket}
                          onChange={e => setCityMarket(city, e.target.value as Market)}
                          className="bg-bg-card border border-border-subtle text-white/70 text-[11px] rounded-lg px-2 py-0.5 focus:outline-none focus:border-accent cursor-pointer"
                        >
                          {(Object.entries(MARKET_CONFIGS) as [Market, typeof MARKET_CONFIGS[Market]][]).map(([k, v]) => (
                            <option key={k} value={k}>{v.flag} {v.label} · {v.tariffAuthority.split('/')[0].trim()}</option>
                          ))}
                        </select>
                      </div>

                      {isCollapsed
                        ? <ChevronDown size={14} className="text-white/30 group-hover:text-white/60 transition-colors flex-shrink-0" />
                        : <ChevronUp   size={14} className="text-white/30 group-hover:text-white/60 transition-colors flex-shrink-0" />
                      }
                    </button>

                    {/* Sites grid */}
                    {!isCollapsed && (
                      <div className="grid grid-cols-3 gap-3 pl-2">
                        {citySites.map(site => {
                          const mix    = siteMixes[site.id] ?? DEFAULT_MIX
                          const factor = calcEmissionFactor(mix)
                          const factorColor = factor < 0.15 ? '#10b981' : factor < 0.35 ? '#f59e0b' : '#ef4444'
                          const budget = 80000   // placeholder until budget table is built
                          const spend  = 52000   // placeholder
                          const util   = Math.round((spend / budget) * 100)
                          const barColor = util > 85 ? '#ef4444' : util > 60 ? '#f59e0b' : '#10b981'
                          const totals = prevYearTotals(site.id)

                          return (
                          <div key={site.id} className="card-hover group cursor-pointer"
                            onClick={() => setSelectedSite({ site, city, citySiteIds: citySites.map(s => s.id) })}>
                            {/* Header */}
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="text-sm font-semibold text-white group-hover:text-accent-hover transition-colors">
                                  {site.name}
                                </div>
                                <div className="flex items-center gap-1 mt-0.5 text-xs text-white/40">
                                  <MapPin size={10} /> {city}
                                </div>
                              </div>
                              <span className={`status-${site.status.toLowerCase()}`}>{site.status}</span>
                            </div>

                            {/* Prev-year energy totals */}
                            <div className="grid grid-cols-2 gap-1.5 mb-3">
                              <div className="bg-blue-500/8 border border-blue-500/15 rounded-lg px-2 py-1.5">
                                <div className="flex items-center gap-1 mb-0.5">
                                  <Zap size={9} className="text-blue-400" />
                                  <span className="text-[9px] text-white/40">Elec (yr)</span>
                                </div>
                                <div className="text-xs font-semibold font-mono text-blue-300">
                                  {(totals.elec / 1000).toFixed(1)}K kWh
                                </div>
                              </div>
                              <div className="bg-amber-500/8 border border-amber-500/15 rounded-lg px-2 py-1.5">
                                <div className="flex items-center gap-1 mb-0.5">
                                  <Flame size={9} className="text-amber-400" />
                                  <span className="text-[9px] text-white/40">Gas (yr)</span>
                                </div>
                                <div className="text-xs font-semibold font-mono text-amber-300">
                                  {totals.gas.toLocaleString()} m³
                                </div>
                              </div>
                            </div>

                            {/* Budget bar */}
                            <div className="mb-3">
                              <div className="flex justify-between text-xs text-white/40 mb-1.5">
                                <span>Budget utilization</span>
                                <span className="text-white/60">{util}%</span>
                              </div>
                              <div className="h-1.5 bg-bg-primary rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${util}%`, background: barColor }} />
                              </div>
                            </div>

                            {/* Energy mix strip */}
                            <div>
                              <div className="flex items-center justify-between text-[10px] text-white/35 mb-1">
                                <span>Energy mix</span>
                                <span style={{ color: factorColor }} className="font-mono font-semibold">
                                  {factor.toFixed(3)} kgCO₂/kWh
                                </span>
                              </div>
                              <div className="h-1.5 rounded-full overflow-hidden flex">
                                {(Object.keys(MIX_COLORS) as (keyof ElecSource)[]).map(k => (
                                  <div key={k} style={{ width: `${mix[k]}%`, background: MIX_COLORS[k] }} />
                                ))}
                              </div>
                            </div>

                            <div className="mt-2 flex items-center justify-between">
                              <p className="text-[10px] text-accent-hover opacity-0 group-hover:opacity-100 transition-opacity">
                                Click to view →
                              </p>
                              <button
                                onClick={e => { e.stopPropagation(); navigate(`/sites/${site.id}`) }}
                                className="text-[9px] text-white/20 hover:text-white/50 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ExternalLink size={9} /> Full page
                              </button>
                            </div>
                          </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {showAddSite && profile && (
        <AddSiteModal
          tenantId={profile.id}
          onClose={() => setShowAddSite(false)}
          onCreated={fetchSites}
        />
      )}

      {selectedSite && (
        <SitePanel
          site={selectedSite.site}
          city={selectedSite.city}
          citySiteIds={selectedSite.citySiteIds}
          onClose={() => setSelectedSite(null)}
        />
      )}
    </div>
  )
}
