import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Topbar } from '@/components/layout/Topbar'
import {
  Hotel, MapPin, Zap, Flame, Leaf, Award, ChevronRight, ChevronDown,
  BarChart3, Users, Thermometer, Droplets, Wind, ArrowLeft,
  Building2, Table, Link2, Activity,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import {
  LABEL_COLORS, ENERGY_LABELS, type EnergyLabel,
} from '@/lib/buildingMocks'
import { PeriodSelector, DEFAULT_PERIOD, type Period } from '@/components/PeriodSelector'
import { supabase } from '@/lib/supabase'
import { useTenantId } from '@/lib/auth'

// ─── DB row types ─────────────────────────────────────────────────────────────
interface DBBuilding {
  id: string
  tenant_id: string
  site_id: string
  name: string
  address: string | null
  area_m2: number | null
  floors: number | null
  year_built: number | null
  energy_label: string | null
  breeam_rating: string | null
  leed_rating: string | null
  occupancy_pct: number | null
  status: string | null
  building_type: string | null
  sites: {
    name: string
    cities: { name: string; countries: { name: string; code: string } | null } | null
  } | null
}

interface DBConnection {
  id: string
  tenant_id: string
  site_id: string | null
  site_name: string | null
  ean_code: string | null
  connection_type: string | null
  capacity: string | null
  status: string | null
  supplier: string | null
  grid_operator: string | null
  building_name: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  meter_number: string | null
  active_since: string | null
  contract: string | null
  budget_annual_aed: number | null
  tariff_rate: number | null
  product: string | null
  department: string | null
  usage_category: string | null
  remarks: string | null
}

interface ConsumptionRecord {
  id: string
  connection_id: string
  period_start: string
  period_end: string
  consumption: number
  unit: string | null
  cost: number | null
  currency: string | null
}

// ─── UAE sector EUI benchmarks (kWh/m²/year) ──────────────────────────────────
const UAE_BENCHMARKS: Record<string, { good: number; typical: number; poor: number; label: string }> = {
  'Office':      { good: 120, typical: 200, poor: 300, label: 'Office' },
  'Retail':      { good: 180, typical: 280, poor: 400, label: 'Retail' },
  'Hotel':       { good: 200, typical: 320, poor: 500, label: 'Hotel' },
  'Residential': { good:  80, typical: 130, poor: 200, label: 'Residential' },
  'Industrial':  { good: 150, typical: 250, poor: 380, label: 'Industrial' },
  'Mixed-Use':   { good: 140, typical: 230, poor: 350, label: 'Mixed-Use' },
}

const DEFAULT_BENCHMARK = { good: 150, typical: 240, poor: 360, label: 'General' }

function euiColor(eui: number, bm: typeof DEFAULT_BENCHMARK) {
  if (eui <= bm.good)    return '#10b981'
  if (eui <= bm.typical) return '#f59e0b'
  return '#ef4444'
}

function euiRating(eui: number, bm: typeof DEFAULT_BENCHMARK): string {
  if (eui <= bm.good)    return 'Efficient'
  if (eui <= bm.typical) return 'Typical'
  return 'Poor'
}

// ─── Benchmarking view ────────────────────────────────────────────────────────
interface BenchmarkBuilding {
  id: string
  name: string
  area_m2: number
  elec_kwh_year: number
  energy_label: EnergyLabel
}

function BenchmarkingView({ buildings }: { buildings: BenchmarkBuilding[] }) {
  const [sector, setSector] = useState('Office')
  const bm = UAE_BENCHMARKS[sector] ?? DEFAULT_BENCHMARK
  const maxEUI = Math.max(bm.poor * 1.1, ...buildings.map(b => b.area_m2 > 0 ? b.elec_kwh_year / b.area_m2 : 0))

  const sorted = [...buildings]
    .filter(b => b.area_m2 > 0)
    .map(b => ({ ...b, eui: +(b.elec_kwh_year / b.area_m2).toFixed(1) }))
    .sort((a, b) => a.eui - b.eui)

  const efficient = sorted.filter(b => b.eui <= bm.good).length
  const poor      = sorted.filter(b => b.eui > bm.typical).length

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40 uppercase tracking-widest">Building type</span>
          <select value={sector} onChange={e => setSector(e.target.value)}
            className="input text-xs py-1.5 px-3">
            {Object.keys(UAE_BENCHMARKS).map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-4 text-xs text-white/50 ml-auto">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"/>≤{bm.good} kWh/m² Efficient</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/>≤{bm.typical} Typical</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"/>&gt;{bm.typical} Poor</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Buildings', value: String(sorted.length), sub: 'in portfolio' },
          { label: 'Efficient', value: String(efficient), sub: `≤${bm.good} kWh/m²`, color: 'text-emerald-400' },
          { label: 'Poor performers', value: String(poor), sub: `>${bm.typical} kWh/m²`, color: 'text-red-400' },
          { label: 'Portfolio avg EUI', value: sorted.length ? `${(sorted.reduce((a,b)=>a+b.eui,0)/sorted.length).toFixed(0)} kWh/m²` : '—', sub: `vs ${bm.typical} typical` },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="card">
            <div className="label mb-1">{label}</div>
            <div className={`text-xl font-semibold ${color ?? 'text-white'}`}>{value}</div>
            <div className="text-xs text-white/35 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      <div className="card p-4 space-y-3">
        <div className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-3">
          EUI Ranking — {sector} buildings · UAE benchmarks
        </div>
        <div className="relative h-4 mb-1">
          {[
            { pct: (bm.good / maxEUI) * 100, label: `Good ≤${bm.good}`, color: '#10b981' },
            { pct: (bm.typical / maxEUI) * 100, label: `Typical ≤${bm.typical}`, color: '#f59e0b' },
            { pct: (bm.poor / maxEUI) * 100, label: `Poor >${bm.typical}`, color: '#ef4444' },
          ].map(({ pct, label, color }) => (
            <div key={label} className="absolute top-0 bottom-0 flex flex-col items-center"
              style={{ left: `${pct}%` }}>
              <div className="w-px h-full opacity-30" style={{ background: color }} />
              <span className="absolute -top-4 text-[9px] whitespace-nowrap -translate-x-1/2"
                style={{ color }}>{label}</span>
            </div>
          ))}
        </div>

        {sorted.map(b => {
          const color = euiColor(b.eui, bm)
          const pct   = Math.min((b.eui / maxEUI) * 100, 100)
          const rating = euiRating(b.eui, bm)
          return (
            <div key={b.id} className="flex items-center gap-3">
              <div className="w-36 text-xs text-white/70 truncate flex-shrink-0">{b.name}</div>
              <div className="flex-1 bg-bg-secondary rounded-full h-4 relative overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: color, opacity: 0.8 }} />
              </div>
              <div className="w-20 text-right text-xs font-mono" style={{ color }}>
                {b.eui} kWh/m²
              </div>
              <div className="w-16 text-xs text-right" style={{ color }}>
                {rating}
              </div>
            </div>
          )
        })}
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="tbl-th">Building</th>
              <th className="tbl-th text-right">Area (m²)</th>
              <th className="tbl-th text-right">Elec (kWh/yr)</th>
              <th className="tbl-th text-right">EUI (kWh/m²)</th>
              <th className="tbl-th text-right">vs Typical</th>
              <th className="tbl-th text-center">Rating</th>
              <th className="tbl-th text-center">Label</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(b => {
              const diff = b.eui - bm.typical
              const color = euiColor(b.eui, bm)
              return (
                <tr key={b.id} className="tbl-row">
                  <td className="tbl-td text-white/80">{b.name}</td>
                  <td className="tbl-td text-right font-mono">{b.area_m2.toLocaleString()}</td>
                  <td className="tbl-td text-right font-mono">{b.elec_kwh_year.toLocaleString()}</td>
                  <td className="tbl-td text-right font-mono font-semibold" style={{ color }}>{b.eui}</td>
                  <td className="tbl-td text-right font-mono">
                    <span style={{ color: diff > 0 ? '#ef4444' : '#10b981' }}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(0)}
                    </span>
                  </td>
                  <td className="tbl-td text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ background: color + '25', color }}>
                      {euiRating(b.eui, bm)}
                    </span>
                  </td>
                  <td className="tbl-td text-center"><LabelBadge label={b.energy_label} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LabelBadge({ label }: { label: EnergyLabel | string | null }) {
  const l = (label ?? 'C') as EnergyLabel
  return (
    <span className="inline-flex items-center justify-center w-9 h-7 rounded font-bold text-xs text-white"
      style={{ background: LABEL_COLORS[l] ?? '#6b7280' }}>
      {l}
    </span>
  )
}

const PRODUCT_COLOR: Record<string, string> = {
  Electricity: '#10b981', Gas: '#f59e0b', Water: '#3b82f6',
}
const PRODUCT_ICON: Record<string, React.ElementType> = {
  Electricity: Zap, Gas: Flame, Water: Droplets,
}

// ─── Building connections section (DB-driven) ─────────────────────────────────
function BuildingConnectionsSection({ siteId }: { siteId: string }) {
  const navigate = useNavigate()
  const tenantId = useTenantId()
  const [conns, setConns] = useState<DBConnection[]>([])

  useEffect(() => {
    supabase
      .from('energy_connections')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('site_id', siteId)
      .then(({ data }) => setConns(data ?? []))
  }, [siteId, tenantId])

  if (conns.length === 0) return null

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Link2 size={14} className="text-accent" />
        <span className="text-xs font-semibold text-white/60 uppercase tracking-widest">
          Connections & Meters
        </span>
        <span className="ml-auto text-xs text-white/30">{conns.length} connection{conns.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="space-y-2">
        {conns.map(c => {
          const product = c.product ?? 'Electricity'
          const color = PRODUCT_COLOR[product] ?? '#6b7280'
          const Icon  = PRODUCT_ICON[product] ?? Zap
          return (
            <button
              key={c.id}
              onClick={() => navigate(`/connections?conn=${c.id}`)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-bg-secondary border border-border-subtle hover:border-accent/40 hover:bg-accent/5 transition-all group text-left"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: color + '20' }}>
                <Icon size={14} style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white/80 font-medium group-hover:text-accent-hover transition-colors truncate">
                  {c.site_name ?? c.address ?? c.id}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-white/35">
                  <span className="font-mono">{c.ean_code}</span>
                  {c.connection_type && <><span>·</span><span>{c.connection_type}</span></>}
                  {c.meter_number && <><span>·</span><span>{c.meter_number}</span></>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`status-${(c.status ?? 'inactive').toLowerCase()}`}>{c.status ?? 'Unknown'}</span>
                <Activity size={10} className="text-white/30" />
                <ChevronRight size={13} className="text-white/20 group-hover:text-accent transition-colors" />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Monthly chart from real consumption records ───────────────────────────────
function buildMonthlyFromRecords(records: ConsumptionRecord[], period: Period) {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const now = new Date()

  if (period.granularity === 'day') {
    const byDay: Record<string, { elec: number; gas: number }> = {}
    for (const r of records) {
      const d = r.period_start.slice(0, 10)
      if (!byDay[d]) byDay[d] = { elec: 0, gas: 0 }
      // We don't distinguish elec vs gas here (no unit on connection yet), use consumption
      byDay[d].elec += r.consumption
    }
    const cur = new Date(period.from)
    const end = new Date(period.to)
    const rows: { month: string; elec: number; gas: number }[] = []
    while (cur <= end) {
      const key = cur.toISOString().slice(0, 10)
      const day = byDay[key] ?? { elec: 0, gas: 0 }
      rows.push({ month: `${cur.getDate()} ${MONTHS[cur.getMonth()]}`, elec: day.elec, gas: day.gas })
      cur.setDate(cur.getDate() + 1)
    }
    return rows
  }

  // Monthly grouping
  const byMonth: Record<string, { elec: number; gas: number }> = {}
  for (const r of records) {
    const d = new Date(r.period_start)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!byMonth[key]) byMonth[key] = { elec: 0, gas: 0 }
    byMonth[key].elec += r.consumption
  }

  const rows: { month: string; elec: number; gas: number }[] = []
  const cur = new Date(period.from.getFullYear(), period.from.getMonth(), 1)
  const end = new Date(period.to.getFullYear(), period.to.getMonth(), 1)
  while (cur <= end) {
    const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`
    const label = `${MONTHS[cur.getMonth()]}${cur.getFullYear() !== now.getFullYear() ? ` ${cur.getFullYear()}` : ''}`
    rows.push({ month: label, elec: byMonth[key]?.elec ?? 0, gas: byMonth[key]?.gas ?? 0 })
    cur.setMonth(cur.getMonth() + 1)
  }
  return rows
}

// ─── Building detail ──────────────────────────────────────────────────────────
function BuildingDetail({ building }: { building: DBBuilding }) {
  const navigate = useNavigate()
  const tenantId = useTenantId()
  const [period, setPeriod]     = useState<Period>(DEFAULT_PERIOD)
  const [showTable, setShowTable] = useState(false)
  const [connections, setConnections] = useState<DBConnection[]>([])
  const [records, setRecords]   = useState<ConsumptionRecord[]>([])

  const area   = building.area_m2 ?? 1
  const TT = { background: '#0d2b35', border: '1px solid #1a5568', borderRadius: 8, fontSize: 11 }

  // Fetch connections for this site
  useEffect(() => {
    supabase
      .from('energy_connections')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('site_id', building.site_id)
      .then(({ data }) => setConnections(data ?? []))
  }, [building.site_id, tenantId])

  // Fetch consumption records for those connections
  useEffect(() => {
    if (connections.length === 0) return
    const ids = connections.map(c => c.id)
    supabase
      .from('consumption_records')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('connection_id', ids)
      .gte('period_start', period.from.toISOString().slice(0, 10))
      .lte('period_start', period.to.toISOString().slice(0, 10))
      .then(({ data }) => setRecords(data ?? []))
  }, [connections, tenantId, period])

  const monthly = useMemo(() => buildMonthlyFromRecords(records, period), [records, period])
  const totalElec = monthly.reduce((a, r) => a + r.elec, 0)
  const eff = area > 0 ? (totalElec / area).toFixed(1) : '—'
  const co2 = (totalElec * 0.233 / 1000).toFixed(1)

  function hash(s: string, salt = 0) {
    return s.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + salt
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar title={building.name} />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        <button onClick={() => navigate('/buildings')}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">
          <ArrowLeft size={13} /> Back to Buildings
        </button>

        <div className="card">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Hotel size={16} className="text-accent" />
                <h1 className="text-xl font-semibold text-white">{building.name}</h1>
                <LabelBadge label={building.energy_label} />
                <span className={`status-${(building.status ?? 'inactive').toLowerCase().replace(' ', '-')}`}>
                  {building.status ?? 'Unknown'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-white/40">
                <MapPin size={12} /> {building.address ?? building.sites?.cities?.name ?? '—'}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Area', value: building.area_m2 ? `${building.area_m2.toLocaleString()} m²` : '—', icon: Building2, color: '#3b82f6' },
              { label: 'Year Built', value: String(building.year_built ?? '—'), icon: Award, color: '#f59e0b' },
              { label: 'Occupancy',  value: building.occupancy_pct ? `${building.occupancy_pct}%` : '—', icon: Users, color: '#10b981' },
              { label: 'Floors',     value: String(building.floors ?? '—'), icon: Building2, color: '#8b5cf6' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-bg-secondary rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={11} style={{ color }} />
                  <span className="label">{label}</span>
                </div>
                <div className="text-lg font-semibold text-white">{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Electricity/yr', value: `${(totalElec/1000).toFixed(0)}K kWh`, icon: Zap,       color: '#3b82f6' },
            { label: 'Connections',    value: String(connections.length),             icon: Link2,     color: '#f59e0b' },
            { label: 'Efficiency',     value: `${eff} kWh/m²`,                        icon: BarChart3, color: '#10b981' },
            { label: 'CO₂ Emissions',  value: `${co2} tCO₂/yr`,                       icon: Leaf,      color: '#6ee7b7' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card">
              <div className="flex items-center gap-1.5 mb-2">
                <Icon size={12} style={{ color }} />
                <span className="label">{label}</span>
              </div>
              <div className="text-xl font-semibold text-white">{value}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-4">Certifications & Standards</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><div className="label mb-1.5">Energy Label</div><LabelBadge label={building.energy_label} /></div>
            <div><div className="label mb-1.5">BREEAM</div><span className="text-sm font-semibold text-white">{building.breeam_rating ?? '—'}</span></div>
            <div><div className="label mb-1.5">LEED</div><span className="text-sm font-semibold text-white">{building.leed_rating ?? '—'}</span></div>
            <div><div className="label mb-1.5">Meters</div><span className="text-sm font-semibold text-white">{connections.length} active</span></div>
          </div>
        </div>

        <div className="card">
          <div className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-4">Indoor Environment</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Thermometer, label: 'Avg Temp',    value: `${22 + (hash(building.id) % 4)}°C`,      color: '#f59e0b' },
              { icon: Droplets,    label: 'Humidity',    value: `${45 + (hash(building.id, 3) % 20)}%`,    color: '#3b82f6' },
              { icon: Wind,        label: 'Air Quality', value: `${30 + (hash(building.id, 7) % 50)} AQI`, color: '#10b981' },
              { icon: Users,       label: 'Occupancy',   value: building.occupancy_pct ? `${building.occupancy_pct}%` : '—', color: '#8b5cf6' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="bg-bg-secondary rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1"><Icon size={11} style={{ color }} /><span className="label">{label}</span></div>
                <div className="text-base font-semibold text-white">{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-xs font-semibold text-white/50 uppercase tracking-widest">Consumption</span>
            <PeriodSelector value={period} onChange={setPeriod} />
            <button onClick={() => setShowTable(v => !v)}
              className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white/60 border border-border-subtle px-2 py-0.5 rounded-lg transition-colors ml-auto">
              <Table size={10} /> {showTable ? 'Hide' : 'Table'}
            </button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly} barGap={2} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6b8fa3' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6b8fa3' }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
              <Tooltip contentStyle={TT} />
              <Legend iconSize={9} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="elec" name="Elec (kWh)" fill="#3b82f6" opacity={0.85} radius={[3,3,0,0]} />
              <Bar dataKey="gas"  name="Gas (m³)"   fill="#f59e0b" opacity={0.75} radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <BuildingConnectionsSection siteId={building.site_id} />

        {showTable && (
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="tbl-th">Period</th>
                  <th className="tbl-th text-right">Elec (kWh)</th>
                  <th className="tbl-th text-right">Gas (m³)</th>
                  <th className="tbl-th text-right">kWh/m²</th>
                  <th className="tbl-th text-right">CO₂ (kg)</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((r, i) => (
                  <tr key={i} className="tbl-row">
                    <td className="tbl-td text-white/70">{r.month}</td>
                    <td className="tbl-td text-right font-mono text-blue-300">{r.elec.toLocaleString()}</td>
                    <td className="tbl-td text-right font-mono text-amber-300">{r.gas.toLocaleString()}</td>
                    <td className="tbl-td text-right font-mono text-green-300">{area > 0 ? (r.elec / area).toFixed(1) : '—'}</td>
                    <td className="tbl-td text-right font-mono text-white/50">{Math.round(r.elec * 0.233).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border-default bg-bg-card">
                  <td className="tbl-td font-bold text-white/50">Total</td>
                  <td className="tbl-td text-right font-bold font-mono text-blue-300">{totalElec.toLocaleString()}</td>
                  <td className="tbl-td text-right font-bold font-mono text-amber-300">{monthly.reduce((a,r)=>a+r.gas,0).toLocaleString()}</td>
                  <td className="tbl-td text-right font-bold font-mono text-green-300">{eff}</td>
                  <td className="tbl-td text-right font-bold font-mono text-white/50">{Math.round(totalElec*0.233).toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

      </div>
    </div>
  )
}

// ─── Building row (list view) ─────────────────────────────────────────────────
function BuildingRow({ building, connections, elecKwh }: { building: DBBuilding; connections: DBConnection[]; elecKwh: number }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const area = building.area_m2 ?? 1
  const eui = area > 0 && elecKwh > 0 ? (elecKwh / area).toFixed(1) : null

  return (
    <>
      <tr className="tbl-row group">
        <td className="tbl-td w-8 pr-0">
          <button
            onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-accent/10 transition-colors"
          >
            <ChevronDown size={12} className={`text-white/30 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </td>
        <td className="tbl-td cursor-pointer" onClick={() => navigate(`/buildings/${building.id}`)}>
          <div className="flex items-center gap-2">
            <Hotel size={13} className="text-accent flex-shrink-0" />
            <div>
              <div className="text-white/80 font-medium group-hover:text-accent-hover transition-colors">{building.name}</div>
              <div className="text-[10px] text-white/35 flex items-center gap-1 mt-0.5">
                <MapPin size={8} /> {building.address ?? building.sites?.cities?.name ?? '—'}
              </div>
            </div>
          </div>
        </td>
        <td className="tbl-td text-right font-mono text-white/60">{building.area_m2 ? `${building.area_m2.toLocaleString()} m²` : '—'}</td>
        <td className="tbl-td text-center"><LabelBadge label={building.energy_label} /></td>
        <td className="tbl-td text-right font-mono" style={{ color: eui ? euiColor(+eui, DEFAULT_BENCHMARK) : undefined }}>
          {eui ? `${eui} kWh/m²` : '—'}
        </td>
        <td className="tbl-td text-white/50">{building.breeam_rating ?? '—'}</td>
        <td className="tbl-td text-white/50">{building.leed_rating ?? '—'}</td>
        <td className="tbl-td text-center text-white/50">{connections.length}</td>
        <td className="tbl-td">
          <span className={`status-${(building.status ?? 'inactive').toLowerCase().replace(' ', '-')}`}>
            {building.status ?? 'Unknown'}
          </span>
        </td>
        <td className="tbl-td text-right">
          <ChevronRight size={14} className="text-white/20 group-hover:text-accent transition-colors ml-auto cursor-pointer"
            onClick={() => navigate(`/buildings/${building.id}`)} />
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={10} className="px-4 pb-3 bg-bg-secondary/40 border-b border-border-subtle">
            <div className="pt-2 space-y-1.5">
              <div className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Link2 size={9} /> Connections & Meters
              </div>
              {connections.map(c => {
                const product = c.product ?? 'Electricity'
                const color = PRODUCT_COLOR[product] ?? '#6b7280'
                const Icon  = PRODUCT_ICON[product] ?? Zap
                return (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/connections?conn=${c.id}`)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-bg-card border border-border-subtle hover:border-accent/40 hover:bg-accent/5 transition-all group/conn text-left"
                  >
                    <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                      style={{ background: color + '20' }}>
                      <Icon size={11} style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-white/75 font-medium group-hover/conn:text-accent-hover transition-colors">
                        {c.site_name ?? c.address ?? c.id}
                      </span>
                      <span className="text-[11px] text-white/30 font-mono ml-2">{c.ean_code}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-white/35 flex-shrink-0">
                      <span>{c.connection_type}</span>
                      <span className="font-mono text-white/25">{c.meter_number}</span>
                      <span className={`status-${(c.status ?? 'inactive').toLowerCase()}`}>{c.status}</span>
                      <ChevronRight size={11} className="text-white/20 group-hover/conn:text-accent" />
                    </div>
                  </button>
                )
              })}
              {connections.length === 0 && (
                <div className="text-xs text-white/25 py-2">No connections linked</div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Building list view ───────────────────────────────────────────────────────
function BuildingList() {
  const tenantId = useTenantId()
  const [tab, setTab] = useState<'list' | 'benchmark'>('list')
  const [search, setSearch] = useState('')
  const [labelFilter, setLabelFilter] = useState<EnergyLabel | ''>('')
  const [searchParams] = useSearchParams()
  const siteFilter = searchParams.get('site')

  const [buildings, setBuildings] = useState<DBBuilding[]>([])
  const [connectionsBySite, setConnectionsBySite] = useState<Record<string, DBConnection[]>>({})
  const [consumptionBySite, setConsumptionBySite] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      let query = supabase
        .from('buildings')
        .select('*, sites(name, cities(name, countries(name, code)))')
        .eq('tenant_id', tenantId)
      if (siteFilter) query = query.eq('site_id', siteFilter)
      const { data: bldgs } = await query
      setBuildings(bldgs ?? [])

      // Load all connections grouped by site_id
      const { data: conns } = await supabase
        .from('energy_connections')
        .select('*')
        .eq('tenant_id', tenantId)
      const grouped: Record<string, DBConnection[]> = {}
      const connToSite: Record<string, string> = {}
      for (const c of (conns ?? [])) {
        if (!c.site_id) continue
        if (!grouped[c.site_id]) grouped[c.site_id] = []
        grouped[c.site_id].push(c)
        connToSite[c.id] = c.site_id
      }
      setConnectionsBySite(grouped)

      // Fetch all electricity consumption and sum by site
      const connIds = Object.keys(connToSite)
      if (connIds.length > 0) {
        const { data: recs } = await supabase
          .from('consumption_records')
          .select('connection_id, consumption, unit')
          .eq('tenant_id', tenantId)
          .in('connection_id', connIds)
        const bySite: Record<string, number> = {}
        for (const r of (recs ?? [])) {
          const sId = connToSite[r.connection_id]
          if (!sId) continue
          // Only count kWh (electricity); skip m³ gas for EUI
          if (r.unit && r.unit.toLowerCase().includes('m')) continue
          bySite[sId] = (bySite[sId] ?? 0) + (r.consumption ?? 0)
        }
        setConsumptionBySite(bySite)
      }

      setLoading(false)
    }
    load()
  }, [tenantId, siteFilter])

  const filtered = buildings.filter(b => {
    const q = search.toLowerCase()
    const addr = (b.address ?? '').toLowerCase()
    return (!q || b.name.toLowerCase().includes(q) || addr.includes(q))
      && (!labelFilter || b.energy_label === labelFilter)
  })

  const totalArea = filtered.reduce((a, b) => a + (b.area_m2 ?? 0), 0)

  const benchmarkBuildings: BenchmarkBuilding[] = filtered.map(b => ({
    id: b.id,
    name: b.name,
    area_m2: b.area_m2 ?? 1,
    elec_kwh_year: consumptionBySite[b.site_id] ?? 0,
    energy_label: (b.energy_label ?? 'C') as EnergyLabel,
  }))

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Buildings" />
      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        <div className="flex items-center gap-1 bg-bg-secondary border border-border-subtle rounded-xl p-1 w-fit">
          {([['list', 'All Buildings'], ['benchmark', 'EUI Benchmarking']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === id ? 'bg-accent text-white shadow' : 'text-white/40 hover:text-white/70'}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'benchmark' ? (
          <BenchmarkingView buildings={benchmarkBuildings} />
        ) : (<>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Buildings', value: loading ? '…' : String(filtered.length), icon: Hotel,     color: '#3b82f6' },
            { label: 'Total Area',      value: `${(totalArea/1000).toFixed(0)}K m²`,     icon: Building2, color: '#8b5cf6' },
            { label: 'Total Sites',     value: String(new Set(filtered.map(b => b.site_id)).size), icon: MapPin, color: '#10b981' },
            { label: 'Connections',     value: String(Object.values(connectionsBySite).reduce((a, v) => a + v.length, 0)), icon: BarChart3, color: '#f59e0b' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card">
              <div className="flex items-center gap-1.5 mb-2"><Icon size={12} style={{ color }} /><span className="label">{label}</span></div>
              <div className="text-xl font-semibold text-white">{value}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search buildings or addresses…" className="input w-full pl-8" />
            <MapPin size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
          </div>
          <select value={labelFilter} onChange={e => setLabelFilter(e.target.value as EnergyLabel | '')} className="input">
            <option value="">All energy labels</option>
            {ENERGY_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="card text-center text-white/30 py-12">Loading buildings…</div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="tbl-th w-8" />
                  <th className="tbl-th">Building</th>
                  <th className="tbl-th text-right">Area</th>
                  <th className="tbl-th text-center">Label</th>
                  <th className="tbl-th text-right">EUI</th>
                  <th className="tbl-th">BREEAM</th>
                  <th className="tbl-th">LEED</th>
                  <th className="tbl-th text-center">Connections</th>
                  <th className="tbl-th">Status</th>
                  <th className="tbl-th" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => (
                  <BuildingRow key={b.id} building={b} connections={connectionsBySite[b.site_id] ?? []} elecKwh={consumptionBySite[b.site_id] ?? 0} />
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="tbl-td text-center text-white/30 py-8">No buildings match</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        </>)}
      </div>
    </div>
  )
}

// ─── Router ───────────────────────────────────────────────────────────────────
export default function Buildings() {
  const { id } = useParams()
  const tenantId = useTenantId()
  const [building, setBuilding] = useState<DBBuilding | null | undefined>(undefined)

  useEffect(() => {
    if (!id) return
    supabase
      .from('buildings')
      .select('*, sites(name, cities(name, countries(name, code)))')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
      .then(({ data }) => setBuilding(data ?? null))
  }, [id, tenantId])

  if (!id) return <BuildingList />
  if (building === undefined) return <div className="p-8 text-white/40">Loading…</div>
  if (building === null) return <div className="p-8 text-white/40">Building not found</div>
  return <BuildingDetail building={building} />
}
