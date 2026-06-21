import { useState, useMemo, useEffect } from 'react'
import {
  X, ChevronDown, ChevronRight, Edit2, Maximize2, Printer,
  History, Zap, Flame, Droplets, Download, ExternalLink,
  Activity, FileText, MapPin, AlertCircle, Table,
} from 'lucide-react'
import { UnitSelect } from '@/components/UnitSelect'
import { PeriodSelector, DEFAULT_PERIOD, type Period } from '@/components/PeriodSelector'
import clsx from 'clsx'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { FullConnection } from '@/lib/connectionsData'
import { supabase } from '@/lib/supabase'
import { useTenantId } from '@/lib/auth'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRODUCT_COLOR: Record<string, string> = {
  Electricity: '#10b981',
  Gas:         '#f59e0b',
  Water:       '#3b82f6',
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const SEASONAL    = [1.12,1.08,1.0,0.92,0.85,0.82,0.84,0.86,0.93,1.0,1.06,1.10]

function seedRng(conn: FullConnection) {
  const seed = (conn.ean_code ?? '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return (i: number) => 0.88 + ((seed * (i + 1) * 9301 + 49297) % 233280) / 233280 * 0.24
}

function makeConsumptionData(conn: FullConnection, period: Period) {
  const isElec   = conn.product === 'Electricity'
  const annualKwh = isElec ? conn.usage_normal + conn.usage_low : conn.usage_normal
  const rng       = seedRng(conn)
  const now       = new Date()

  // ── Monthly granularity (default, last-12m, custom spanning months) ──────
  if (period.granularity === 'month' || period.granularity === 'quarter') {
    // Enumerate months in range
    const rows: { label: string; peak: number|null; offpeak: number|null; actual: number|null; forecast: number|null }[] = []
    const cur = new Date(period.from.getFullYear(), period.from.getMonth(), 1)
    const end = new Date(period.to.getFullYear(),   period.to.getMonth(),   1)
    let idx = 0
    while (cur <= end) {
      const m   = cur.getMonth()
      const yr  = cur.getFullYear()
      const base = (annualKwh / 12) * SEASONAL[m]
      const isFuture = cur > now
      const label = `${MONTH_NAMES[m]} ${yr !== now.getFullYear() ? yr : ''}`
      const actualTotal  = Math.round(base * rng(idx))
      const forecastTotal = Math.round(base * 1.03)
      const peak    = Math.round(actualTotal * 0.62)
      const offpeak = actualTotal - peak
      rows.push(isFuture
        ? { label: label.trim(), peak: null, offpeak: null, actual: null, forecast: forecastTotal }
        : { label: label.trim(), peak, offpeak, actual: actualTotal, forecast: null })
      cur.setMonth(cur.getMonth() + 1)
      idx++
    }
    return rows
  }

  // ── Daily granularity (today / short custom range) ────────────────────────
  if (period.granularity === 'day') {
    const rows: { label: string; peak: number|null; offpeak: number|null; actual: number|null; forecast: number|null }[] = []
    const dayBase = annualKwh / 365
    const cur = new Date(period.from)
    let idx = 0
    while (cur <= period.to) {
      const isFuture = cur > now
      const label = `${cur.getDate()} ${MONTH_NAMES[cur.getMonth()]}`
      const actualTotal   = Math.round(dayBase * SEASONAL[cur.getMonth()] * rng(idx) * 30)
      const forecastTotal = Math.round(dayBase * SEASONAL[cur.getMonth()] * 1.03 * 30)
      const peak    = Math.round(actualTotal * 0.62)
      const offpeak = actualTotal - peak
      rows.push(isFuture
        ? { label, peak: null, offpeak: null, actual: null, forecast: forecastTotal }
        : { label, peak, offpeak, actual: actualTotal, forecast: null })
      cur.setDate(cur.getDate() + 1)
      idx++
    }
    return rows
  }

  // ── Yearly granularity ────────────────────────────────────────────────────
  const rows: { label: string; peak: number|null; offpeak: number|null; actual: number|null; forecast: number|null }[] = []
  for (let yr = period.from.getFullYear(); yr <= period.to.getFullYear(); yr++) {
    const isFuture = yr > now.getFullYear()
    const total     = Math.round(annualKwh * rng(yr - 2020))
    const forecast  = Math.round(annualKwh * 1.03)
    const peak    = Math.round(total * 0.62)
    const offpeak = total - peak
    rows.push(isFuture
      ? { label: String(yr), peak: null, offpeak: null, actual: null, forecast }
      : { label: String(yr), peak, offpeak, actual: total, forecast: null })
  }
  return rows
}

function makeCapacityLog() {
  return [
    { date: '01-01-2022', value: '3x250A', old: '—',     by: 'System',      on: '01-01-2022' },
    { date: '01-06-2023', value: '3x315A', old: '3x250A', by: 'Ahmad Al-H.', on: '28-05-2023' },
    { date: '01-01-2025', value: '3x400A', old: '3x315A', by: 'Ahmad Al-H.', on: '15-12-2024' },
  ]
}

function makeStatusLog(conn: FullConnection) {
  const supplier = conn.supplier
  return [
    { date: conn.connection_start || '01-01-2022', status: 'Active',   supplier, by: 'System' },
    { date: '01-06-2023',                           status: 'Inactive', supplier, by: 'Ahmad Al-H.' },
    { date: '01-07-2023',                           status: 'Active',   supplier, by: 'Ahmad Al-H.' },
  ]
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Section({
  title, defaultOpen = true, children,
}: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-border-subtle">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition-colors"
      >
        <span className="text-xs font-semibold text-accent-hover uppercase tracking-widest">{title}</span>
        {open ? <ChevronDown size={13} className="text-white/40" /> : <ChevronRight size={13} className="text-white/40" />}
      </button>
      {open && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value?: string | number | boolean | null }) {
  const display = value === null || value === undefined || value === ''
    ? <span className="text-white/25 italic">—</span>
    : typeof value === 'boolean'
      ? <span className={value ? 'text-success-light' : 'text-white/40'}>{value ? 'Yes' : 'No'}</span>
      : <span className="text-white/80">{String(value)}</span>
  return (
    <div className="flex items-start gap-2 py-1 min-h-[22px]">
      <div className="w-[148px] min-w-[148px] text-[10px] text-white/35 pt-0.5 leading-tight">{label}</div>
      <div className="flex-1 text-[11px] leading-tight break-words">{display}</div>
    </div>
  )
}

// ─── Mini GPS map (SVG UAE projection) ────────────────────────────────────────

const LON_MIN = 51.0, LON_MAX = 56.8, LAT_MIN = 22.2, LAT_MAX = 26.5
const MW = 300, MH = 170

function project(lat: number, lon: number): [number, number] {
  const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * MW
  const y = MH - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * MH
  return [x, y]
}

function MiniMap({ lat, lon, color }: { lat: number; lon: number; color: string }) {
  const [px, py] = project(lat, lon)
  return (
    <div className="rounded-lg overflow-hidden border border-border-subtle bg-[#0a2a33]">
      <svg width={MW} height={MH} viewBox={`0 0 ${MW} ${MH}`} className="w-full">
        {/* Simplified UAE outline */}
        <path
          d="M40,120 L60,110 L80,100 L100,85 L130,75 L160,65 L190,58 L220,55 L250,56 L275,60 L290,70 L295,85 L288,100 L275,110 L260,118 L240,122 L220,125 L200,124 L180,125 L160,130 L140,135 L120,140 L100,138 L80,132 L60,128 Z"
          fill="#0d3d4a" stroke="#1a6b7e" strokeWidth="1" opacity="0.6"
        />
        {/* Grid lines */}
        {[0.25,0.5,0.75].map(f => (
          <line key={`v${f}`} x1={MW*f} y1={0} x2={MW*f} y2={MH} stroke="#1a4a55" strokeWidth="0.5" opacity="0.4" />
        ))}
        {[0.25,0.5,0.75].map(f => (
          <line key={`h${f}`} x1={0} y1={MH*f} x2={MW} y2={MH*f} stroke="#1a4a55" strokeWidth="0.5" opacity="0.4" />
        ))}
        {/* Connection dot */}
        <circle cx={px} cy={py} r={10} fill={color} opacity={0.15} />
        <circle cx={px} cy={py} r={6}  fill={color} opacity={0.3} />
        <circle cx={px} cy={py} r={4}  fill={color} opacity={0.9} />
        <circle cx={px} cy={py} r={2}  fill="white" opacity={0.9} />
      </svg>
    </div>
  )
}

// ─── Meter card (matches Energiemeters block in screenshot) ───────────────────

function MeterCard({ conn, color }: { conn: FullConnection; color: string }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="rounded-xl border border-border-subtle overflow-hidden" style={{ borderTopColor: color, borderTopWidth: 3 }}>
      <div className="px-4 py-3 bg-bg-primary/40">
        <div className="grid grid-cols-2 gap-4">
          {/* Left: meter number + install date */}
          <div>
            <div className="text-[10px] text-white/40 mb-0.5">Meter number</div>
            <div className="text-sm font-bold text-white font-mono">{conn.meter_number || '—'}</div>
            <div className="text-[10px] text-white/40 mt-2 mb-0.5">Installation date</div>
            <div className="text-sm font-semibold text-white">{conn.meter_install || '—'}</div>
          </div>
          {/* Right: type + brand */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/40">Type</span>
              <span className="text-[11px] text-accent-hover font-medium">Main meter</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/40">Brand</span>
              <span className="text-[11px] text-white/70">Landis+Gyr</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/40">Brand type</span>
              <span className="text-[11px] text-white/60">E350</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/40">Monitoring</span>
              <span className="text-[11px] text-white/70">{conn.monitoring}</span>
            </div>
          </div>
        </div>
        {/* Expand toggle */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-border-subtle space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/40">Measurement company</span>
              <span className="text-[11px] text-white/70">{conn.measurement_company}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/40">Connection type</span>
              <span className="text-[11px] text-white/70">{conn.connection_type}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/40">Grid operator</span>
              <span className="text-[11px] text-white/70">{conn.grid_operator}</span>
            </div>
          </div>
        )}
      </div>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-center py-1.5 bg-bg-card/50 hover:bg-bg-card border-t border-border-subtle text-white/30 hover:text-white/60 transition-colors"
      >
        <ChevronDown size={14} className={clsx('transition-transform', expanded && 'rotate-180')} />
      </button>
    </div>
  )
}

// ─── Meter readings card (matches Meterstanden block) ─────────────────────────

function MeterReadingsCard({ conn, unit }: { conn: FullConnection; unit: string }) {
  const [expanded, setExpanded] = useState(false)
  const isElec = conn.product === 'Electricity'
  return (
    <div className="rounded-xl border border-border-subtle overflow-hidden" style={{ borderTopColor: '#10b981', borderTopWidth: 3 }}>
      <div className="px-4 py-3 bg-bg-primary/40">
        <div className="grid grid-cols-2 gap-4">
          {/* Left: Normal + return */}
          <div>
            <div className="text-[10px] text-white/40 mb-0.5">{isElec ? 'Normal' : 'Reading'}</div>
            <div className="text-lg font-bold text-white">
              {conn.reading_normal.toLocaleString()}
              <span className="text-xs font-normal text-white/50 ml-1">{unit}</span>
            </div>
            {isElec && (
              <>
                <div className="text-[10px] text-white/40 mt-2 mb-0.5">Return normal</div>
                <div className="text-sm font-semibold text-white/60">0 <span className="text-xs font-normal text-white/30">{unit}</span></div>
              </>
            )}
          </div>
          {/* Right: Low + return (electricity only) */}
          {isElec ? (
            <div>
              <div className="text-[10px] text-white/40 mb-0.5">Low</div>
              <div className="text-lg font-bold text-white">
                {conn.reading_low.toLocaleString()}
                <span className="text-xs font-normal text-white/50 ml-1">{unit}</span>
              </div>
              <div className="text-[10px] text-white/40 mt-2 mb-0.5">Return low</div>
              <div className="text-sm font-semibold text-white/60">0 <span className="text-xs font-normal text-white/30">{unit}</span></div>
            </div>
          ) : (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/40">Reading date</span>
                <span className="text-[11px] text-white/70 font-mono">{conn.reading_date}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/40">Source</span>
                <span className="text-[11px] text-white/70">{conn.measurement_company}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/40">Meter number</span>
                <span className="text-[11px] font-mono text-white/60">{conn.meter_number}</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom meta row (electricity) */}
        {isElec && (
          <div className="mt-3 pt-3 border-t border-border-subtle grid grid-cols-3 gap-2">
            <div>
              <div className="text-[10px] text-white/40 mb-0.5">Reading date</div>
              <div className="text-[11px] font-mono text-white/70">{conn.reading_date}</div>
            </div>
            <div>
              <div className="text-[10px] text-white/40 mb-0.5">Source</div>
              <div className="text-[11px] text-white/70">{conn.measurement_company}</div>
            </div>
            <div>
              <div className="text-[10px] text-white/40 mb-0.5">Meter number</div>
              <div className="text-[11px] font-mono text-white/60">{conn.meter_number}</div>
            </div>
          </div>
        )}

        {/* Expanded history rows */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-border-subtle">
            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Previous readings</div>
            <table className="w-full text-[11px]">
              <thead>
                <tr>
                  {(isElec ? ['Date','Normal','Low','Source'] : ['Date','Reading','Source']).map(h=>(
                    <th key={h} className="tbl-th text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1,2,3].map(i => {
                  const d = new Date(conn.reading_date || '2026-06-01')
                  d.setMonth(d.getMonth() - i)
                  const dateStr = `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`
                  return (
                    <tr key={i} className="tbl-row">
                      <td className="tbl-td font-mono text-white/50">{dateStr}</td>
                      <td className="tbl-td text-white/60">{(conn.reading_normal - i * Math.round(conn.usage_normal/12)).toLocaleString()}</td>
                      {isElec && <td className="tbl-td text-white/60">{(conn.reading_low - i * Math.round((conn.usage_low||0)/12)).toLocaleString()}</td>}
                      <td className="tbl-td text-white/40">{conn.measurement_company}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-center py-1.5 bg-bg-card/50 hover:bg-bg-card border-t border-border-subtle text-white/30 hover:text-white/60 transition-colors"
      >
        <ChevronDown size={14} className={clsx('transition-transform', expanded && 'rotate-180')} />
      </button>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

interface Props {
  conn: FullConnection
  onClose: () => void
}

export default function ConnectionDetail({ conn, onClose }: Props) {
  const tenantId = useTenantId()
  const color = PRODUCT_COLOR[conn.product] ?? '#6b7280'
  const capacityLog = makeCapacityLog()
  const statusLog = makeStatusLog(conn)
  const [energyUnit, setEnergyUnit] = useState<'kWh' | 'MWh'>('kWh')
  const [showTable,  setShowTable]  = useState(false)
  const [period,     setPeriod]     = useState<Period>(DEFAULT_PERIOD)
  const [dbRecords,  setDbRecords]  = useState<{ period_start: string; consumption: number }[] | null>(null)

  const isElec = conn.product === 'Electricity'
  const baseUnit = isElec ? 'kWh' : 'm³'
  const unit = isElec ? energyUnit : baseUnit

  // Fetch real consumption records from DB
  useEffect(() => {
    if (!conn.id) return
    supabase
      .from('consumption_records')
      .select('period_start, consumption')
      .eq('tenant_id', tenantId)
      .eq('connection_id', conn.id)
      .order('period_start')
      .then(({ data }) => setDbRecords(data ?? []))
  }, [conn.id, tenantId])

  // Build chart rows from real DB data, fall back to mock only if no records at all
  const rawData = useMemo(() => {
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const now = new Date()

    if (dbRecords && dbRecords.length > 0) {
      // Group real records by month key
      const byMonth: Record<string, number> = {}
      for (const r of dbRecords) {
        const key = r.period_start.slice(0, 7) // YYYY-MM
        byMonth[key] = (byMonth[key] ?? 0) + r.consumption
      }
      // Compute avg for forecast
      const vals = Object.values(byMonth)
      const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0

      const rows: { label: string; peak: number|null; offpeak: number|null; actual: number|null; forecast: number|null }[] = []
      const cur = new Date(period.from.getFullYear(), period.from.getMonth(), 1)
      const end = new Date(period.to.getFullYear(), period.to.getMonth(), 1)
      while (cur <= end) {
        const key = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}`
        const label = `${MONTHS[cur.getMonth()]}${cur.getFullYear() !== now.getFullYear() ? ` ${cur.getFullYear()}` : ''}`
        const isFuture = cur > now
        const actual = byMonth[key] ?? null
        if (isFuture || actual === null) {
          rows.push({ label, peak: null, offpeak: null, actual: null, forecast: Math.round(avg) })
        } else {
          const peak = Math.round(actual * 0.62)
          rows.push({ label, peak, offpeak: actual - peak, actual, forecast: null })
        }
        cur.setMonth(cur.getMonth() + 1)
      }
      return rows
    }
    return makeConsumptionData(conn, period)
  }, [dbRecords, conn, period])

  const chartData = rawData.map(row => {
    if (!isElec || energyUnit === 'kWh') return row
    const scale = (v: number | null) => v != null ? parseFloat((v / 1000).toFixed(3)) : null
    return { ...row, peak: scale(row.peak), offpeak: scale(row.offpeak),
      forecast: scale(row.forecast), actual: scale(row.actual) }
  })

  const ProductIcon = conn.product === 'Electricity' ? Zap
    : conn.product === 'Gas' ? Flame : Droplets

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 flex flex-col w-full max-w-[1100px] bg-bg-secondary shadow-2xl border-l border-border-subtle">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="min-h-[72px] px-5 py-3 border-b border-border-subtle"
          style={{ background: `linear-gradient(135deg, #0d3d4a 0%, #0a2a33 100%)` }}
        >
          <div className="flex items-start gap-3">
            {/* Product icon */}
            <div className="mt-1 w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}25`, border: `1px solid ${color}40` }}>
              <ProductIcon size={17} style={{ color }} />
            </div>

            {/* Title block */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white truncate">{conn.name}</h2>
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}
                >
                  {conn.product}
                </span>
                <span className={clsx(
                  'text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0',
                  conn.status === 'Active'   && 'bg-success/15 text-success-light',
                  conn.status === 'Inactive' && 'bg-danger/15 text-danger-light',
                  conn.status === 'Pending'  && 'bg-warning/15 text-warning-light',
                )}>
                  {conn.status}
                </span>
              </div>
              <div className="text-[11px] text-white/45 mt-0.5 font-mono">{conn.ean_code}</div>
              <div className="text-[11px] text-white/40 mt-0.5">
                Active since <span className="text-accent-hover">{conn.active_since}</span> with <span className="text-white/60">{conn.supplier}</span>
                {conn.contract && <> · Contract: <span className="text-white/55">{conn.contract}</span></>}
              </div>
            </div>

            {/* Action icons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {[
                { Icon: Edit2,    title: 'Edit' },
                { Icon: Maximize2,title: 'Expand' },
                { Icon: Printer,  title: 'Print' },
                { Icon: History,  title: 'History' },
              ].map(({ Icon, title }) => (
                <button key={title} title={title}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors">
                  <Icon size={15} />
                </button>
              ))}
              <button onClick={onClose} title="Close"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors ml-1">
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Body (two columns) ─────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left column — info sections */}
          <div className="w-[340px] min-w-[340px] border-r border-border-subtle overflow-y-auto bg-bg-primary/30">

            <Section title="Client">
              <Field label="Client"                 value={conn.client} />
              <Field label="Department"              value={conn.department} />
              <Field label="Name on account"         value={conn.name} />
              <Field label="Invoice address"         value={conn.invoice_address} />
              <Field label="Responsible"             value={conn.responsible} />
              <Field label="Requested by"            value={conn.requested_by} />
              <Field label="Contact person"          value={conn.contact_person} />
            </Section>

            <Section title="Connection">
              <Field label="Connection name"         value={conn.name} />
              <Field label="Object code"             value={conn.object_code} />
              <Field label="Allocation type"         value={conn.allocation_type} />
              <Field label="Product"                 value={conn.product} />
              <Field label="EAN code"                value={conn.ean_code} />
              <Field label="Characteristic"          value={conn.characteristic} />
              <Field label="Connection type"         value={conn.connection_type} />
            </Section>

            <Section title="Address & Location">
              <Field label="Street"                  value={conn.street} />
              <Field label="House number"            value={conn.house_number} />
              <Field label="Addition"                value={conn.addition} />
              <Field label="Postcode"                value={conn.postcode} />
              <Field label="City"                    value={conn.city} />
              <Field label="GPS"                     value={conn.gps} />
            </Section>

            <Section title="Building" defaultOpen={false}>
              <Field label="Building"                value={conn.building} />
              <Field label="Energy label"            value={conn.energy_label} />
            </Section>

            <Section title="Characteristics" defaultOpen={false}>
              <Field label="Usage category"          value={conn.usage_category} />
              <Field label="Usage type"              value={conn.usage_type} />
              <Field label="Market segment code"     value={conn.market_seg_code} />
              <Field label="Monitoring"              value={conn.monitoring} />
            </Section>

            <Section title="Grid Management" defaultOpen={false}>
              <Field label="Market segment"          value={conn.market_segment} />
              <Field label="Telemetry"               value={conn.telemetry} />
              <Field label="Characteristic"          value={conn.characteristic} />
              <Field label="Connection value"        value={conn.connection_value} />
              <Field label="Profile category"        value={conn.profile_category} />
              <Field label="Grid operator"           value={conn.grid_operator} />
              <Field label="Connection start"        value={conn.connection_start} />
            </Section>

            <Section title="Supplier" defaultOpen={false}>
              <Field label="Vacancy"                 value={conn.vacancy ? 'Yes' : 'No'} />
              <Field label="Status"                  value={conn.status} />
              <Field label="Active on"               value={conn.active_on} />
              <Field label="Supplier"                value={conn.supplier} />
              <Field label="Supplier contract"       value={conn.supplier_contract} />
            </Section>

            <Section title="Consumption" defaultOpen={false}>
              <Field label={`Low (standard, ${unit}/yr)`}    value={conn.usage_low   > 0 ? conn.usage_low.toLocaleString()   : '—'} />
              <Field label={`Normal (standard, ${unit}/yr)`} value={conn.usage_normal > 0 ? conn.usage_normal.toLocaleString() : '—'} />
              <Field label={`Target usage (${unit}/yr)`}     value={conn.target_usage > 0 ? conn.target_usage.toLocaleString() : '—'} />
            </Section>

            <Section title="Monitoring" defaultOpen={false}>
              <Field label="Monitoring type"         value={conn.monitoring_type} />
              <Field label="Monitoring start"        value={conn.monitoring_start} />
              <Field label="Available data"          value={conn.data_available} />
              <Field label="Measurement company"     value={conn.measurement_company} />
            </Section>

            <Section title="Financial" defaultOpen={false}>
              <Field label="Tax cluster"             value={conn.tax_cluster_label} />
              <Field label="Cost center"             value={conn.cost_center} />
              <Field label="Rubricering"             value={conn.rubricering} />
              <Field label="Costs"                   value={conn.costs} />
            </Section>

            <Section title="Comments" defaultOpen={false}>
              {conn.remarks
                ? <p className="text-[11px] text-white/60 leading-relaxed">{conn.remarks}</p>
                : <p className="text-[11px] text-white/25 italic">No comments.</p>
              }
            </Section>

          </div>

          {/* Right column — charts & data */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

            {/* Contract capacity log */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Activity size={13} className="text-accent" />
                <h3 className="text-xs font-semibold text-accent-hover uppercase tracking-widest">Contract Capacity Log</h3>
              </div>
              <div className="card p-0 overflow-hidden">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-border-subtle">
                      {['Effective', 'Value', 'Previous', 'Changed by', 'Changed on'].map(h => (
                        <th key={h} className="tbl-th text-[10px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {capacityLog.map((r, i) => (
                      <tr key={i} className="border-b border-border-subtle hover:bg-bg-card/50">
                        <td className="tbl-td font-mono text-white/60">{r.date}</td>
                        <td className="tbl-td text-accent-hover font-semibold">{r.value}</td>
                        <td className="tbl-td text-white/40">{r.old}</td>
                        <td className="tbl-td text-white/60">{r.by}</td>
                        <td className="tbl-td font-mono text-white/40">{r.on}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Consumption chart */}
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Activity size={13} className="text-accent" />
                <h3 className="text-xs font-semibold text-accent-hover uppercase tracking-widest">
                  Consumption ({unit})
                </h3>
                <PeriodSelector value={period} onChange={setPeriod} />
                {isElec && <UnitSelect value={energyUnit} onChange={setEnergyUnit} />}
                <button onClick={() => setShowTable(v => !v)}
                  className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white/60 border border-border-subtle px-2 py-0.5 rounded-lg transition-colors">
                  <Table size={10} /> {showTable ? 'Hide' : 'Table'}
                </button>
                <span className="ml-auto text-[10px] text-white/30 flex items-center gap-2">
                  {conn.product === 'Electricity' && (
                    <>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: color }} /> Peak</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: color, opacity: 0.45 }} /> Off-peak</span>
                    </>
                  )}
                  {conn.product !== 'Electricity' && (
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: color }} /> Actual</span>
                  )}
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block bg-white/20 border border-dashed border-white/30" /> Forecast</span>
                </span>
              </div>
              <div className="card p-3">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} barCategoryGap="25%" barGap={0}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a3d47" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b8fa3' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#6b8fa3' }} axisLine={false} tickLine={false}
                      tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                    <Tooltip
                      contentStyle={{ background: '#0d2b35', border: '1px solid #1a5568', borderRadius: 8, fontSize: 11 }}
                      formatter={(v: unknown, n: string) => [
                        v != null ? `${(v as number).toLocaleString()} ${unit}` : '—', n
                      ]}
                    />
                    {conn.product === 'Electricity' ? (
                      <>
                        {/* Actual: stacked peak + off-peak */}
                        <Bar dataKey="peak"    name="Peak"     stackId="actual" fill={color}  opacity={0.9}  radius={[0,0,0,0]} />
                        <Bar dataKey="offpeak" name="Off-peak" stackId="actual" fill={color}  opacity={0.45} radius={[2,2,0,0]} />
                        {/* Forecast: single bar, distinct style */}
                        <Bar dataKey="forecast" name="Forecast" fill="#ffffff" opacity={0.18} radius={[2,2,0,0]} />
                      </>
                    ) : (
                      <>
                        <Bar dataKey="actual"   name="Actual"   fill={color}   opacity={0.85} radius={[2,2,0,0]} />
                        <Bar dataKey="forecast" name="Forecast" fill="#ffffff" opacity={0.18} radius={[2,2,0,0]} />
                      </>
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Consumption data table */}
            {showTable && (
              <div className="card p-0 overflow-hidden mt-1">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-border-subtle bg-bg-secondary">
                      <th className="tbl-th">Period</th>
                      {isElec && <th className="tbl-th text-right">Peak ({unit})</th>}
                      {isElec && <th className="tbl-th text-right">Off-peak ({unit})</th>}
                      {isElec && <th className="tbl-th text-right">Total ({unit})</th>}
                      {!isElec && <th className="tbl-th text-right">Actual ({unit})</th>}
                      <th className="tbl-th text-right">Forecast ({unit})</th>
                      <th className="tbl-th text-right">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((row, i) => {
                      const isPast = isElec ? row.peak != null : row.actual != null
                      const total = isElec && row.peak != null
                        ? (row.peak + (row.offpeak ?? 0))
                        : null
                      return (
                        <tr key={i} className={clsx('tbl-row', !isPast && 'opacity-60')}>
                          <td className="tbl-td font-medium text-white/70">{row.label}</td>
                          {isElec && (
                            <>
                              <td className="tbl-td text-right font-mono text-green-300">
                                {row.peak != null ? row.peak.toLocaleString() : '—'}
                              </td>
                              <td className="tbl-td text-right font-mono text-green-300/60">
                                {row.offpeak != null ? row.offpeak.toLocaleString() : '—'}
                              </td>
                              <td className="tbl-td text-right font-mono font-semibold text-white">
                                {total != null ? total.toLocaleString() : '—'}
                              </td>
                            </>
                          )}
                          {!isElec && (
                            <td className="tbl-td text-right font-mono text-white">
                              {row.actual != null ? row.actual.toLocaleString() : '—'}
                            </td>
                          )}
                          <td className="tbl-td text-right font-mono text-white/40">
                            {row.forecast != null ? row.forecast.toLocaleString() : '—'}
                          </td>
                          <td className="tbl-td text-right">
                            <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-full',
                              isPast ? 'bg-success/10 text-success-light' : 'bg-white/5 text-white/30')}>
                              {isPast ? 'Actual' : 'Forecast'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border-default bg-bg-card">
                      <td className="tbl-td font-bold text-white/50">Total</td>
                      {isElec && (
                        <>
                          <td className="tbl-td text-right font-bold font-mono text-white">
                            {chartData.filter(r => r.peak != null).reduce((a, r) => a + (r.peak ?? 0), 0).toLocaleString()}
                          </td>
                          <td className="tbl-td text-right font-bold font-mono text-white">
                            {chartData.filter(r => r.offpeak != null).reduce((a, r) => a + (r.offpeak ?? 0), 0).toLocaleString()}
                          </td>
                          <td className="tbl-td text-right font-bold font-mono text-white">
                            {chartData.filter(r => r.peak != null).reduce((a, r) => a + (r.peak ?? 0) + (r.offpeak ?? 0), 0).toLocaleString()}
                          </td>
                        </>
                      )}
                      {!isElec && (
                        <td className="tbl-td text-right font-bold font-mono text-white">
                          {chartData.filter(r => (r as any).actual != null).reduce((a, r) => a + ((r as any).actual ?? 0), 0).toLocaleString()}
                        </td>
                      )}
                      <td className="tbl-td text-right font-bold font-mono text-white/50">
                        {chartData.filter(r => r.forecast != null).reduce((a, r) => a + (r.forecast ?? 0), 0).toLocaleString()}
                      </td>
                      <td className="tbl-td" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 flex-wrap">
              {[
                { icon: Download, label: 'Fetch Meter Data', primary: true },
                { icon: Activity, label: 'Energy Analysis' },
                { icon: ExternalLink, label: 'e-DataPortal' },
              ].map(({ icon: Icon, label, primary }) => (
                <button key={label}
                  className={clsx(
                    'flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-colors',
                    primary
                      ? 'bg-accent hover:bg-accent-hover text-white'
                      : 'border border-border-default text-white/60 hover:text-white hover:border-white/40'
                  )}>
                  <Icon size={12} /> {label}
                </button>
              ))}
            </div>

            {/* Files */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText size={13} className="text-accent" />
                <h3 className="text-xs font-semibold text-accent-hover uppercase tracking-widest">Files</h3>
              </div>
              <div className="card px-4 py-3">
                <p className="text-[11px] text-white/30 italic">No files attached to this connection.</p>
              </div>
            </div>

            {/* GPS Map */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={13} className="text-accent" />
                <h3 className="text-xs font-semibold text-accent-hover uppercase tracking-widest">Location</h3>
                <span className="text-[10px] text-white/35 ml-auto font-mono">{conn.gps}</span>
              </div>
              <MiniMap lat={conn.latitude} lon={conn.longitude} color={color} />
            </div>

            {/* Status log */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={13} className="text-accent" />
                <h3 className="text-xs font-semibold text-accent-hover uppercase tracking-widest">Status Log</h3>
              </div>
              <div className="card p-0 overflow-hidden">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-border-subtle">
                      {['Date', 'Status', 'Supplier', 'Changed by'].map(h => (
                        <th key={h} className="tbl-th text-[10px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {statusLog.map((r, i) => (
                      <tr key={i} className="border-b border-border-subtle hover:bg-bg-card/50">
                        <td className="tbl-td font-mono text-white/60">{r.date}</td>
                        <td className="tbl-td">
                          <span className={clsx(
                            'text-[10px] px-2 py-0.5 rounded-full font-medium',
                            r.status === 'Active'   && 'bg-success/15 text-success-light',
                            r.status === 'Inactive' && 'bg-danger/15 text-danger-light',
                          )}>
                            {r.status}
                          </span>
                        </td>
                        <td className="tbl-td text-white/60">{r.supplier}</td>
                        <td className="tbl-td text-white/50">{r.by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Energy meters */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap size={13} className="text-accent" />
                <h3 className="text-xs font-semibold text-accent-hover uppercase tracking-widest">Energy Meters</h3>
              </div>
              <MeterCard conn={conn} color={color} />
            </div>

            {/* Meter readings */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Activity size={13} className="text-accent" />
                <h3 className="text-xs font-semibold text-accent-hover uppercase tracking-widest">Meter Readings</h3>
              </div>
              <MeterReadingsCard conn={conn} unit={unit} />
            </div>

            {/* Bottom spacer */}
            <div className="h-4" />
          </div>
        </div>
      </div>
    </div>
  )
}
