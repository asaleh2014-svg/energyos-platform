import { useState, useMemo } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import {
  Download, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  X, List, Map as MapIcon, Zap, Flame, Droplets, Gauge, AlertTriangle,
} from 'lucide-react'
import { format } from 'date-fns'
import { MOCK_CONNECTIONS } from '@/lib/mockData'
import clsx from 'clsx'
import {
  FULL_CONNECTIONS, PRODUCTS, STATUSES, SUPPLIERS, GRID_OPERATORS,
  MEAS_COMPANIES, CONN_TYPES, DEPARTMENTS, BUILDINGS, MARKET_SEGS,
  MONITORINGS, CHARACTERISTICS, USAGE_CATS, TAX_CLUSTERS, CLIENTS,
  type FullConnection,
} from '@/lib/connectionsData'
import ConnectionDetail from '@/components/connections/ConnectionDetail'

const PAGE_SIZE = 10

// ─── Product colours ──────────────────────────────────────────────────────────
const PRODUCT_COLOR: Record<string, string> = {
  Electricity: '#10b981',
  Gas:         '#f59e0b',
  Water:       '#3b82f6',
}
const PRODUCT_ICON: Record<string, React.ElementType> = {
  Electricity: Zap,
  Gas:         Flame,
  Water:       Droplets,
}

// ─── Filter helpers ───────────────────────────────────────────────────────────
function FilterSelect({
  label, value, options, onChange,
}: { label: string; value: string; options: readonly string[]; onChange: (v: string) => void }) {
  return (
    <div className="mb-3">
      <div className="text-[11px] text-white/40 mb-1">{label}</div>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-bg-card border border-border-subtle text-white/70 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-accent cursor-pointer">
        <option value="">Select</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="text-[10px] font-semibold text-accent-hover uppercase tracking-widest mb-2 pb-1 border-b border-border-subtle">
        {title}
      </div>
      {children}
    </div>
  )
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1 bg-accent/15 border border-accent/30 text-accent-hover text-[11px] px-2 py-0.5 rounded-full">
      {label}
      <button onClick={onRemove} className="hover:text-white"><X size={10} /></button>
    </div>
  )
}

// ─── UAE Map projection ───────────────────────────────────────────────────────
const LON_MIN = 51.0, LON_MAX = 56.8, LAT_MIN = 22.2, LAT_MAX = 26.5
const MW = 760, MH = 440

function project(lat: number, lon: number): [number, number] {
  const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * MW
  const y = MH - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * MH
  return [x, y]
}

