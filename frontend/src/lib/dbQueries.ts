// Shared Supabase query helpers — used by all pages
import { supabase } from '@/lib/supabase'

const TENANT = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

export function tid(tenantId: string) { return tenantId || TENANT }

// ── Sites ──────────────────────────────────────────────────────────────────────
export async function fetchSites(tenantId: string) {
  const { data } = await supabase
    .from('sites')
    .select('id, name, status, latitude, longitude, city_id, cities(name, countries(name, code, currency))')
    .eq('tenant_id', tid(tenantId))
    .order('name')
  return (data ?? []).map((s: any) => ({
    ...s,
    city:    s.cities?.name ?? '',
    country: s.cities?.countries?.name ?? '',
    connections_count: 0,
  })) as any[]
}

// ── Connections ────────────────────────────────────────────────────────────────
export async function fetchConnections(tenantId: string) {
  const { data } = await supabase
    .from('energy_connections')
    .select('*')
    .eq('tenant_id', tid(tenantId))
    .order('site_name')
  return (data ?? []) as any[]
}

// ── Buildings ──────────────────────────────────────────────────────────────────
export async function fetchBuildings(tenantId: string, siteId?: string) {
  let q = supabase
    .from('buildings')
    .select('*, sites(name, cities(name, countries(name, code)))')
    .eq('tenant_id', tid(tenantId))
  if (siteId) q = q.eq('site_id', siteId)
  const { data } = await q.order('name')
  return (data ?? []) as any[]
}

// ── Consumption records ────────────────────────────────────────────────────────
export async function fetchConsumption(tenantId: string, fromDate?: string) {
  let q = supabase
    .from('consumption_records')
    .select('connection_id, period_start, period_end, consumption, unit, cost, currency')
    .eq('tenant_id', tid(tenantId))
    .order('period_start')
  if (fromDate) q = q.gte('period_start', fromDate)
  const { data } = await q
  return (data ?? []) as any[]
}

// Returns YYYY-MM-01 for N months ago (inclusive of that month's records)
export function monthsAgo(n: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - n + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

// ── Aggregation helpers ────────────────────────────────────────────────────────
export function groupByMonth(records: any[]) {
  const map: Record<string, { elec: number; gas: number; cost: number; currency: string }> = {}
  for (const r of records) {
    const month = r.period_start?.slice(0, 7) ?? ''
    if (!map[month]) map[month] = { elec: 0, gas: 0, cost: 0, currency: r.currency ?? 'AED' }
    if (r.unit === 'kWh') map[month].elec += Number(r.consumption)
    else map[month].gas += Number(r.consumption)
    map[month].cost += Number(r.cost)
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }))
}

export function co2Tonnes(elecKwh: number, gasM3: number) {
  return (elecKwh * 0.45 + gasM3 * 2.04) / 1000
}

export function sumConsumption(records: any[]) {
  return {
    elec: records.filter(r => r.unit === 'kWh').reduce((a, r) => a + Number(r.consumption), 0),
    gas:  records.filter(r => r.unit === 'm3').reduce((a, r) => a + Number(r.consumption), 0),
    cost: records.reduce((a, r) => a + Number(r.cost), 0),
  }
}
