import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'

const router = Router()

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
}

// UAE utility tariffs (AED per unit)
const TARIFFS: Record<string, { min: number; max: number; unit: string }> = {
  kWh: { min: 0.23, max: 0.58, unit: 'kWh' }, // DEWA/FEWA/SEWA residential+commercial range
  m3:  { min: 2.50, max: 4.50, unit: 'm3'  }, // UAE gas tariff range
}

interface ConsumptionRecord {
  id: string
  connection_id: string
  period_start: string
  consumption: number
  unit: string
  cost: number
  currency: string
}

interface ConnectionMeta {
  id: string
  ean_code: string
  connection_type: string
  site_name: string | null
  capacity: string | null
}

export interface Anomaly {
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

function mean(arr: number[]) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
}

function stddev(arr: number[], m: number) {
  if (arr.length < 2) return 0
  return Math.sqrt(arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / arr.length)
}

function detectAnomalies(
  records: ConsumptionRecord[],
  conn: ConnectionMeta,
): Anomaly[] {
  const anomalies: Anomaly[] = []
  const sorted = [...records].sort((a, b) => a.period_start.localeCompare(b.period_start))

  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i]
    const period = r.period_start.slice(0, 7)
    const label  = conn.ean_code
      ? `${conn.ean_code}${conn.connection_type ? ` · ${conn.connection_type}` : ''}`
      : conn.id

    // ── 1. Zero gap ────────────────────────────────────────────────────────────
    if (r.consumption === 0) {
      anomalies.push({
        id: `${conn.id}_${period}_zero`,
        connection_id: conn.id,
        connection_label: label,
        site_name: conn.site_name,
        period,
        type: 'zero_gap',
        severity: 'warning',
        title: 'Zero consumption recorded',
        detail: `No consumption recorded for ${period}. Meter may be offline or data was not submitted.`,
        value: 0,
        expected: null,
        unit: r.unit,
      })
      continue
    }

    // History: last 3–6 months before this period
    const history = sorted.slice(Math.max(0, i - 6), i).map(h => h.consumption).filter(v => v > 0)

    // ── 2. Consumption spike ───────────────────────────────────────────────────
    if (history.length >= 2) {
      const m  = mean(history)
      const sd = stddev(history, m)
      const threshold = m + Math.max(sd * 2, m * 0.5) // 2σ or 50% above mean

      if (r.consumption > threshold && r.consumption > m * 1.5) {
        const pct = Math.round(((r.consumption - m) / m) * 100)
        anomalies.push({
          id: `${conn.id}_${period}_spike`,
          connection_id: conn.id,
          connection_label: label,
          site_name: conn.site_name,
          period,
          type: 'spike',
          severity: pct > 100 ? 'critical' : 'warning',
          title: `Consumption spike +${pct}% vs average`,
          detail: `${r.consumption.toLocaleString()} ${r.unit} recorded vs avg ${Math.round(m).toLocaleString()} ${r.unit} over prior ${history.length} periods.`,
          value: r.consumption,
          expected: Math.round(m),
          unit: r.unit,
        })
      }
    } else if (i > 0 && history.length === 1) {
      // Simple MoM check when we only have 1 prior period
      const prev = history[0]
      const pct  = ((r.consumption - prev) / prev) * 100
      if (pct > 80) {
        anomalies.push({
          id: `${conn.id}_${period}_spike`,
          connection_id: conn.id,
          connection_label: label,
          site_name: conn.site_name,
          period,
          type: 'spike',
          severity: pct > 150 ? 'critical' : 'warning',
          title: `Consumption spike +${Math.round(pct)}% vs prior period`,
          detail: `${r.consumption.toLocaleString()} ${r.unit} vs ${prev.toLocaleString()} ${r.unit} last period.`,
          value: r.consumption,
          expected: prev,
          unit: r.unit,
        })
      }
    }

    // ── 3. Billing / tariff check ──────────────────────────────────────────────
    if (r.cost > 0 && r.consumption > 0) {
      const rate    = r.cost / r.consumption
      const tariff  = TARIFFS[r.unit]

      if (tariff) {
        if (rate < tariff.min * 0.75 || rate > tariff.max * 1.25) {
          // Rate outside 25% tolerance of known UAE tariff band
          const expectedMin = Math.round(r.consumption * tariff.min)
          const expectedMax = Math.round(r.consumption * tariff.max)
          anomalies.push({
            id: `${conn.id}_${period}_tariff`,
            connection_id: conn.id,
            connection_label: label,
            site_name: conn.site_name,
            period,
            type: 'tariff_mismatch',
            severity: 'warning',
            title: `Unusual unit rate: ${rate.toFixed(3)} AED/${r.unit}`,
            detail: `Billed at ${rate.toFixed(3)} AED/${r.unit}. Expected UAE range: ${tariff.min}–${tariff.max} AED/${r.unit} (cost ${expectedMin.toLocaleString()}–${expectedMax.toLocaleString()} AED).`,
            value: Math.round(r.cost),
            expected: Math.round((expectedMin + expectedMax) / 2),
            unit: `AED/${r.unit}`,
          })
        }

        // Billing arithmetic error: cost ≠ consumption × rate (>5% discrepancy)
        // Use midpoint of tariff as sanity check
        const midRate = (tariff.min + tariff.max) / 2
        const expectedCost = r.consumption * midRate
        const diff = Math.abs(r.cost - expectedCost) / expectedCost
        if (diff > 0.40 && r.cost > 500) {
          anomalies.push({
            id: `${conn.id}_${period}_billing`,
            connection_id: conn.id,
            connection_label: label,
            site_name: conn.site_name,
            period,
            type: 'billing_error',
            severity: diff > 0.70 ? 'critical' : 'warning',
            title: `Billed cost ${diff > 0.70 ? 'severely' : 'significantly'} off expected`,
            detail: `Billed ${r.cost.toLocaleString()} AED for ${r.consumption.toLocaleString()} ${r.unit}. Expected ~${Math.round(expectedCost).toLocaleString()} AED at UAE mid-tariff rates.`,
            value: Math.round(r.cost),
            expected: Math.round(expectedCost),
            unit: 'AED',
          })
        }
      }
    }
  }

  return anomalies
}

