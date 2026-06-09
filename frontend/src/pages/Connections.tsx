import { useState, useMemo } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Download, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X } from 'lucide-react'
import clsx from 'clsx'
import {
  FULL_CONNECTIONS, PRODUCTS, STATUSES, SUPPLIERS, GRID_OPERATORS,
  MEAS_COMPANIES, CONN_TYPES, DEPARTMENTS, BUILDINGS, MARKET_SEGS,
  MONITORINGS, CHARACTERISTICS, USAGE_CATS, TAX_CLUSTERS, CLIENTS,
  type FullConnection,
} from '@/lib/connectionsData'

const PAGE_SIZE = 10

// ─── Product dot colour ───────────────────────────────────────────────────────
const PRODUCT_COLOR: Record<string, string> = {
  Electricity: '#10b981',
  Gas:         '#f59e0b',
  Water:       '#3b82f6',
}

// ─── Filter select ────────────────────────────────────────────────────────────
function FilterSelect({
  label, value, options, onChange,
}: {
  label: string; value: string; options: readonly string[]; onChange: (v: string) => void
}) {
  return (
    <div className="mb-3">
      <div className="text-[11px] text-white/40 mb-1">{label}</div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-bg-card border border-border-subtle text-white/70 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-accent cursor-pointer"
      >
        <option value="">Select</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

// ─── Filter section ───────────────────────────────────────────────────────────
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

// ─── Active filter chip ───────────────────────────────────────────────────────
function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1 bg-accent/15 border border-accent/30 text-accent-hover text-[11px] px-2 py-0.5 rounded-full">
      {label}
      <button onClick={onRemove} className="hover:text-white"><X size={10} /></button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
interface Filters {
  ean:          string
  product:      string
  status:       string
  supplier:     string
  grid_op:      string
  meas_co:      string
  conn_type:    string
  client:       string
  department:   string
  building:     string
  market_seg:   string
  monitoring:   string
  characteristic: string
  usage_cat:    string
  tax_cluster:  string
}

const EMPTY: Filters = {
  ean:'', product:'', status:'', supplier:'', grid_op:'', meas_co:'',
  conn_type:'', client:'', department:'', building:'', market_seg:'',
  monitoring:'', characteristic:'', usage_cat:'', tax_cluster:'',
}

export default function Connections() {
  const [filters, setFilters] = useState<Filters>(EMPTY)
  const [page, setPage] = useState(1)

  const set = (key: keyof Filters) => (val: string) => {
    setFilters(f => ({ ...f, [key]: val }))
    setPage(1)
  }

  const reset = () => { setFilters(EMPTY); setPage(1) }

  // ── Filter logic ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return FULL_CONNECTIONS.filter((c: FullConnection) => {
      if (filters.ean       && !c.ean_code.toLowerCase().includes(filters.ean.toLowerCase()) &&
                               !c.name.toLowerCase().includes(filters.ean.toLowerCase())) return false
      if (filters.product   && c.product      !== filters.product)       return false
      if (filters.status    && c.status       !== filters.status)         return false
      if (filters.supplier  && c.supplier     !== filters.supplier)       return false
      if (filters.grid_op   && c.grid_operator!== filters.grid_op)        return false
      if (filters.meas_co   && c.measurement_company !== filters.meas_co) return false
      if (filters.conn_type && c.connection_type     !== filters.conn_type) return false
      if (filters.client    && c.client       !== filters.client)          return false
      if (filters.department&& c.department   !== filters.department)      return false
      if (filters.building  && c.building     !== filters.building)        return false
      if (filters.market_seg&& c.market_segment!==filters.market_seg)      return false
      if (filters.monitoring&& c.monitoring   !== filters.monitoring)      return false
      if (filters.characteristic && c.characteristic !== filters.characteristic) return false
      if (filters.usage_cat && c.usage_category !== filters.usage_cat)     return false
      if (filters.tax_cluster && c.tax_cluster  !== filters.tax_cluster)   return false
      return true
    })
  }, [filters])

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageItems  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const from       = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to         = Math.min(page * PAGE_SIZE, filtered.length)

  // ── Active chips ──────────────────────────────────────────────────────────
  const activeFilters = (Object.entries(filters) as [keyof Filters, string][]).filter(([, v]) => v)

  // ── Page number list ──────────────────────────────────────────────────────
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

        {/* ── Left filter panel ─────────────────────────────────────────── */}
        <aside className="w-[240px] min-w-[240px] bg-bg-secondary border-r border-border-subtle flex flex-col overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
            <span className="text-sm font-semibold text-white">Search filter</span>
            <button onClick={reset} title="Reset all filters" className="text-white/30 hover:text-white/70 transition-colors">
              <RefreshCw size={13} />
            </button>
          </div>

          <div className="px-4 py-3 flex-1">
            {/* EAN / Meter search */}
            <div className="mb-4">
              <div className="text-[11px] text-white/40 mb-1">Meter number / EAN</div>
              <input
                type="text"
                placeholder="Search meter or EAN..."
                value={filters.ean}
                onChange={e => set('ean')(e.target.value)}
                className="w-full bg-bg-card border border-border-subtle text-white/70 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-accent placeholder:text-white/20"
              />
            </div>

            {/* General */}
            <FilterSection title="General">
              <FilterSelect label="Product"              value={filters.product}    options={PRODUCTS}       onChange={set('product')} />
              <FilterSelect label="Status"               value={filters.status}     options={STATUSES}       onChange={set('status')} />
              <FilterSelect label="Supplier"             value={filters.supplier}   options={SUPPLIERS}      onChange={set('supplier')} />
              <FilterSelect label="Grid operator"        value={filters.grid_op}    options={GRID_OPERATORS} onChange={set('grid_op')} />
              <FilterSelect label="Measurement company"  value={filters.meas_co}    options={MEAS_COMPANIES} onChange={set('meas_co')} />
              <FilterSelect label="Connection type"      value={filters.conn_type}  options={CONN_TYPES}     onChange={set('conn_type')} />
            </FilterSection>

            {/* Client */}
            <FilterSection title="Client">
              <FilterSelect label="Client"               value={filters.client}     options={CLIENTS}        onChange={set('client')} />
              <FilterSelect label="Department"           value={filters.department} options={DEPARTMENTS}    onChange={set('department')} />
              <FilterSelect label="Building"             value={filters.building}   options={BUILDINGS}      onChange={set('building')} />
              <FilterSelect label="Market segment"       value={filters.market_seg} options={MARKET_SEGS}   onChange={set('market_seg')} />
              <FilterSelect label="Monitoring"           value={filters.monitoring} options={MONITORINGS}    onChange={set('monitoring')} />
              <FilterSelect label="Characteristic"       value={filters.characteristic} options={CHARACTERISTICS} onChange={set('characteristic')} />
              <FilterSelect label="Usage category"       value={filters.usage_cat}  options={USAGE_CATS}     onChange={set('usage_cat')} />
            </FilterSection>

            {/* Financial */}
            <FilterSection title="Financial">
              <FilterSelect label="Tax cluster"          value={filters.tax_cluster} options={TAX_CLUSTERS} onChange={set('tax_cluster')} />
            </FilterSection>
          </div>
        </aside>

        {/* ── Main content ──────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5">

            {/* Title */}
            <h1 className="text-2xl font-light text-white/80 mb-4 italic">Connections</h1>

            {/* Active filter chips */}
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {activeFilters.map(([key, val]) => (
                  <Chip key={key} label={`${key}: ${val}`} onRemove={() => set(key)('')} />
                ))}
              </div>
            )}

            {/* Pagination top + download */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {/* Page numbers */}
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
                            page === p
                              ? 'bg-accent text-white'
                              : 'text-white/50 hover:bg-bg-card'
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

                {/* Result count */}
                <span className="text-xs text-accent-hover font-medium">
                  {from}–{to} of {filtered.length} results
                </span>
              </div>

              {/* Download */}
              <button className="flex items-center gap-1.5 text-xs border border-border-default text-white/60 hover:text-white hover:border-border-default px-3 py-1.5 rounded-lg transition-all">
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
                    <tr
                      key={c.id}
                      className={clsx(
                        'border-b border-border-subtle cursor-pointer transition-colors',
                        idx % 2 === 0
                          ? 'bg-[#0d3d4a]/40 hover:bg-[#0d3d4a]/70'
                          : 'hover:bg-bg-card/50'
                      )}
                    >
                      {/* Product with coloured dot */}
                      <td className="tbl-td">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: PRODUCT_COLOR[c.product] ?? '#6b7280' }}
                          />
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
                          page === p
                            ? 'bg-accent text-white'
                            : 'text-white/50 hover:bg-bg-card'
                        )}>{p}</button>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