// ─── Connections Map view ─────────────────────────────────────────────────────
function ConnectionsMap({
  connections,
  onSelect,
}: {
  connections: FullConnection[]
  onSelect: (c: FullConnection) => void
}) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; conn: FullConnection } | null>(null)

  return (
    <div className="card p-0 overflow-hidden relative" style={{ background: '#061c22' }}>
      <svg width="100%" viewBox={`0 0 ${MW} ${MH}`} style={{ display: 'block' }}>
        {/* ── Background gradient ── */}
        <defs>
          <radialGradient id="mapBg" cx="50%" cy="50%" r="70%">
            <stop offset="0%"   stopColor="#0d3d4a" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#061c22" stopOpacity="1" />
          </radialGradient>
        </defs>
        <rect width={MW} height={MH} fill="url(#mapBg)" />

        {/* ── Grid ── */}
        {[0.2,0.4,0.6,0.8].map(f => (
          <line key={`v${f}`} x1={MW*f} y1={0} x2={MW*f} y2={MH}
            stroke="#1a4a55" strokeWidth="0.5" opacity="0.4" />
        ))}
        {[0.2,0.4,0.6,0.8].map(f => (
          <line key={`h${f}`} x1={0} y1={MH*f} x2={MW} y2={MH*f}
            stroke="#1a4a55" strokeWidth="0.5" opacity="0.4" />
        ))}

        {/* ── UAE simplified outline ── */}
        <path
          d="M90,320 L130,290 L170,265 L220,245 L270,228 L330,215 L390,205 L450,202 L510,204 L560,210 L600,222 L630,238 L648,260 L650,285 L640,308 L620,325 L595,338 L565,346 L535,350 L500,348 L470,350 L440,358 L410,368 L380,375 L350,378 L320,372 L290,362 L260,348 L230,335 L200,325 L170,318 L140,318 Z"
          fill="#0d3d4a" stroke="#1a6b7e" strokeWidth="1.5" opacity="0.55"
        />
        {/* Abu Dhabi island rough */}
        <path d="M390,320 L420,310 L440,318 L435,338 L410,344 L392,336 Z"
          fill="#112f3a" stroke="#1a5a6e" strokeWidth="1" opacity="0.5" />

        {/* ── Emirate labels ── */}
        {[
          { label: 'Abu Dhabi', lat: 24.2, lon: 54.3 },
          { label: 'Dubai',     lat: 25.0, lon: 55.15 },
          { label: 'Sharjah',   lat: 25.32, lon: 55.37 },
          { label: 'RAK',       lat: 25.75, lon: 55.95 },
        ].map(({ label, lat, lon }) => {
          const [x, y] = project(lat, lon)
          return (
            <text key={label} x={x} y={y} fontSize={11} fill="#2a7a8e"
              textAnchor="middle" fontFamily="system-ui" opacity={0.6}
              style={{ userSelect: 'none', pointerEvents: 'none' }}
            >{label}</text>
          )
        })}

        {/* ── Connection dots ── */}
        {connections.map(c => {
          const [x, y] = project(c.latitude, c.longitude)
          const color = PRODUCT_COLOR[c.product] ?? '#6b7280'
          const isHov = hovered === c.id
          return (
            <g key={c.id}
              className="cursor-pointer"
              onMouseEnter={e => {
                setHovered(c.id)
                setTooltip({ x: e.clientX, y: e.clientY, conn: c })
              }}
              onMouseMove={e => {
                if (tooltip?.conn.id === c.id) {
                  setTooltip({ x: e.clientX, y: e.clientY, conn: c })
                }
              }}
              onMouseLeave={() => { setHovered(null); setTooltip(null) }}
              onClick={() => onSelect(c)}
            >
              {/* Pulse ring */}
              {isHov && (
                <circle cx={x} cy={y} r={16} fill={color} opacity={0.12} />
              )}
              <circle cx={x} cy={y} r={isHov ? 10 : 7} fill={color} opacity={0.18} />
              <circle cx={x} cy={y} r={isHov ? 6 : 4.5} fill={color} opacity={0.5} />
              <circle cx={x} cy={y} r={isHov ? 3.5 : 2.5} fill={color} opacity={1} />
              <circle cx={x} cy={y} r={isHov ? 1.5 : 1.2} fill="white" opacity={0.9} />
            </g>
          )
        })}

        {/* ── Legend ── */}
        {(['Electricity','Gas','Water'] as const).map((p, i) => {
          const color = PRODUCT_COLOR[p]
          return (
            <g key={p} transform={`translate(${MW - 120}, ${20 + i * 20})`}>
              <circle cx={6} cy={6} r={5} fill={color} opacity={0.8} />
              <text x={16} y={10} fontSize={11} fill="#8ab4c0" fontFamily="system-ui">{p}</text>
            </g>
          )
        })}
      </svg>

      {/* ── Floating tooltip ── */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-bg-secondary border border-border-subtle rounded-lg shadow-xl px-3 py-2.5 text-xs"
          style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: PRODUCT_COLOR[tooltip.conn.product] }} />
            <span className="font-semibold text-white">{tooltip.conn.name}</span>
          </div>
          <div className="text-white/50 font-mono text-[10px]">{tooltip.conn.ean_code}</div>
          <div className="text-white/40 text-[10px]">{tooltip.conn.address}, {tooltip.conn.city}</div>
          <div className="text-white/30 text-[10px] mt-0.5 italic">Click to open detail</div>
        </div>
      )}
    </div>
  )
}

