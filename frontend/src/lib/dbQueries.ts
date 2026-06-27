// Shared Supabase query helpers — used by all pages
import { supabase } from '@/lib/supabase'
import { geocodeMissing } from '@/lib/geocode'

const TENANT = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

export function tid(tenantId: string) { return tenantId || TENANT }

// ── Sites ──────────────────────────────────────────────────────────────────────
export async function fetchSites(tenantId: string) {
  const { data } = await supabase
    .from('sites')
    .select('id, name, status, latitude, longitude, city_id, cities(name, countries(name, code, currency))')
    .eq('tenant_id', tid(tenantId))
    .order('name')
  const raw = (data ?? []).map((s: any) => ({
    ...s,
    city:    s.cities?.name ?? '',
    country: s.cities?.countries?.name ?? '',
    connections_count: 0,
  })) as any[]

  // Auto-geocode any site missing coordinates using its name + city
  const geocoded = await geocodeMissing(
    raw,
    s => `${s.name} ${s.city} ${s.country}`.trim(),
    async (id, lat, lng) => {
      await supabase.from('sites').update({ latitude: lat, longitude: lng }).eq('id', id)
    },
  )
  return geocoded
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

// ── Per-site consumption ───────────────────────────────────────────────────────
/** Returns monthly {month, elec, gas, water, cost} rows for a single site */
export async function fetchSiteConsumption(tenantId: string, siteId: string) {
  const { data: conns } = await supabase
    .from('energy_connections')
    .select('id, product, connection_type')
    .eq('tenant_id', tid(tenantId))
    .eq('site_id', siteId)
  const connList = conns ?? []
  if (!connList.length) return []

  const ids = connList.map((c: any) => c.id)
  const { data: records } = await supabase
    .from('consumption_records')
    .select('connection_id, period_start, consumption, unit, cost')
    .eq('tenant_id', tid(tenantId))
    .in('connection_id', ids)
    .order('period_start')
  const pm = buildProductMap(connList)
  return groupByMonth(records ?? [], pm)
}

// ── Aggregation helpers ────────────────────────────────────────────────────────

/** Build a connection_id → product map from a connections array */
export function buildProductMap(connections: any[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const c of connections) map[c.id] = c.product ?? c.connection_type ?? 'Electricity'
  return map
}

export function groupByMonth(records: any[], productMap: Record<string, string> = {}) {
  const map: Record<string, { elec: number; gas: number; water: number; cost: number; currency: string }> = {}
  for (const r of records) {
    const month = r.period_start?.slice(0, 7) ?? ''
    if (!map[month]) map[month] = { elec: 0, gas: 0, water: 0, cost: 0, currency: r.currency ?? 'AED' }
    const product = productMap[r.connection_id] ?? (r.unit === 'kWh' ? 'Electricity' : 'Gas')
    if (product === 'Water')        map[month].water += Number(r.consumption)
    else if (r.unit === 'kWh')      map[month].elec  += Number(r.consumption)
    else                            map[month].gas   += Number(r.consumption)
    map[month].cost += Number(r.cost)
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }))
}

/** Group records by calendar year — returns one row per year */
export function groupByYear(records: any[], productMap: Record<string, string> = {}) {
  const map: Record<string, { elec: number; gas: number; water: number; cost: number; currency: string }> = {}
  for (const r of records) {
    const year = r.period_start?.slice(0, 4) ?? ''
    if (!year) continue
    if (!map[year]) map[year] = { elec: 0, gas: 0, water: 0, cost: 0, currency: r.currency ?? 'AED' }
    const product = productMap[r.connection_id] ?? (r.unit === 'kWh' ? 'Electricity' : 'Gas')
    if (product === 'Water')        map[year].water += Number(r.consumption)
    else if (r.unit === 'kWh')      map[year].elec  += Number(r.consumption)
    else                            map[year].gas   += Number(r.consumption)
    map[year].cost += Number(r.cost)
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, v]) => ({ month: year, ...v }))
}

export function co2Tonnes(elecKwh: number, gasM3: number) {
  return (elecKwh * 0.45 + gasM3 * 2.04) / 1000
}

export function sumConsumption(records: any[], productMap: Record<string, string> = {}) {
  let elec = 0, gas = 0, water = 0, cost = 0
  for (const r of records) {
    const product = productMap[r.connection_id] ?? (r.unit === 'kWh' ? 'Electricity' : 'Gas')
    if (product === 'Water')   water += Number(r.consumption)
    else if (r.unit === 'kWh') elec  += Number(r.consumption)
    else                       gas   += Number(r.consumption)
    cost += Number(r.cost)
  }
  return { elec, gas, water, cost }
}
