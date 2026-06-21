import { useState, useEffect, useRef, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useAppStore } from '@/lib/store'
import { MARKET_CONFIGS } from '@/types'
import {
  Zap, Flame, Upload, Download, CheckCircle, AlertTriangle, X, Loader2,
  TrendingUp, TrendingDown, Minus, BarChart3, Activity,
} from 'lucide-react'
import { ChartCard } from '@/components/ChartCard'
import { UnitSelect } from '@/components/UnitSelect'
import { PeriodSelector, buildPeriod, DEFAULT_PERIOD, type Period } from '@/components/PeriodSelector'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import clsx from 'clsx'
import { supabase } from '@/lib/supabase'
import { useTenantId } from '@/lib/auth'

// ─── Types ────────────────────────────────────────────────────────────────────
type PageTab = 'charts' | 'import'

interface DataPoint { label: string; electricity: number; gas: number; cost: number }

const TT = { background: '#0d1a2e', border: '1px solid #1e3a5f', borderRadius: 8, fontSize: 11 }

// ─── Real consumption hook ────────────────────────────────────────────────────
function useRealConsumption(tenantId: string) {
  const [rows,    setRows]    = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState(0)
  const refresh = useCallback(() => setVersion(v => v + 1), [])

  useEffect(() => {
    setLoading(true)
    supabase
      .from('consumption_records')
      .select('period_start, consumption, unit, cost')
      .eq('tenant_id', tenantId)
      .order('period_start')
      .then(({ data }) => { setRows(data ?? []); setLoading(false) })
  }, [tenantId, version])

  return { rows, loading, refresh }
}

type Granularity = 'monthly' | 'quarterly' | 'yearly'

function granForPeriod(p: Period): Granularity {
  if (p.granularity === 'year' || p.granularity === 'quarter') return p.granularity === 'year' ? 'yearly' : 'quarterly'
  const days = (p.to.getTime() - p.from.getTime()) / 86400000
  if (days > 365) return 'quarterly'
  if (days > 62)  return 'monthly'
  return 'monthly'
}

function filterAndBucket(rows: any[], period: Period): DataPoint[] {
  const from = period.from.toISOString().slice(0, 10)
  const to   = period.to.toISOString().slice(0, 10)
  const gran = granForPeriod(period)

  const filtered = rows.filter(r => r.period_start >= from && r.period_start <= to)

  const map: Record<string, { electricity: number; gas: number; cost: number }> = {}
  for (const r of filtered) {
    const d = r.period_start as string
    let key: string
    if (gran === 'yearly')    key = d.slice(0, 4)
    else if (gran === 'quarterly') { const m = parseInt(d.slice(5, 7)); key = `${d.slice(0, 4)}-Q${Math.ceil(m / 3)}` }
    else key = d.slice(0, 7)
    if (!map[key]) map[key] = { electricity: 0, gas: 0, cost: 0 }
    if (r.unit === 'kWh') map[key].electricity += Number(r.consumption)
    else                  map[key].gas          += Number(r.consumption)
    map[key].cost += Number(r.cost ?? 0)
  }

  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({
      label: gran === 'monthly'
        ? (() => { const d = new Date(key + '-01'); return `${d.toLocaleString('default', { month: 'short' })} '${String(d.getFullYear()).slice(2)}` })()
        : key,
      electricity: Math.round(v.electricity),
      gas:  Math.round(v.gas),
      cost: Math.round(v.cost),
    }))
}

