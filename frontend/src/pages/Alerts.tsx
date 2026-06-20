import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useTenantId } from '@/lib/auth'
import { AlertTriangle, Zap, RefreshCw, CheckCircle, TrendingUp, ReceiptText, Activity } from 'lucide-react'
import clsx from 'clsx'

interface Anomaly {
  id: string
  connection_id: string
  connection_label: string
  site_name: string | null
  period: string
  type: 'spike' | 'billing_error' | 'zero_gap' | 'tariff_mismatch'
  severity: 'warning' | 'critical'
  title: string
  detail: string
  value: number
  expected: number | null
  unit: string
}

const TYPE_META: Record<Anomaly['type'], { label: string; Icon: typeof Zap; color: string }> = {
  spike:           { label: 'Consumption Spike',  Icon: TrendingUp,    color: 'text-orange-400' },
  billing_error:   { label: 'Billing Error',      Icon: ReceiptText,   color: 'text-red-400'    },
  zero_gap:        { label: 'Zero Gap',            Icon: Activity,      color: 'text-amber-400'  },
  tariff_mismatch: { label: 'Tariff Mismatch',    Icon: AlertTriangle, color: 'text-yellow-400' },
}

const SEV_STYLE = {
  critical: 'bg-red-500/15 border-red-500/30 text-red-400',
  warning:  'bg-amber-500/10 border-amber-500/25 text-amber-400',
}

export default function Alerts() {
  const tenantId = useTenantId()
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [scanned,   setScanned]   = useState(0)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [filter,    setFilter]    = useState<'all' | Anomaly['type'] | Anomaly['severity']>('all')

  const run = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/anomalies/${tenantId}`)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setAnomalies(data.anomalies ?? [])
      setScanned(data.scanned ?? 0)
    } catch (e: any) {
      setError(e.message ?? 'Failed to run anomaly scan')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => { run() }, [run])

  const visible = filter === 'all'
    ? anomalies
    : anomalies.filter(a => a.type === filter || a.severity === filter)

  const critCount = anomalies.filter(a => a.severity === 'critical').length
  const warnCount = anomalies.filter(a => a.severity === 'warning').length

  const FILTERS: { id: typeof filter; label: string }[] = [
    { id: 'all',            label: `All (${anomalies.length})` },
    { id: 'critical',       label: `Critical (${critCount})` },
    { id: 'warning',        label: `Warning (${warnCount})` },
    { id: 'spike',          label: 'Spikes' },
    { id: 'billing_error',  label: 'Billing' },
    { id: 'tariff_mismatch',label: 'Tariff' },
    { id: 'zero_gap',       label: 'Gaps' },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Alerts" subtitle="Anomaly detection — consumption, billing & tariff checks" />
      <div className="flex-1 overflow-y-auto p-6">

        {/* KPI row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card">
            <div className="label mb-1">Records Scanned</div>
            <div className="text-2xl font-semibold text-white">{scanned}</div>
            <div className="text-xs text-white/40 mt-1">last 13 months</div>
          </div>
          <div className={clsx('card', critCount > 0 && 'border-red-500/30')}>
            <div className="label mb-1">Critical</div>
            <div className={clsx('text-2xl font-semibold', critCount > 0 ? 'text-red-400' : 'text-white')}>
              {loading ? '—' : critCount}
            </div>
            <div className="text-xs text-white/40 mt-1">require immediate attention</div>
          </div>
          <div className={clsx('card', warnCount > 0 && 'border-amber-500/20')}>
            <div className="label mb-1">Warnings</div>
            <div className={clsx('text-2xl font-semibold', warnCount > 0 ? 'text-amber-400' : 'text-white')}>
              {loading ? '—' : warnCount}
            </div>
            <div className="text-xs text-white/40 mt-1">worth investigating</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="flex items-center gap-1 bg-bg-secondary border border-border-subtle rounded-xl p-1 flex-wrap">
            {FILTERS.map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  filter === f.id ? 'bg-accent text-white shadow' : 'text-white/40 hover:text-white/70'
                )}>
                {f.label}
              </button>
            ))}
          </div>
          <button onClick={run} disabled={loading}
            className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border-subtle text-xs text-white/50 hover:text-white/80 transition-colors disabled:opacity-40">
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Scanning…' : 'Re-scan'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertTriangle size={14} /> {error}
            <span className="text-xs text-red-400/70 ml-1">(make sure the backend is running on port 3001)</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && anomalies.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <CheckCircle size={40} className="text-emerald-400" />
            <p className="text-white font-semibold">No anomalies detected</p>
            <p className="text-xs text-white/40">
              {scanned === 0
                ? 'Import consumption data first to enable anomaly detection.'
                : `${scanned} records scanned — everything looks normal.`}
            </p>
          </div>
        )}

        {/* Anomaly cards */}
        {visible.length > 0 && (
          <div className="space-y-3">
            {visible.map(a => {
              const meta = TYPE_META[a.type]
              const Icon = meta.Icon
              return (
                <div key={a.id}
                  className={clsx(
                    'card border p-4 flex gap-4',
                    a.severity === 'critical'
                      ? 'border-red-500/25 bg-red-500/5'
                      : 'border-amber-500/20 bg-amber-500/5'
                  )}>
                  {/* Icon */}
                  <div className={clsx('flex-shrink-0 mt-0.5', meta.color)}>
                    <Icon size={18} />
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap mb-1">
                      <span className={clsx(
                        'text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full border',
                        SEV_STYLE[a.severity]
                      )}>
                        {a.severity}
                      </span>
                      <span className="text-[10px] text-white/35 uppercase tracking-widest">{meta.label}</span>
                      <span className="text-[10px] text-white/30 ml-auto">{a.period}</span>
                    </div>

                    <p className="text-sm font-semibold text-white mb-1">{a.title}</p>
                    <p className="text-xs text-white/50 mb-2">{a.detail}</p>

                    <div className="flex items-center gap-4 text-xs text-white/40 flex-wrap">
                      <span>
                        <span className="text-white/60 font-mono">{a.connection_label}</span>
                      </span>
                      {a.site_name && (
                        <span>Site: <span className="text-white/60">{a.site_name}</span></span>
                      )}
                      {a.expected !== null && (
                        <span>
                          Actual <span className="text-white/60 font-mono">{a.value.toLocaleString()} {a.unit}</span>
                          {' '}vs expected <span className="text-white/60 font-mono">{a.expected.toLocaleString()} {a.unit}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
