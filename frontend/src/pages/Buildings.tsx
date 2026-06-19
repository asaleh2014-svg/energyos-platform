import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Topbar } from '@/components/layout/Topbar'
import {
  Hotel, MapPin, Zap, Flame, Leaf, Award, ChevronRight,
  BarChart3, Users, Thermometer, Droplets, Wind, ArrowLeft,
  Building2,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import {
  mockBuildingsForSite, buildingMonthly,
  LABEL_COLORS, ENERGY_LABELS, type MockBuilding, type EnergyLabel,
} from '@/lib/buildingMocks'

const MOCK_SITE_IDS = [
  'site-abu-dhabi-1', 'site-abu-dhabi-2', 'site-abu-dhabi-3',
  'site-dubai-1',     'site-dubai-2',     'site-dubai-3',
  'site-sharjah-1',   'site-sharjah-2',
]

function LabelBadge({ label }: { label: EnergyLabel }) {
  return (
    <span className="inline-flex items-center justify-center w-9 h-7 rounded font-bold text-xs text-white"
      style={{ background: LABEL_COLORS[label] }}>
      {label}
    </span>
  )
}

function BuildingDetail({ building }: { building: MockBuilding }) {
  const navigate = useNavigate()
  const monthly  = buildingMonthly(building)
  const eff      = (building.elec_kwh_year / building.area_m2).toFixed(1)
  const co2      = (building.elec_kwh_year * 0.233 / 1000).toFixed(1)
  const TT = { background: '#0d2b35', border: '1px solid #1a5568', borderRadius: 8, fontSize: 11 }

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
                <span className={`status-${building.status.toLowerCase().replace(' ', '-')}`}>{building.status}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-white/40">
                <MapPin size={12} /> {building.address}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Area', value: `${building.area_m2.toLocaleString()} m²`, icon: Building2, color: '#3b82f6' },
              { label: 'Floors',     value: String(building.floors),                    icon: Hotel,     color: '#8b5cf6' },
              { label: 'Year Built', value: String(building.year_built),                icon: Award,     color: '#f59e0b' },
              { label: 'Occupancy',  value: `${building.occupancy_pct}%`,               icon: Users,     color: '#10b981' },
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
            { label: 'Electricity/yr', value: `${(building.elec_kwh_year/1000).toFixed(0)}K kWh`, icon: Zap,       color: '#3b82f6' },
            { label: 'Gas/yr',         value: `${building.gas_m3_year.toLocaleString()} m³`,       icon: Flame,     color: '#f59e0b' },
            { label: 'Efficiency',     value: `${eff} kWh/m²`,                                     icon: BarChart3, color: '#10b981' },
            { label: 'CO₂ Emissions',  value: `${co2} tCO₂/yr`,                                    icon: Leaf,      color: '#6ee7b7' },
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
            <div><div className="label mb-1.5">BREEAM</div><span className="text-sm font-semibold text-white">{building.breeam}</span></div>
            <div><div className="label mb-1.5">LEED</div><span className="text-sm font-semibold text-white">{building.leed}</span></div>
            <div><div className="label mb-1.5">Meters</div><span className="text-sm font-semibold text-white">{building.meter_count} active</span></div>
          </div>
        </div>

        <div className="card">
          <div className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-4">Indoor Environment</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Thermometer, label: 'Avg Temp',    value: `${22 + (hash(building.id) % 4)}°C`,      color: '#f59e0b' },
              { icon: Droplets,    label: 'Humidity',    value: `${45 + (hash(building.id, 3) % 20)}%`,    color: '#3b82f6' },
              { icon: Wind,        label: 'Air Quality', value: `${30 + (hash(building.id, 7) % 50)} AQI`, color: '#10b981' },
              { icon: Users,       label: 'Occupancy',   value: `${building.occupancy_pct}%`,              color: '#8b5cf6' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="bg-bg-secondary rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1"><Icon size={11} style={{ color }} /><span className="label">{label}</span></div>
                <div className="text-base font-semibold text-white">{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-4">Monthly Consumption</div>
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

        <div className="card p-0 overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="tbl-th">Month</th>
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
                  <td className="tbl-td text-right font-mono text-green-300">{(r.elec / building.area_m2).toFixed(1)}</td>
                  <td className="tbl-td text-right font-mono text-white/50">{Math.round(r.elec * 0.233).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border-default bg-bg-card">
                <td className="tbl-td font-bold text-white/50">Total</td>
                <td className="tbl-td text-right font-bold font-mono text-blue-300">{building.elec_kwh_year.toLocaleString()}</td>
                <td className="tbl-td text-right font-bold font-mono text-amber-300">{building.gas_m3_year.toLocaleString()}</td>
                <td className="tbl-td text-right font-bold font-mono text-green-300">{eff}</td>
                <td className="tbl-td text-right font-bold font-mono text-white/50">{Math.round(building.elec_kwh_year * 0.233).toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>

      </div>
    </div>
  )
}

function BuildingRow({ building }: { building: MockBuilding }) {
  const navigate = useNavigate()
  const eff = (building.elec_kwh_year / building.area_m2).toFixed(1)
  const effColor = Number(eff) < 100 ? '#10b981' : Number(eff) < 200 ? '#f59e0b' : '#ef4444'

  return (
    <tr className="tbl-row cursor-pointer group" onClick={() => navigate(`/buildings/${building.id}`)}>
      <td className="tbl-td">
        <div className="flex items-center gap-2">
          <Hotel size={13} className="text-accent flex-shrink-0" />
          <div>
            <div className="text-white/80 font-medium group-hover:text-accent-hover transition-colors">{building.name}</div>
            <div className="text-[10px] text-white/35 flex items-center gap-1 mt-0.5">
              <MapPin size={8} /> {building.address}
            </div>
          </div>
        </div>
      </td>
      <td className="tbl-td text-right font-mono text-white/60">{building.area_m2.toLocaleString()} m²</td>
      <td className="tbl-td text-center"><LabelBadge label={building.energy_label} /></td>
      <td className="tbl-td text-right font-mono" style={{ color: effColor }}>{eff} kWh/m²</td>
      <td className="tbl-td text-right font-mono text-blue-300">{(building.elec_kwh_year/1000).toFixed(0)}K kWh</td>
      <td className="tbl-td text-right font-mono text-amber-300">{building.gas_m3_year.toLocaleString()} m³</td>
      <td className="tbl-td text-white/50">{building.breeam}</td>
      <td className="tbl-td text-white/50">{building.leed}</td>
      <td className="tbl-td text-center text-white/50">{building.meter_count}</td>
      <td className="tbl-td"><span className={`status-${building.status.toLowerCase().replace(' ', '-')}`}>{building.status}</span></td>
      <td className="tbl-td text-right">
        <ChevronRight size={14} className="text-white/20 group-hover:text-accent transition-colors ml-auto" />
      </td>
    </tr>
  )
}

function BuildingList() {
  const [search, setSearch] = useState('')
  const [labelFilter, setLabelFilter] = useState<EnergyLabel | ''>('')

  const allBuildings = MOCK_SITE_IDS.flatMap(sid => mockBuildingsForSite(sid, 3))
  const filtered = allBuildings.filter(b => {
    const q = search.toLowerCase()
    return (!q || b.name.toLowerCase().includes(q) || b.address.toLowerCase().includes(q))
      && (!labelFilter || b.energy_label === labelFilter)
  })

  const totalArea = filtered.reduce((a, b) => a + b.area_m2, 0)
  const totalElec = filtered.reduce((a, b) => a + b.elec_kwh_year, 0)
  const avgEff    = filtered.length ? (totalElec / totalArea).toFixed(1) : '—'

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Buildings" />
      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Buildings', value: String(filtered.length),                  icon: Hotel,     color: '#3b82f6' },
            { label: 'Total Area',      value: `${(totalArea/1000).toFixed(0)}K m²`,     icon: Building2, color: '#8b5cf6' },
            { label: 'Total Elec/yr',   value: `${(totalElec/1000000).toFixed(1)}M kWh`, icon: Zap,       color: '#10b981' },
            { label: 'Avg Efficiency',  value: `${avgEff} kWh/m²`,                       icon: BarChart3, color: '#f59e0b' },
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

        <div className="card p-0 overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="tbl-th">Building</th>
                <th className="tbl-th text-right">Area</th>
                <th className="tbl-th text-center">Label</th>
                <th className="tbl-th text-right">Efficiency</th>
                <th className="tbl-th text-right">Electricity</th>
                <th className="tbl-th text-right">Gas</th>
                <th className="tbl-th">BREEAM</th>
                <th className="tbl-th">LEED</th>
                <th className="tbl-th text-center">Meters</th>
                <th className="tbl-th">Status</th>
                <th className="tbl-th" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => <BuildingRow key={b.id} building={b} />)}
              {filtered.length === 0 && (
                <tr><td colSpan={11} className="tbl-td text-center text-white/30 py-8">No buildings match</td></tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}

export default function Buildings() {
  const { id } = useParams()
  if (id) {
    // ID format is `${siteId}-b${index}` — parse it to regenerate mock data
    // regardless of whether siteId is a UUID or a mock string
    const match = id.match(/^(.+)-b(\d+)$/)
    let building = null
    if (match) {
      const siteId = match[1]
      const idx    = parseInt(match[2], 10)
      building     = mockBuildingsForSite(siteId, idx + 1)[idx] ?? null
    }
    // fallback: search across hardcoded mock site IDs
    if (!building) {
      const all = MOCK_SITE_IDS.flatMap(sid => mockBuildingsForSite(sid, 3))
      building  = all.find(b => b.id === id) ?? null
    }
    if (!building) return <div className="p-8 text-white/40">Building not found</div>
    return <BuildingDetail building={building} />
  }
  return <BuildingList />
}
