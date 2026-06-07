import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { MOCK_CONNECTIONS } from '@/lib/mockData'
import type { ConnectionType, ConnectionStatus } from '@/types'
import { Search, Plus, Filter } from 'lucide-react'

export default function Connections() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | ConnectionType>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | ConnectionStatus>('all')

  const filtered = MOCK_CONNECTIONS.filter(c => {
    const matchSearch = c.site_name.toLowerCase().includes(search.toLowerCase()) ||
      c.ean_code.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || c.connection_type === typeFilter
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    return matchSearch && matchType && matchStatus
  })

  const counts = {
    total: MOCK_CONNECTIONS.length,
    active: MOCK_CONNECTIONS.filter(c => c.status === 'Active').length,
    pending: MOCK_CONNECTIONS.filter(c => c.status === 'Pending').length,
    inactive: MOCK_CONNECTIONS.filter(c => c.status === 'Inactive').length,
  }

  const lastSyncLabel = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Connections" subtitle="All grid connection points" />
      <div className="flex-1 overflow-y-auto p-6">

        {/* Summary badges */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-sm text-white/50">{counts.total} total</span>
          <span className="text-white/20">·</span>
          <span className="status-active">{counts.active} active</span>
          <span className="status-pending">{counts.pending} pending</span>
          {counts.inactive > 0 && <span className="status-inactive">{counts.inactive} inactive</span>}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              className="form-input pl-8"
              placeholder="Search by site or EAN..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="form-select w-40" value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)}>
            <option value="all">All types</option>
            <option value="Electricity">Electricity</option>
            <option value="Gas">Gas</option>
          </select>
          <select className="form-select w-40" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
            <option value="all">All statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Pending">Pending</option>
          </select>
          <div className="ml-auto">
            <button className="btn-primary flex items-center gap-2">
              <Plus size={14} /> Add Connection
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle">
                {['Connection ID','Site','EAN / Meter ID','Type','Capacity','Meter','Status','Last Sync','Actions'].map(h => (
                  <th key={h} className="tbl-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center py-12 text-white/30 text-sm">No connections match your filters</td></tr>
              )}
              {filtered.map(c => (
                <tr key={c.id} className="tbl-row">
                  <td className="tbl-td font-mono text-xs text-white/50">{c.id}</td>
                  <td className="tbl-td text-white font-medium">{c.site_name}</td>
                  <td className="tbl-td ean">{c.ean_code}</td>
                  <td className="tbl-td">
                    <span className={c.connection_type === 'Electricity' ? 'type-elec' : 'type-gas'}>
                      {c.connection_type === 'Electricity' ? '⚡' : '🔥'} {c.connection_type}
                    </span>
                  </td>
                  <td className="tbl-td">{c.capacity}</td>
                  <td className="tbl-td">
                    <span className={c.meter.type === 'Smart' ? 'status-active' : 'status-pending'}>
                      {c.meter.type}
                    </span>
                  </td>
                  <td className="tbl-td">
                    <span className={`status-${c.status.toLowerCase()}`}>{c.status}</span>
                  </td>
                  <td className="tbl-td text-white/30 text-xs">{lastSyncLabel(c.meter.last_sync_at)}</td>
                  <td className="tbl-td">
                    <div className="flex gap-2">
                      <button className="btn-sm">View</button>
                      <button className="btn-sm">Edit</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}