// ─── KPI helpers ─────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, trend, color = 'default',
}: {
  label: string; value: string; sub?: string
  trend?: { pct: number; dir: 'up' | 'down' | 'flat'; good?: 'up' | 'down' }
  color?: 'default' | 'blue' | 'amber' | 'green' | 'red'
}) {
  const trendColor = !trend ? '' :
    trend.dir === 'flat' ? 'text-white/40' :
    ((trend.dir === 'up') === (trend.good === 'up')) ? 'text-emerald-400' : 'text-red-400'
  const TIcon = !trend ? null : trend.dir === 'up' ? TrendingUp : trend.dir === 'down' ? TrendingDown : Minus
  const borderColor = { default: '', blue: 'border-l-2 border-l-blue-500/40', amber: 'border-l-2 border-l-amber-500/40', green: 'border-l-2 border-l-emerald-500/40', red: 'border-l-2 border-l-red-500/40' }[color]
  return (
    <div className={clsx('card', borderColor)}>
      <div className="label mb-1 text-[10px] uppercase tracking-wider">{label}</div>
      <div className="text-xl font-semibold text-white leading-tight">{value}</div>
      <div className="flex items-center gap-2 mt-1">
        {sub && <span className="text-xs text-white/40">{sub}</span>}
        {trend && TIcon && (
          <span className={clsx('flex items-center gap-0.5 text-xs font-medium', trendColor)}>
            <TIcon size={10} /> {Math.abs(trend.pct).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Portfolio view ────────────────────────────────────────────────────────────
function PortfolioView({
  period, rows, loading,
}: {
  period: Period; rows: any[]; loading: boolean
}) {
  const [energyUnit, setEnergyUnit] = useState<'kWh' | 'MWh'>('kWh')
  const [showElec, setShowElec] = useState(true)
  const [showGas,  setShowGas]  = useState(true)

  const data = filterAndBucket(rows, period)

  // For KPIs use all rows (full portfolio history)
  const allFrom = new Date('2000-01-01'); const allTo = new Date('2099-12-31')
  const monthly = filterAndBucket(rows, { ...period, preset: 'last_12m', from: allFrom, to: allTo, granularity: 'month', label: '' })

  const sumElec = data.reduce((a, p) => a + p.electricity, 0)
  const sumGas  = data.reduce((a, p) => a + p.gas, 0)
  const sumCost = data.reduce((a, p) => a + p.cost, 0)

  // YoY: compare first half vs second half of filtered period
  const yoyPct = (() => {
    if (data.length < 2) return null
    const half = Math.floor(data.length / 2)
    const recent = data.slice(-half).reduce((a, p) => a + p.electricity, 0)
    const prior  = data.slice(0, half).reduce((a, p) => a + p.electricity, 0)
    if (prior === 0) return null
    return ((recent - prior) / prior) * 100
  })()

  const avgElec   = data.length ? sumElec / data.length : 0
  const peakElec  = Math.max(...data.map(p => p.electricity), 0)
  const peakPoint = data.find(p => p.electricity === peakElec)
  const loadFactor = peakElec > 0 ? avgElec / peakElec : 0
  const effectiveRate = sumElec > 0 ? sumCost / sumElec : 0
  const gasKwh   = sumGas * 10.55
  const totalKwh = sumElec + gasKwh
  const gasShare = totalKwh > 0 ? (gasKwh / totalKwh) * 100 : 0
  const eui      = totalKwh > 0 ? (totalKwh / 97000).toFixed(1) : '—'
  const co2      = (sumElec * 0.45 + sumGas * 2.04) / 1000
  const co2Intensity = totalKwh > 0 ? ((co2 * 1000) / totalKwh).toFixed(2) : '—'
  const unit = energyUnit

  const gran = granForPeriod(period)
  const barSize = gran === 'yearly' ? 60 : gran === 'quarterly' ? 40 : 20

  const chartData = data.map(p => ({
    label: p.label,
    electricity: showElec ? (unit === 'MWh' ? Math.round(p.electricity / 10) / 100 : p.electricity) : undefined,
    gas: showGas ? p.gas : undefined,
    cost: p.cost,
  }))

  return (
    <>
      {loading && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-white/5 border border-border-subtle text-white/40 text-xs">
          <Loader2 size={12} className="animate-spin" /> Loading consumption data…
        </div>
      )}
      {!loading && rows.length === 0 && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
          <AlertTriangle size={12} /> No consumption data — import CSV records to see charts.
        </div>
      )}
      {!loading && rows.length > 0 && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
          <CheckCircle size={12} />
          {data.length} {gran} period{data.length !== 1 ? 's' : ''} · {period.label}
        </div>
      )}

      {/* ── KPI Row 1: Volume & Cost ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KpiCard
          label="Total Electricity"
          value={unit === 'MWh' ? `${(sumElec / 1000).toFixed(0)} MWh` : `${Math.round(sumElec).toLocaleString()} kWh`}
          sub={`avg ${Math.round(avgElec).toLocaleString()} ${unit}/mo`}
          color="blue"
        />
        <KpiCard
          label="Total Gas"
          value={`${Math.round(sumGas).toLocaleString()} m³`}
          sub={`≈ ${Math.round(gasKwh).toLocaleString()} kWh equiv.`}
          color="amber"
        />
        <KpiCard
          label="Total Cost"
          value={`AED ${Math.round(sumCost).toLocaleString()}`}
          sub={`${effectiveRate.toFixed(3)} AED / kWh eff.`}
        />
        {yoyPct !== null ? (
          <KpiCard
            label="Trend (H1 vs H2)"
            value={`${yoyPct > 0 ? '+' : ''}${yoyPct.toFixed(1)}%`}
            sub="electricity half-period"
            trend={{ pct: Math.abs(yoyPct), dir: yoyPct > 1 ? 'up' : yoyPct < -1 ? 'down' : 'flat', good: 'down' }}
          />
        ) : (
          <KpiCard label="Trend" value="—" sub="need ≥2 periods" />
        )}
      </div>

      {/* ── KPI Row 2: Intensity & Performance ──────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard
          label="EUI (Energy Use Intensity)"
          value={`${eui} kWh/m²`}
          sub="vs 97,000 m² total area"
          color={Number(eui) < 150 ? 'green' : Number(eui) < 300 ? 'default' : 'red'}
        />
        <KpiCard
          label="Carbon Intensity"
          value={`${co2Intensity} kgCO₂/kWh`}
          sub={`${(co2).toFixed(0)} t CO₂ total`}
          color="default"
        />
        <KpiCard
          label="Load Factor"
          value={`${(loadFactor * 100).toFixed(0)}%`}
          sub={`peak ${Math.round(peakElec).toLocaleString()} kWh · ${peakPoint?.label ?? '—'}`}
          color={loadFactor > 0.7 ? 'green' : loadFactor > 0.5 ? 'default' : 'red'}
        />
        <KpiCard
          label="Gas / Heat Share"
          value={`${gasShare.toFixed(1)}%`}
          sub="of total energy portfolio"
          color="amber"
        />
      </div>

      {/* ── Chart controls ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <UnitSelect value={energyUnit} onChange={setEnergyUnit} />
        {[
          { active: showElec, set: setShowElec, color: 'blue',  icon: <Zap size={11}/>,   label: 'Electricity' },
          { active: showGas,  set: setShowGas,  color: 'amber', icon: <Flame size={11}/>, label: 'Gas' },
        ].map(({ active, set, color, icon, label }) => (
          <button key={label} onClick={() => set(!active)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
              active && color === 'blue'  && 'bg-blue-500/15 border-blue-500/40 text-blue-300',
              active && color === 'amber' && 'bg-amber-500/15 border-amber-500/40 text-amber-300',
              !active && 'border-border-subtle text-white/30',
            )}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ── Chart ────────────────────────────────────────────────────────── */}
      <ChartCard
        title={`${gran.charAt(0).toUpperCase() + gran.slice(1)} Consumption`}
        subtitle={`${chartData.length} periods · ${period.label}`}
        table={
          <table className="w-full">
            <thead><tr>
              <th className="tbl-th">Period</th>
              {showElec && <th className="tbl-th">Electricity ({unit})</th>}
              {showGas  && <th className="tbl-th">Gas (m³)</th>}
              <th className="tbl-th">Cost</th>
            </tr></thead>
            <tbody>
              {chartData.map(row => (
                <tr key={row.label} className="tbl-row">
                  <td className="tbl-td text-white/70">{row.label}</td>
                  {showElec && <td className="tbl-td text-blue-300">{(row.electricity ?? 0).toLocaleString()}</td>}
                  {showGas  && <td className="tbl-td text-amber-300">{(row.gas ?? 0).toLocaleString()}</td>}
                  <td className="tbl-td text-white/60">{row.cost.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      >
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 24, left: -5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis dataKey="label" tick={{ fill: '#5a6385', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="elec" tick={{ fill: '#3b82f6', fontSize: 10 }} axisLine={false} tickLine={false}
              tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`} />
            <YAxis yAxisId="gas" orientation="right" tick={{ fill: '#f59e0b', fontSize: 10 }} axisLine={false} tickLine={false}
              tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`} />
            <Tooltip contentStyle={TT}
              labelStyle={{ color: '#e8eaf2', fontWeight: 600, marginBottom: 4 }}
              formatter={(value: number, name: string) => [
                `${value.toLocaleString()} ${name === 'electricity' ? unit : 'm³'}`,
                name === 'electricity' ? 'Electricity' : 'Gas',
              ]} />
            <Legend wrapperStyle={{ fontSize: 11 }} formatter={v => v === 'electricity' ? 'Electricity' : 'Gas'} />
            {showElec && (
              <Bar yAxisId="elec" dataKey="electricity" name="electricity" fill="#3b82f6"
                opacity={0.85} radius={[3, 3, 0, 0]} maxBarSize={barSize} />
            )}
            {showGas && (
              <Line yAxisId="gas" type="monotone" dataKey="gas" name="gas"
                stroke="#f59e0b" strokeWidth={2}
                dot={chartData.length <= 20 ? { r: 3, fill: '#f59e0b' } : false}
                activeDot={{ r: 4 }} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
    </>
  )
}

// ─── CSV Import view ──────────────────────────────────────────────────────────
interface ParsedRow {
  period_start: string; period_end: string; ean_code: string
  consumption: number; unit: 'kWh' | 'm3'; cost: number; currency: string
  connection_id: string | null; error: string | null
}
interface ConnectionOption { id: string; ean_code: string; label: string }

function parseCSV(text: string): Omit<ParsedRow, 'connection_id' | 'error'>[] {
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'))
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const get  = (key: string) => vals[headers.indexOf(key)] ?? ''
    const unit = get('unit').toLowerCase()
    return {
      period_start: get('period_start'), period_end: get('period_end'),
      ean_code: get('ean_code') || get('connection_id'),
      consumption: parseFloat(get('consumption')) || 0,
      unit: (unit === 'kwh' || unit === 'kWh') ? 'kWh' : 'm3',
      cost: parseFloat(get('cost')) || 0,
      currency: get('currency') || 'AED',
    }
  })
}

function downloadTemplate() {
  const csv = [
    'period_start,period_end,ean_code,consumption,unit,cost,currency',
    '2025-01-01,2025-01-31,EAN871234567890123456,45000,kWh,17100,AED',
    '2025-02-01,2025-02-28,EAN871234567890123456,42000,kWh,15960,AED',
    '2025-01-01,2025-01-31,EAN871234567890654321,800,m3,2560,AED',
  ].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = 'consumption_import_template.csv'
  a.click()
}

function ImportView({ tenantId, onImported }: { tenantId: string; onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging]   = useState(false)
  const [rows, setRows]           = useState<ParsedRow[] | null>(null)
  const [connections, setConns]   = useState<ConnectionOption[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult]       = useState<{ ok: number; err: number } | null>(null)

  useEffect(() => {
    supabase.from('energy_connections')
      .select('id, ean_code, connection_type, site_name')
      .eq('tenant_id', tenantId)
      .then(({ data }) => setConns((data ?? []).map((c: any) => ({
        id: c.id, ean_code: c.ean_code ?? '',
        label: `${c.ean_code} · ${c.connection_type}${c.site_name ? ` · ${c.site_name}` : ''}`,
      }))))
  }, [tenantId])

  function resolveRows(parsed: Omit<ParsedRow, 'connection_id' | 'error'>[]): ParsedRow[] {
    return parsed.map(r => {
      const conn  = connections.find(c => c.ean_code === r.ean_code || c.id === r.ean_code)
      const error = !r.period_start ? 'Missing period_start'
        : !r.period_end ? 'Missing period_end'
        : isNaN(r.consumption) || r.consumption <= 0 ? 'Invalid consumption'
        : !conn ? `Unknown EAN: ${r.ean_code}` : null
      return { ...r, connection_id: conn?.id ?? null, error }
    })
  }

  function handleFile(file: File) {
    setResult(null)
    file.text().then(text => setRows(resolveRows(parseCSV(text))))
  }

  async function handleImport() {
    if (!rows) return
    setImporting(true)
    const valid = rows.filter(r => !r.error && r.connection_id)
    const records = valid.map(r => ({
      tenant_id: tenantId, connection_id: r.connection_id!,
      period_start: r.period_start, period_end: r.period_end,
      consumption: r.consumption, unit: r.unit, cost: r.cost, currency: r.currency,
    }))
    const { error } = await supabase.from('consumption_records').upsert(records, {
      onConflict: 'connection_id,period_start',
    })
    const ok  = error ? 0 : valid.length
    const err = (error ? valid.length : 0) + rows.filter(r => !!r.error).length
    setResult({ ok, err })
    setImporting(false)
    if (ok > 0) onImported()
  }

  const validCount   = rows?.filter(r => !r.error).length ?? 0
  const invalidCount = rows?.filter(r => !!r.error).length ?? 0

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-white">Import Consumption Data</h2>
          <p className="text-xs text-white/40 mt-1">Upload a CSV file to load meter readings into the platform</p>
        </div>
        <button onClick={downloadTemplate}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border-subtle text-xs text-white/50 hover:text-white/80 transition-colors">
          <Download size={12} /> Download template
        </button>
      </div>

      <div className="card mb-5 text-xs text-white/50 space-y-1">
        <p className="text-white/70 font-medium mb-2">Required columns</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          {[
            ['period_start', 'YYYY-MM-DD — start of billing period'],
            ['period_end',   'YYYY-MM-DD — end of billing period'],
            ['ean_code',     'EAN / meter ID (must match a connection)'],
            ['consumption',  'Numeric value'],
            ['unit',         'kWh or m3'],
            ['cost',         'Amount in local currency'],
            ['currency',     'AED, EUR, etc. (optional, defaults AED)'],
          ].map(([col, desc]) => (
            <div key={col} className="flex gap-2">
              <span className="font-mono text-accent">{col}</span>
              <span>{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {!rows && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          onClick={() => fileRef.current?.click()}
          className={clsx(
            'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-16 cursor-pointer transition-colors',
            dragging ? 'border-accent bg-accent/5' : 'border-border-subtle hover:border-accent/40',
          )}>
          <Upload size={28} className="text-white/30" />
          <div className="text-sm text-white/50">Drop CSV here or <span className="text-accent">browse</span></div>
          <div className="text-xs text-white/30">Only .csv files</div>
          <input ref={fileRef} type="file" accept=".csv" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        </div>
      )}

      {rows && !result && (
        <>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm text-white/70">{rows.length} rows parsed</span>
            {validCount   > 0 && <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle size={11}/> {validCount} valid</span>}
            {invalidCount > 0 && <span className="flex items-center gap-1 text-xs text-red-400"><AlertTriangle size={11}/> {invalidCount} errors</span>}
            <button onClick={() => setRows(null)} className="ml-auto text-white/30 hover:text-white/60"><X size={14} /></button>
          </div>
          <div className="card p-0 overflow-hidden mb-5">
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-bg-secondary">
                  <tr>{['Period','EAN / ID','Consumption','Unit','Cost','Status'].map(h => <th key={h} className="tbl-th">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className={clsx('tbl-row', r.error ? 'bg-red-500/5' : '')}>
                      <td className="tbl-td text-white/70">{r.period_start} → {r.period_end}</td>
                      <td className="tbl-td font-mono text-white/60">{r.ean_code}</td>
                      <td className="tbl-td text-right text-white/80">{r.consumption.toLocaleString()}</td>
                      <td className="tbl-td text-white/50">{r.unit}</td>
                      <td className="tbl-td text-right text-white/60">{r.cost.toLocaleString()} {r.currency}</td>
                      <td className="tbl-td">
                        {r.error
                          ? <span className="flex items-center gap-1 text-red-400"><AlertTriangle size={10}/>{r.error}</span>
                          : <span className="flex items-center gap-1 text-emerald-400"><CheckCircle size={10}/>Ready</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {connections.length === 0 && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center gap-2">
              <AlertTriangle size={12} />
              No connections found for this tenant — add connections first so EAN codes can be matched.
            </div>
          )}
          <div className="flex items-center gap-3">
            <button onClick={() => setRows(null)} className="px-4 py-2 rounded-lg border border-border-subtle text-sm text-white/50 hover:text-white/70">Cancel</button>
            <button disabled={validCount === 0 || importing} onClick={handleImport}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-40">
              {importing ? <><Loader2 size={14} className="animate-spin"/> Importing…</> : `Import ${validCount} record${validCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </>
      )}

      {result && (
        <div className="flex flex-col items-center gap-4 py-12">
          <CheckCircle size={40} className="text-emerald-400" />
          <div className="text-center">
            <p className="text-white font-semibold">{result.ok} record{result.ok !== 1 ? 's' : ''} imported</p>
            {result.err > 0 && <p className="text-xs text-red-400 mt-1">{result.err} row{result.err !== 1 ? 's' : ''} skipped</p>}
            <p className="text-xs text-white/40 mt-2">Charts will now show your real data</p>
          </div>
          <button onClick={() => { setRows(null); setResult(null) }}
            className="px-4 py-2 rounded-lg border border-border-subtle text-sm text-white/60 hover:text-white/80">
            Import more
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Analytics() {
  const { market } = useAppStore()
  const tenantId = useTenantId()
  const _cfg = MARKET_CONFIGS[market]; void _cfg

  const [tab,    setTab]    = useState<PageTab>('charts')
  // Default: span 2024-2025 to show all available demo data
  const [period, setPeriod] = useState<Period>({
    preset: 'custom', label: '2024 – 2025',
    from: new Date('2024-01-01'), to: new Date('2025-12-31'),
    granularity: 'month',
  })

  const { rows, loading, refresh } = useRealConsumption(tenantId)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Analytics" subtitle="Consumption analysis — electricity & gas" />
      <div className="flex-1 overflow-y-auto p-6">

        {/* ── Tab bar ──────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-1 bg-bg-secondary border border-border-subtle rounded-xl p-1">
            {([['charts', <BarChart3 size={11}/>, 'Charts'], ['import', <Upload size={11}/>, 'Import CSV']] as const).map(([id, icon, label]) => (
              <button key={id} onClick={() => setTab(id as PageTab)}
                className={clsx(
                  'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                  tab === id ? 'bg-accent text-white shadow' : 'text-white/40 hover:text-white/70'
                )}>
                {icon}{label}
              </button>
            ))}
          </div>

          {tab === 'charts' && (
            <PeriodSelector value={period} onChange={setPeriod} />
          )}

          {loading && <Loader2 size={13} className="animate-spin text-white/30" />}
        </div>

        {tab === 'import' ? (
          <ImportView tenantId={tenantId} onImported={() => { refresh(); setTab('charts') }} />
        ) : (
          <PortfolioView period={period} rows={rows} loading={loading} />
        )}

      </div>
    </div>
  )
}