// GET /api/anomalies/:tenantId
router.get('/:tenantId', async (req, res) => {
  const { tenantId } = req.params

  // Fetch last 13 months of consumption records
  const since = new Date()
  since.setMonth(since.getMonth() - 13)

  const db = getSupabase()
  const [{ data: records, error: recErr }, { data: connections, error: connErr }] = await Promise.all([
    db.from('consumption_records')
      .select('id, connection_id, period_start, consumption, unit, cost, currency')
      .eq('tenant_id', tenantId)
      .gte('period_start', since.toISOString().slice(0, 10))
      .order('period_start'),
    db.from('energy_connections')
      .select('id, ean_code, connection_type, site_name, capacity')
      .eq('tenant_id', tenantId),
  ])

  if (recErr || connErr) {
    return res.status(500).json({ error: recErr?.message ?? connErr?.message })
  }

  if (!records || records.length === 0) {
    return res.json({ anomalies: [], scanned: 0, connections: connections?.length ?? 0 })
  }

  // Group records by connection
  const byConn: Record<string, ConsumptionRecord[]> = {}
  for (const r of records) {
    if (!byConn[r.connection_id]) byConn[r.connection_id] = []
    byConn[r.connection_id].push(r)
  }

  const connMap: Record<string, ConnectionMeta> = {}
  for (const c of (connections ?? [])) connMap[c.id] = c

  const allAnomalies: Anomaly[] = []
  for (const [connId, recs] of Object.entries(byConn)) {
    const conn = connMap[connId] ?? { id: connId, ean_code: connId, connection_type: '', site_name: null, capacity: null }
    allAnomalies.push(...detectAnomalies(recs, conn))
  }

  // Sort: critical first, then by period desc
  allAnomalies.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1
    return b.period.localeCompare(a.period)
  })

  res.json({
    anomalies: allAnomalies,
    scanned: records.length,
    connections: connections?.length ?? 0,
  })
})

export { router as anomaliesRouter }
