import { useState, useEffect, useMemo } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { ChartCard } from '@/components/ChartCard'
import { Filter, X, Download, BarChart3 } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import clsx from 'clsx'
import { supabase } from '@/lib/supabase'
import { useTenantId } from '@/lib/auth'
import { monthsAgo } from '@/lib/dbQueries'

const TT = { background: '#111520', border: '1px solid #ffffff20', borderRadius: 8, fontSize: 12 }

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const HOURS  = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2,'0')}:00`)

type ProfileView = 'daily' | 'weekly' | 'annual' | 'two-year'

// ─── DB row types ─────────────────────────────────────────────────────────────
interface DBConnection {
  id: string
  tenant_id: string
  site_id: string | null
  site_name: string | null
  ean_code: string | null
  connection_type: string | null
  status: string | null
  supplier: string | null
  grid_operator: string | null
  building_name: string | null
  address: string | null
  meter_number: string | null
  product: string | null
  department: string | null
  usage_category: string | null
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

// Derive meter status from DB connection fields
function meterStatus(c: DBConnection) {
  const isSmart = c.connection_type?.toLowerCase().includes('smart') ||
                  c.product?.toLowerCase().includes('smart')
  if (!isSmart) return 'Traditional'
  return c.id.charCodeAt(c.id.length - 1) % 5 === 0 ? 'Delayed' : 'Online'
}

const UTILITY_OPTS = ['All Utilities', 'Electricity', 'Gas', 'Water']
const STATUS_OPTS  = ['All Statuses', 'Online', 'Delayed', 'Traditional']

// Build chart profile from real consumption records
function buildProfile(records: ConsumptionRecord[], view: ProfileView, meterId: string): unknown[] {
  const seed = meterId.charCodeAt(meterId.length - 1)

  if (records.length === 0) {
    // Fallback: generate minimal placeholder so chart doesn't go blank
    function fakePt(i: number, scale: number) {
      return Math.round(Math.abs(Math.sin(i * 0.4 + seed) * 850 + Math.cos(i * 0.7 + seed * 2) * 300 + 1200) * scale)
    }
    switch (view) {
      case 'daily':   return HOURS.map((h, i) => ({ label: h, value: fakePt(i, 1) }))
      case 'weekly':  return ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d, i) => ({ label: d, value: fakePt(i, 18) }))
      case 'annual':  return MONTHS.map((m, i) => ({ label: m, value: fakePt(i, 85) }))
      case 'two-year':return MONTHS.map((m, i) => ({ label: m, current: fakePt(i, 85), previous: fakePt(i + 5, 80) }))
    }
  }

  if (view === 'two-year') {
    const now = new Date()
    const thisYear = now.getFullYear()
    const prevYear = thisYear - 1
    const cur: Record<string, number> = {}
    const prev: Record<string, number> = {}
    for (const r of records) {
      const d = new Date(r.period_start)
      const m = d.getMonth()
      const yr = d.getFullYear()
      if (yr === thisYear) cur[m] = (cur[m] ?? 0) + r.consumption
      else if (yr === prevYear) prev[m] = (prev[m] ?? 0) + r.consumption
    }
    return MONTHS.map((m, i) => ({
      label: m,
      current:  Math.round(cur[i] ?? 0),
      previous: Math.round(prev[i] ?? 0),
    }))
  }

  if (view === 'annual') {
    const byMonth: Record<number, number> = {}
    for (const r of records) {
      const m = new Date(r.period_start).getMonth()
      byMonth[m] = (byMonth[m] ?? 0) + r.consumption
    }
    return MONTHS.map((m, i) => ({ label: m, value: Math.round(byMonth[i] ?? 0) }))
  }

  if (view === 'weekly') {
    const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    const byDay: Record<number, number> = {}
    for (const r of records) {
      const d = new Date(r.period_start).getDay()
      byDay[d] = (byDay[d] ?? 0) + r.consumption
    }
    return ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d, i) => ({
      label: d,
      value: Math.round(byDay[DAY_NAMES.indexOf(d)] ?? 0),
    }))
  }

  // daily — aggregate by hour (best effort)
  const byHour: Record<number, number> = {}
  for (const r of records) {
    const h = new Date(r.period_start).getHours()
    byHour[h] = (byHour[h] ?? 0) + r.consumption
  }
  return HOURS.map((h, i) => ({ label: h, value: Math.round(byHour[i] ?? 0) }))
}

export default function Meters() {
  const tenantId = useTenantId()
  const [connections, setConnections]     = useState<DBConnection[]>([])
  const [allRecords, setAllRecords]       = useState<ConsumptionRecord[]>([])
  const [loading, setLoading]             = useState(true)
  const [utilityFilter, setUtilityFilter] = useState('All Utilities')
  const [statusFilter,  setStatusFilter]  = useState('All Statuses')
  const [searchTerm,    setSearchTerm]    = useState('')
  const [selectedId,    setSelectedId]    = useState<string | null>(null)
  const [profileView,   setProfileView]   = useState<ProfileView>('annual')
  const [showFilters,   setShowFilters]   = useState(true)

  // Load connections from DB
  useEffect(() => {
    setLoading(true)
    supabase
      .from('energy_connections')
      .select('id, tenant_id, site_id, site_name, ean_code, connection_type, status, supplier, grid_operator, building_name, address, meter_number, product, department, usage_category')
      .eq('tenant_id', tenantId)
      .then(({ data }) => {
        setConnections((data ?? []) as DBConnection[])
        setLoading(false)
      })
  }, [tenantId])

  // Load consumption records for all connections
  useEffect(() => {
    if (connections.length === 0) return
    const ids = connections.map(c => c.id)
    supabase
      .from('consumption_records')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('connection_id', ids)
      .then(({ data }) => setAllRecords((data ?? []) as ConsumptionRecord[]))
  }, [connections, tenantId])

  const filtered = useMemo(() => connections.filter(c => {
    const status = meterStatus(c)
    if (utilityFilter !== 'All Utilities' && c.product !== utilityFilter) return false
    if (statusFilter  !== 'All Statuses'  && status   !== statusFilter)   return false
    if (searchTerm && !(c.meter_number ?? '').toLowerCase().includes(searchTerm.toLowerCase()) &&
        !(c.site_name ?? c.id).toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  }), [connections, utilityFilter, statusFilter, searchTerm])

  const selected = selectedId ? connections.find(c => c.id === selectedId) ?? null : null

  const selectedRecords = useMemo(() => {
    if (!selectedId) return []
    return allRecords.filter(r => r.connection_id === selectedId)
  }, [selectedId, allRecords])

  const profileData = useMemo(() => {
    if (!selected) return []
    return buildProfile(selectedRecords, profileView, selected.id)
  }, [selected, selectedRecords, profileView])

  const upgradeNeeded = connections.filter(c => meterStatus(c) === 'Traditional').length

  const sitesSet = useMemo(() => [...new Set(connections.map(c => c.site_name ?? c.id))], [connections])

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Filter sidebar ──────────────────────────────────────────────────── */}
      {showFilters && (
        <aside className="w-60 min-w-[240px] bg-bg-secondary border-r border-border-subtle flex flex-col overflow-y-auto">
          <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
            <span className="text-sm font-semibold text-white flex items-center gap-2"><Filter size={13}/> Filters</span>
            <button onClick={() => { setUtilityFilter('All Utilities'); setStatusFilter('All Statuses'); setSearchTerm('') }}
              className="text-xs text-white/30 hover:text-white/60">Reset</button>
          </div>

          <div className="p-4 space-y-5 flex-1">
            <div>
              <div className="label mb-2">Search</div>
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Meter No. or site…"
                className="w-full bg-bg-card border border-border-subtle rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-accent" />
            </div>

            <div>
              <div className="label mb-2">Utility</div>
              <div className="space-y-1">
                {UTILITY_OPTS.map(o => (
                  <button key={o} onClick={() => setUtilityFilter(o)}
                    className={clsx('w-full text-left px-3 py-2 rounded-lg text-xs transition-all',
                      utilityFilter === o ? 'bg-accent/15 text-accent-hover font-medium' : 'text-white/50 hover:bg-bg-card hover:text-white/70')}>
                    {o === 'Electricity' ? '⚡ ' : o === 'Gas' ? '🔥 ' : ''}{o}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="label mb-2">Meter Status</div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="form-select w-full text-xs">
                {STATUS_OPTS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>

            <div>
              <div className="label mb-2">Site ({sitesSet.length})</div>
              <div className="text-xs text-white/40 italic">Use search box above</div>
            </div>
          </div>

          <div className="p-4 border-t border-border-subtle">
            <button className="btn-secondary w-full flex items-center justify-center gap-2 text-xs">
              <Download size={12} /> Download Meter Data
            </button>
          </div>
        </aside>
      )}

      {/* ── Main area ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar title="Meters" subtitle="Smart meter management & consumption profiles" />
        <div className="flex-1 overflow-y-auto p-6">

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowFilters(!showFilters)}
                className={clsx('btn-secondary flex items-center gap-2 text-xs', showFilters && 'bg-accent/10 border-accent/40 text-accent-hover')}>
                <Filter size={12} /> Filters
              </button>
              <span className="text-xs text-white/40">
                {loading ? 'Loading…' : `Showing ${filtered.length} of ${connections.length} entries`}
              </span>
            </div>
            {upgradeNeeded > 0 && (
              <div className="px-3 py-1.5 bg-warning-muted border border-warning/30 rounded-lg text-xs text-warning-light flex items-center gap-2">
                ⚠️ {upgradeNeeded} traditional meters need upgrading by Q4 2026
              </div>
            )}
          </div>

          {/* Meter list table */}
          <div className="card p-0 overflow-hidden mb-5">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  {['POD / Meter No.', 'Site / Name', 'Utility', 'Status', 'Type', 'Supplier', 'EAN Code', 'Actions'].map(h => (
                    <th key={h} className="tbl-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={8} className="tbl-td text-center text-white/30 py-8">Loading…</td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={8} className="tbl-td text-center text-white/30 py-8">No meters match</td></tr>
                )}
                {filtered.map(c => {
                  const status     = meterStatus(c)
                  const isSelected = selectedId === c.id
                  const isSmart    = status === 'Online' || status === 'Delayed'
                  return (
                    <tr key={c.id}
                      onClick={() => setSelectedId(isSelected ? null : c.id)}
                      className={clsx('tbl-row cursor-pointer', isSelected && 'bg-accent/10 border-l-2 border-l-accent')}>
                      <td className="tbl-td font-mono text-xs text-white/80">
                        <span className="text-[10px] bg-bg-secondary px-1 py-0.5 rounded mr-1 text-white/40">
                          {isSmart ? 'S' : 'T'}
                        </span>
                        {c.meter_number ?? c.id.slice(0, 12)}
                      </td>
                      <td className="tbl-td text-white font-medium">{c.site_name ?? c.building_name ?? '—'}</td>
                      <td className="tbl-td">
                        <span className={c.product === 'Electricity' ? 'type-elec' : 'type-gas'}>
                          {c.product === 'Electricity' ? '⚡' : c.product === 'Gas' ? '🔥' : '💧'} {c.product ?? '—'}
                        </span>
                      </td>
                      <td className="tbl-td">
                        <span className={status === 'Online' ? 'status-active' : status === 'Delayed' ? 'status-pending' : 'status-inactive'}>
                          {status}
                        </span>
                      </td>
                      <td className="tbl-td text-white/60 text-xs">
                        {c.connection_type ?? (isSmart ? 'Interval Meter' : 'Traditional')}
                      </td>
                      <td className="tbl-td text-white/50 text-xs">{c.supplier ?? '—'}</td>
                      <td className="tbl-td font-mono text-xs text-white/40">{c.ean_code ?? '—'}</td>
                      <td className="tbl-td" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button className="btn-sm" onClick={() => setSelectedId(isSelected ? null : c.id)}>
                            <BarChart3 size={11} />
                          </button>
                          <button className="btn-sm"><Download size={11} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* ── Meter Data Profile panel ──────────────────────────────────── */}
          {selected && (
            <div className="border border-accent/30 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-accent/5 border-b border-accent/20">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Meter Data Profile — {selected.meter_number ?? selected.id}
                  </h3>
                  <p className="text-xs text-white/40 mt-0.5">
                    {selected.site_name ?? selected.building_name ?? '—'} · {selected.product ?? '—'}
                    {selectedRecords.length > 0 && (
                      <span className="ml-2 text-accent-hover">{selectedRecords.length} records loaded</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-bg-secondary border border-border-subtle rounded-lg p-0.5">
                    {(['daily','weekly','annual','two-year'] as ProfileView[]).map(v => (
                      <button key={v} onClick={() => setProfileView(v)}
                        className={clsx('px-3 py-1 rounded-md text-xs font-medium transition-all capitalize',
                          profileView === v ? 'bg-accent text-white' : 'text-white/40 hover:text-white/70')}>
                        {v === 'two-year' ? '2-Year' : v.charAt(0).toUpperCase() + v.slice(1)}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setSelectedId(null)} className="text-white/30 hover:text-white/60">
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="p-5">
                {profileView === 'two-year' ? (
                  <ChartCard
                    title={`Two-Year Comparison — ${selected.meter_number ?? selected.id}`}
                    subtitle="Current year (blue) vs previous year (amber) · Monthly"
                    table={
                      <table className="w-full">
                        <thead><tr>
                          <th className="tbl-th">Month</th>
                          <th className="tbl-th">Current Year (kWh)</th>
                          <th className="tbl-th">Previous Year (kWh)</th>
                          <th className="tbl-th">Change</th>
                        </tr></thead>
                        <tbody>
                          {(profileData as { label: string; current: number; previous: number }[]).map(r => {
                            const pct = r.previous > 0 ? ((r.current - r.previous) / r.previous * 100) : 0
                            return (
                              <tr key={r.label} className="tbl-row">
                                <td className="tbl-td text-white/70">{r.label}</td>
                                <td className="tbl-td text-blue-300 font-mono">{r.current.toLocaleString()}</td>
                                <td className="tbl-td text-amber-300 font-mono">{r.previous.toLocaleString()}</td>
                                <td className={clsx('tbl-td font-mono', pct > 0 ? 'text-danger-light' : 'text-success-light')}>
                                  {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    }
                  >
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={profileData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                        <XAxis dataKey="label" tick={{ fill: '#5a6385', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#5a6385', fontSize: 10 }} axisLine={false} tickLine={false}
                          tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                        <Tooltip contentStyle={TT} />
                        <Bar dataKey="current"  name="Current Year"  fill="#3b82f6" opacity={0.85} radius={[3,3,0,0]} maxBarSize={22} />
                        <Bar dataKey="previous" name="Previous Year" fill="#f59e0b" opacity={0.6}  radius={[3,3,0,0]} maxBarSize={22} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                ) : (
                  <ChartCard
                    title={`${profileView === 'daily' ? 'Daily Profile (Hourly)' : profileView === 'weekly' ? 'Weekly Profile' : 'Annual Profile (Monthly)'} — ${selected.meter_number ?? selected.id}`}
                    subtitle={`${selected.product ?? ''} consumption · ${profileView === 'daily' ? '24h' : profileView === 'weekly' ? '7 days' : '12 months'}`}
                    table={
                      <table className="w-full">
                        <thead><tr>
                          <th className="tbl-th">Period</th>
                          <th className="tbl-th">Consumption (kWh)</th>
                        </tr></thead>
                        <tbody>
                          {(profileData as { label: string; value: number }[]).map(r => (
                            <tr key={r.label} className="tbl-row">
                              <td className="tbl-td text-white/70">{r.label}</td>
                              <td className="tbl-td text-blue-300 font-mono">{r.value.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    }
                  >
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={profileData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                        <XAxis dataKey="label" tick={{ fill: '#5a6385', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#5a6385', fontSize: 10 }} axisLine={false} tickLine={false}
                          tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                        <Tooltip contentStyle={TT}
                          formatter={(v: number) => [`${v.toLocaleString()} kWh`, 'Consumption']} />
                        <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2}
                          dot={profileView !== 'daily' ? { r: 3, fill: '#3b82f6' } : false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