// ─── Meter view helpers ───────────────────────────────────────────────────────
function lastSyncLabel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ─── Filter state ─────────────────────────────────────────────────────────────
interface Filters {
  ean: string; product: string; status: string; supplier: string
  grid_op: string; meas_co: string; conn_type: string; client: string
  department: string; building: string; market_seg: string
  monitoring: string; characteristic: string; usage_cat: string; tax_cluster: string
}
const EMPTY: Filters = {
  ean:'', product:'', status:'', supplier:'', grid_op:'', meas_co:'',
  conn_type:'', client:'', department:'', building:'', market_seg:'',
  monitoring:'', characteristic:'', usage_cat:'', tax_cluster:'',
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Connections() {
  const [filters, setFilters] = useState<Filters>(EMPTY)
  const [page, setPage]       = useState(1)
  const [viewMode, setViewMode] = useState<'list' | 'map' | 'meters'>('list')
  const [selected, setSelected] = useState<FullConnection | null>(null)

  const upgradeNeeded = MOCK_CONNECTIONS.filter(c => c.meter.type === 'Traditional').length

  const set = (key: keyof Filters) => (val: string) => {
    setFilters(f => ({ ...f, [key]: val })); setPage(1)
  }
  const reset = () => { setFilters(EMPTY); setPage(1) }

  const filtered = useMemo(() => FULL_CONNECTIONS.filter(c => {
    if (filters.ean       && !c.ean_code.toLowerCase().includes(filters.ean.toLowerCase()) &&
                             !c.name.toLowerCase().includes(filters.ean.toLowerCase())) return false
    if (filters.product   && c.product         !== filters.product)       return false
    if (filters.status    && c.status          !== filters.status)         return false
    if (filters.supplier  && c.supplier        !== filters.supplier)       return false
    if (filters.grid_op   && c.grid_operator   !== filters.grid_op)        return false
    if (filters.meas_co   && c.measurement_company !== filters.meas_co)    return false
    if (filters.conn_type && c.connection_type !== filters.conn_type)      return false
    if (filters.client    && c.client          !== filters.client)         return false
    if (filters.department&& c.department      !== filters.department)     return false
    if (filters.building  && c.building        !== filters.building)       return false
    if (filters.market_seg&& c.market_segment  !== filters.market_seg)     return false
    if (filters.monitoring&& c.monitoring      !== filters.monitoring)     return false
    if (filters.characteristic && c.characteristic !== filters.characteristic) return false
    if (filters.usage_cat && c.usage_category  !== filters.usage_cat)     return false
    if (filters.tax_cluster && c.tax_cluster   !== filters.tax_cluster)   return false
    return true
  }), [filters])

  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE)
  const pageItems   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const from        = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to          = Math.min(page * PAGE_SIZE, filtered.length)
  const activeFilters = (Object.entries(filters) as [keyof Filters, string][]).filter(([, v]) => v)

  const pageNumbers = useMemo(() => {
    const pages: (number | '…')[] = []
    for (let i = 1; i <= Math.min(totalPages, 10); i++) pages.push(i)
    if (totalPages > 10) pages.push('…')
    return pages
  }, [totalPages])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Connections" subtitle="All grid connection points" />

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left filter panel ──────────────────────────────────────────── */}
        <aside className="w-[240px] min-w-[240px] bg-bg-secondary border-r border-border-subtle flex flex-col overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
            <span className="text-sm font-semibold text-white">Search filter</span>
            <button onClick={reset} title="Reset all filters"
              className="text-white/30 hover:text-white/70 transition-colors">
              <RefreshCw size={13} />
            </button>
          </div>

          <div className="px-4 py-3 flex-1">
            {/* EAN search */}
            <div className="mb-4">
              <div className="text-[11px] text-white/40 mb-1">Meter number / EAN</div>
              <input type="text" placeholder="Search meter or EAN..."
                value={filters.ean} onChange={e => set('ean')(e.target.value)}
                className="w-full bg-bg-card border border-border-subtle text-white/70 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-accent placeholder:text-white/20"
              />
            </div>

            <FilterSection title="General">
              <FilterSelect label="Product"             value={filters.product}   options={PRODUCTS}       onChange={set('product')} />
              <FilterSelect label="Status"              value={filters.status}    options={STATUSES}       onChange={set('status')} />
              <FilterSelect label="Supplier"            value={filters.supplier}  options={SUPPLIERS}      onChange={set('supplier')} />
              <FilterSelect label="Grid operator"       value={filters.grid_op}   options={GRID_OPERATORS} onChange={set('grid_op')} />
              <FilterSelect label="Measurement company" value={filters.meas_co}   options={MEAS_COMPANIES} onChange={set('meas_co')} />
              <FilterSelect label="Connection type"     value={filters.conn_type} options={CONN_TYPES}     onChange={set('conn_type')} />
            </FilterSection>

            <FilterSection title="Client">
              <FilterSelect label="Client"              value={filters.client}       options={CLIENTS}        onChange={set('client')} />
              <FilterSelect label="Department"          value={filters.department}   options={DEPARTMENTS}    onChange={set('department')} />
              <FilterSelect label="Building"            value={filters.building}     options={BUILDINGS}      onChange={set('building')} />
              <FilterSelect label="Market segment"      value={filters.market_seg}   options={MARKET_SEGS}    onChange={set('market_seg')} />
              <FilterSelect label="Monitoring"          value={filters.monitoring}   options={MONITORINGS}    onChange={set('monitoring')} />
              <FilterSelect label="Characteristic"      value={filters.characteristic} options={CHARACTERISTICS} onChange={set('characteristic')} />
              <FilterSelect label="Usage category"      value={filters.usage_cat}    options={USAGE_CATS}     onChange={set('usage_cat')} />
            </FilterSection>

            <FilterSection title="Meters">
              <FilterSelect label="Monitoring / Meter type" value={filters.monitoring}   options={MONITORINGS}    onChange={set('monitoring')} />
            </FilterSection>

            <FilterSection title="Financial">
              <FilterSelect label="Tax cluster"         value={filters.tax_cluster}  options={TAX_CLUSTERS}   onChange={set('tax_cluster')} />
            </FilterSection>
          </div>
        </aside>

        {/* ── Main content ───────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5">

            {/* Title row + view toggle */}
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-light text-white/80 italic">Connections</h1>

              {/* List / Meters / Map toggle */}
              <div className="flex items-center bg-bg-card border border-border-subtle rounded-lg p-0.5 gap-0.5">
                {([
                  { id: 'list',   icon: List,    label: 'List'   },
                  { id: 'meters', icon: Gauge,   label: 'Meters' },
                  { id: 'map',    icon: MapIcon, label: 'Map'    },
                ] as const).map(({ id, icon: Icon, label }) => (
                  <button key={id}
                    onClick={() => setViewMode(id)}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                      viewMode === id ? 'bg-accent text-white shadow' : 'text-white/50 hover:text-white/80'
                    )}
                  >
                    <Icon size={13} /> {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Active filter chips */}
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {activeFilters.map(([key, val]) => (
                  <Chip key={key} label={`${key}: ${val}`} onRemove={() => set(key)('')} />
                ))}
              </div>
            )}

            {/* ── METERS VIEW ──────────────────────────────────────────── */}
            {viewMode === 'meters' && (
              <div>
                {upgradeNeeded > 0 && (
                  <div className="flex items-center gap-2 p-3 mb-4 rounded-xl border border-warning/30 bg-warning/5 text-xs text-warning-light">
                    <AlertTriangle size={13} className="flex-shrink-0" />
                    {upgradeNeeded} traditional meters flagged — smart meter upgrade required under UAE regulations by Q2 2026.
                  </div>
                )}
                <div className="card p-0 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border-subtle">
                        {['Meter Number','Connection','Building','City','Type','Installed','Last Sync','Interval','Meter Status'].map(h => (
                          <th key={h} className="tbl-th whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 && (
                        <tr><td colSpan={9} className="text-center py-12 text-white/30">No meters match the active filters</td></tr>
                      )}
                      {filtered.map((c, idx) => {
                        const mc = MOCK_CONNECTIONS.find(m => m.id === c.id)
                        const meter = mc?.meter
                        const isSmart   = c.monitoring === 'Smart'
                        const isBasic   = c.monitoring === 'Basic'
                        const online    = meter ? Date.now() - new Date(meter.last_sync_at).getTime() < 3600000 : false
                        const lastSync  = meter ? lastSyncLabel(meter.last_sync_at) : '—'
                        const interval  = meter
                          ? meter.interval_minutes < 60
                            ? `${meter.interval_minutes} min`
                            : meter.interval_minutes < 1440 ? `${meter.interval_minutes / 60}h` : 'Monthly'
                          : '—'
                        return (
                          <tr key={c.id}
                            onClick={() => setSelected(c)}
                            className={clsx(
                              'border-b border-border-subtle cursor-pointer transition-colors',
                              idx % 2 === 0 ? 'bg-[#0d3d4a]/40 hover:bg-[#0d3d4a]/80' : 'hover:bg-bg-card/50'
                            )}
                          >
                            <td className="tbl-td font-mono text-white/70 whitespace-nowrap">
                              {meter?.meter_number ?? c.meter_number ?? '—'}
                            </td>
                            <td className="tbl-td text-white/80 font-medium max-w-[140px] truncate">{c.name}</td>
                            <td className="tbl-td text-white/60">{c.building}</td>
                            <td className="tbl-td text-white/60">{c.city}</td>
                            <td className="tbl-td">
                              <span className={isSmart ? 'status-active' : isBasic ? 'status-pending' : 'status-inactive'}>
                                {c.monitoring}
                              </span>
                            </td>
                            <td className="tbl-td text-white/40">
                              {meter ? format(new Date(meter.commissioned_at), 'MMM yyyy') : c.meter_install || '—'}
                            </td>
                            <td className="tbl-td text-white/40">{lastSync}</td>
                            <td className="tbl-td text-white/50">{interval}</td>
                            <td className="tbl-td">
                              {isSmart
                                ? <span className={online ? 'status-active' : 'status-pending'}>{online ? 'Online' : 'Delayed'}</span>
                                : isBasic
                                  ? <span className="status-pending">Basic</span>
                                  : <span className="status-inactive">Upgrade due</span>
                              }
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 text-[11px] text-white/30 text-right">{filtered.length} meters · click row to open connection detail</div>
              </div>
            )}

            {/* ── MAP VIEW ─────────────────────────────────────────────── */}
            {viewMode === 'map' && (
              <div>
                {/* Stats row above map */}
                <div className="flex gap-3 mb-3 flex-wrap">
                  {(['Electricity','Gas','Water'] as const).map(p => {
                    const count = filtered.filter(c => c.product === p).length
                    const Icon = PRODUCT_ICON[p]
                    return (
                      <div key={p} className="flex items-center gap-2 bg-bg-card border border-border-subtle rounded-lg px-3 py-2">
                        <Icon size={13} style={{ color: PRODUCT_COLOR[p] }} />
                        <span className="text-xs text-white/60">{p}</span>
                        <span className="text-xs font-bold" style={{ color: PRODUCT_COLOR[p] }}>{count}</span>
                      </div>
                    )
                  })}
                  <div className="ml-auto flex items-center gap-2 text-xs text-white/40">
                    <span>{filtered.length} connections shown · click to open detail</span>
                  </div>
                </div>

                <ConnectionsMap connections={filtered} onSelect={setSelected} />
              </div>
            )}

            {/* ── LIST VIEW ────────────────────────────────────────────── */}
            {viewMode === 'list' && (
              <>
                {/* Pagination top + download */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setPage(1)} disabled={page===1}
                        className="w-7 h-7 flex items-center justify-center rounded text-white/40 hover:bg-bg-card disabled:opacity-20">
                        <ChevronsLeft size={14} />
                      </button>
                      <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                        className="w-7 h-7 flex items-center justify-center rounded text-white/40 hover:bg-bg-card disabled:opacity-20">
                        <ChevronLeft size={14} />
                      </button>
                      {pageNumbers.map((p, i) =>
                        p === '…'
                          ? <span key={i} className="text-white/30 text-xs px-1">…</span>
                          : <button key={p} onClick={() => setPage(p as number)}
                              className={clsx('w-7 h-7 rounded text-xs font-medium transition-all',
                                page === p ? 'bg-accent text-white' : 'text-white/50 hover:bg-bg-card'
                              )}>{p}</button>
                      )}
                      <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages||totalPages===0}
                        className="w-7 h-7 flex items-center justify-center rounded text-white/40 hover:bg-bg-card disabled:opacity-20">
                        <ChevronRight size={14} />
                      </button>
                      <button onClick={() => setPage(totalPages)} disabled={page===totalPages||totalPages===0}
                        className="w-7 h-7 flex items-center justify-center rounded text-white/40 hover:bg-bg-card disabled:opacity-20">
                        <ChevronsRight size={14} />
                      </button>
                    </div>
                    <span className="text-xs text-accent-hover font-medium">
                      {from}–{to} of {filtered.length} results
                    </span>
                  </div>
                  <button className="flex items-center gap-1.5 text-xs border border-border-default text-white/60 hover:text-white px-3 py-1.5 rounded-lg transition-all">
                    <Download size={12} /> Download
                  </button>
                </div>

                {/* Table */}
                <div className="card p-0 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border-subtle">
                        {['Product','Client','Department','Connection name','EAN code','Address','Postcode','City','Cost center','Status'].map(h => (
                          <th key={h} className="tbl-th whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.length === 0 && (
                        <tr>
                          <td colSpan={10} className="text-center py-16 text-white/30">
                            No connections match the active filters
                          </td>
                        </tr>
                      )}
                      {pageItems.map((c, idx) => (
                        <tr key={c.id}
                          onClick={() => setSelected(c)}
                          className={clsx(
                            'border-b border-border-subtle cursor-pointer transition-colors',
                            idx % 2 === 0
                              ? 'bg-[#0d3d4a]/40 hover:bg-[#0d3d4a]/80'
                              : 'hover:bg-bg-card/50'
                          )}
                        >
                          <td className="tbl-td">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ background: PRODUCT_COLOR[c.product] ?? '#6b7280' }} />
                              <span className="text-white/80">{c.product}</span>
                            </div>
                          </td>
                          <td className="tbl-td text-white/70 max-w-[120px] truncate">{c.client}</td>
                          <td className="tbl-td text-white/60 max-w-[100px] truncate">{c.department}</td>
                          <td className="tbl-td text-white/80 font-medium max-w-[160px] truncate" title={c.name}>{c.name}</td>
                          <td className="tbl-td font-mono text-white/50 whitespace-nowrap">{c.ean_code}</td>
                          <td className="tbl-td text-white/60 max-w-[140px] truncate" title={c.address}>{c.address}</td>
                          <td className="tbl-td text-white/50 whitespace-nowrap">{c.postcode}</td>
                          <td className="tbl-td text-white/60 whitespace-nowrap">{c.city}</td>
                          <td className="tbl-td font-mono text-white/40 whitespace-nowrap text-[10px]">{c.cost_center}</td>
                          <td className="tbl-td">
                            <span className={clsx(
                              'inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full',
                              c.status === 'Active'   && 'bg-success/15 text-success-light',
                              c.status === 'Inactive' && 'bg-danger/15 text-danger-light',
                              c.status === 'Pending'  && 'bg-warning/15 text-warning-light',
                            )}>
                              <span className={clsx('w-1.5 h-1.5 rounded-full',
                                c.status === 'Active'   && 'bg-success',
                                c.status === 'Inactive' && 'bg-danger',
                                c.status === 'Pending'  && 'bg-warning',
                              )} />
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination bottom */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-1 mt-4">
                    {pageNumbers.map((p, i) =>
                      p === '…'
                        ? <span key={i} className="text-white/30 text-xs px-1">…</span>
                        : <button key={p} onClick={() => setPage(p as number)}
                            className={clsx('w-7 h-7 rounded text-xs font-medium transition-all',
                              page === p ? 'bg-accent text-white' : 'text-white/50 hover:bg-bg-card'
                            )}>{p}</button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Connection detail slide-over ───────────────────────────────────── */}
      {selected && (
        <ConnectionDetail conn={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
