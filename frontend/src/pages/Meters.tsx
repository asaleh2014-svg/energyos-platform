import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { FULL_CONNECTIONS } from '@/lib/connectionsData'
import { ChartCard } from '@/components/ChartCard'
import { Filter, X, Download, BarChart3 } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import clsx from 'clsx'

const TT = { background: '#111520', border: '1px solid #ffffff20', borderRadius: 8, fontSize: 12 }

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const HOURS  = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2,'0')}:00`)

type ProfileView = 'daily' | 'weekly' | 'annual' | 'two-year'

// Generate mock consumption profile for a meter
function mockProfile(seed: number, periods: number, scale = 1) {
  return Array.from({ length: periods }, (_, i) =>
    Math.round(Math.abs(Math.sin(i * 0.4 + seed) * 850 + Math.cos(i * 0.7 + seed * 2) * 300 + 1200) * scale)
  )
}

// Derive meter status from FullConnection fields
function meterStatus(c: { monitoring: string; id: string }) {
  const isSmart = c.monitoring === 'Smart' || c.monitoring === 'Detail consumption'
  if (!isSmart) return 'Upgrade due'
  // Fake online/delayed based on id hash
  return c.id.charCodeAt(c.id.length - 1) % 5 === 0 ? 'Delayed' : 'Online'
}

const SITES_LIST   = [...new Set(FULL_CONNECTIONS.map(c => c.name))]
const UTILITY_OPTS = ['All Utilities', 'Electricity', 'Gas', 'Water']
const STATUS_OPTS  = ['All Statuses', 'Online', 'Delayed', 'Upgrade due']

export default function Meters() {
  const [utilityFilter, setUtilityFilter] = useState('All Utilities')
  const [statusFilter,  setStatusFilter]  = useState('All Statuses')
  const [siteFilter,    setSiteFilter]    = useState('All Sites')
  const [searchTerm,    setSearchTerm]    = useState('')
  const [selectedMeter, setSelectedMeter] = useState<string | null>(null)
  const [profileView,   setProfileView]   = useState<ProfileView>('annual')
  const [showFilters,   setShowFilters]   = useState(true)

  const filtered = FULL_CONNECTIONS.filter(c => {
    const status = meterStatus(c)
    if (utilityFilter !== 'All Utilities' && c.product !== utilityFilter)  return false
    if (siteFilter    !== 'All Sites'     && c.name    !== siteFilter)     return false
    if (statusFilter  !== 'All Statuses'  && status    !== statusFilter)   return false
    if (searchTerm && !c.meter_number.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !c.name.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const selected = selectedMeter ? FULL_CONNECTIONS.find(c => c.id === selectedMeter) : null
  const upgradeNeeded = FULL_CONNECTIONS.filter(c => meterStatus(c) === 'Upgrade due').length

  // Build profile data for selected meter
  const profileData = (() => {
    if (!selected) return []
    const seed = selected.id.charCodeAt(0)
    switch (profileView) {
      case 'daily':
        return HOURS.map((h, i) => ({ label: h, value: mockProfile(seed, 24)[i] }))
      case 'weekly':
        return ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d, i) => ({
          label: d, value: mockProfile(seed, 7, 18)[i],
        }))
      case 'annual':
        return MONTHS.map((m, i) => ({ label: m, value: mockProfile(seed, 12, 85)[i] }))
      case 'two-year':
        return MONTHS.map((m, i) => ({
          label: m,
          current: mockProfile(seed, 12, 85)[i],
          previous: mockProfile(seed + 5, 12, 80)[i],
        }))
    }
  })()

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Filter sidebar ──────────────────────────────────────────────────── */}
      {showFilters && (
        <aside className="w-60 min-w-[240px] bg-bg-secondary border-r border-border-subtle flex flex-col overflow-y-auto">
          <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
            <span className="text-sm font-semibold text-white flex items-center gap-2"><Filter size={13}/> Filters</span>
            <button onClick={() => { setUtilityFilter('All Utilities'); setStatusFilter('All Statuses'); setSiteFilter('All Sites'); setSearchTerm('') }}
              className="text-xs text-white/30 hover:text-white/60">Reset</button>
          </div>

          <div className="p-4 space-y-5 flex-1">
            {/* Search */}
            <div>
              <div className="label mb-2">Search</div>
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Meter No. or site…"
                className="w-full bg-bg-card border border-border-subtle rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-accent" />
            </div>

            {/* Utility */}
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

            {/* Status */}
            <div>
              <div className="label mb-2">Meter Status</div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="form-select w-full text-xs">
                {STATUS_OPTS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>

            {/* Site */}
            <div>
              <div className="label mb-2">Site</div>
              <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)}
                className="form-select w-full text-xs">
                <option>All Sites</option>
                {SITES_LIST.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            {/* Meter type */}
            <div>
              <div className="label mb-2">Meter Type</div>
              <div className="flex flex-col gap-1 text-xs text-white/50">
                <span>• Smart (Interval)</span>
                <span>• Traditional</span>
                <span>• S/M indicator: type icon</span>
              </div>
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

          {/* Top bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowFilters(!showFilters)}
                className={clsx('btn-secondary flex items-center gap-2 text-xs', showFilters && 'bg-accent/10 border-accent/40 text-accent-hover')}>
                <Filter size={12} /> Filters
              </button>
              <span className="text-xs text-white/40">
                Showing {filtered.length} of {FULL_CONNECTIONS.length} entries
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
                  {['POD / Meter No.', 'Site', 'Country', 'Utility', 'Status', 'Type', 'Serial No.', 'Operator', 'Last Reading', 'Actions'].map(h => (
                    <th key={h} className="tbl-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const isSmart    = c.monitoring === 'Smart' || c.monitoring === 'Detail consumption'
                  const status     = meterStatus(c)
                  const isSelected = selectedMeter === c.id
                  return (
                    <tr key={c.id}
                      onClick={() => setSelectedMeter(isSelected ? null : c.id)}
                      className={clsx('tbl-row cursor-pointer', isSelected && 'bg-accent/10 border-l-2 border-l-accent')}>
                      <td className="tbl-td font-mono text-xs text-white/80">
                        <span className="text-[10px] bg-bg-secondary px-1 py-0.5 rounded mr-1 text-white/40">
                          {isSmart ? 'S' : 'M'}
                        </span>
                        {c.meter_number}
                      </td>
                      <td className="tbl-td text-white font-medium">{c.name}</td>
                      <td className="tbl-td text-white/50">🇦🇪 UAE</td>
                      <td className="tbl-td">
                        <span className={c.product === 'Electricity' ? 'type-elec' : 'type-gas'}>
                          {c.product === 'Electricity' ? '⚡' : '🔥'} {c.product}
                        </span>
                      </td>
                      <td className="tbl-td">
                        <span className={status === 'Online' ? 'status-active' : status === 'Delayed' ? 'status-pending' : 'status-inactive'}>
                          {status}
                        </span>
                      </td>
                      <td className="tbl-td text-white/60 text-xs">
                        {isSmart ? 'Interval Meter' : 'Traditional'}
                      </td>
                      <td className="tbl-td font-mono text-xs text-white/40">{c.id.replace('conn-', 'SN-00')}</td>
                      <td className="tbl-td text-white/50 text-xs">{c.measurement_company}</td>
                      <td className="tbl-td text-white/40 text-xs">2 min ago</td>
                      <td className="tbl-td" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button className="btn-sm" onClick={() => setSelectedMeter(isSelected ? null : c.id)}>
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
                    Meter Data Profile — {selected.meter_number}
                  </h3>
                  <p className="text-xs text-white/40 mt-0.5">{selected.name} · {selected.product}</p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Profile view tabs */}
                  <div className="flex items-center gap-1 bg-bg-secondary border border-border-subtle rounded-lg p-0.5">
                    {(['daily','weekly','annual','two-year'] as ProfileView[]).map(v => (
                      <button key={v} onClick={() => setProfileView(v)}
                        className={clsx('px-3 py-1 rounded-md text-xs font-medium transition-all capitalize',
                          profileView === v ? 'bg-accent text-white' : 'text-white/40 hover:text-white/70')}>
                        {v === 'two-year' ? '2-Year' : v.charAt(0).toUpperCase() + v.slice(1)}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setSelectedMeter(null)} className="text-white/30 hover:text-white/60">
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="p-5">
                {profileView === 'two-year' ? (
                  <ChartCard
                    title={`Two-Year Comparison — ${selected.meter_number}`}
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
                            const pct = ((r.current - r.previous) / r.previous * 100)
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
                    title={`${profileView === 'daily' ? 'Daily Profile (Hourly)' : profileView === 'weekly' ? 'Weekly Profile' : 'Annual Profile (Monthly)'} — ${selected.meter_number}`}
                    subtitle={`${selected.product} consumption · ${profileView === 'daily' ? '24h' : profileView === 'weekly' ? '7 days' : '12 months'}`}
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
