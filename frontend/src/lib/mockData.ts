import type { EnergyConnection, Site, Invoice, ConnectionType } from '@/types'

// ─── Sites ────────────────────────────────────────────────────────────────────
export const MOCK_SITES: Site[] = [
  { id:'site-1', tenant_id:'tenant-demo', name:'Dubai Business Bay',     city:'Dubai',          country:'UAE', latitude:25.1865, longitude:55.2632, annual_budget:80000,  connections_count:3, status:'Active',  created_at:'2024-01-01' },
  { id:'site-2', tenant_id:'tenant-demo', name:'DIFC Tower',             city:'Dubai',          country:'UAE', latitude:25.2048, longitude:55.2708, annual_budget:120000, connections_count:2, status:'Active',  created_at:'2024-01-01' },
  { id:'site-3', tenant_id:'tenant-demo', name:'Masdar City Hub',        city:'Abu Dhabi',      country:'UAE', latitude:24.4267, longitude:54.6183, annual_budget:200000, connections_count:4, status:'Active',  created_at:'2024-01-01' },
  { id:'site-4', tenant_id:'tenant-demo', name:'Sharjah Industrial Zone',city:'Sharjah',        country:'UAE', latitude:25.3573, longitude:55.4033, annual_budget:60000,  connections_count:2, status:'Pending', created_at:'2024-03-01' },
  { id:'site-5', tenant_id:'tenant-demo', name:'RAK Free Zone',          city:'Ras Al Khaimah', country:'UAE', latitude:25.7953, longitude:55.9763, annual_budget:45000,  connections_count:2, status:'Active',  created_at:'2024-02-01' },
  { id:'site-6', tenant_id:'tenant-demo', name:'Abu Dhabi Al Reem',      city:'Abu Dhabi',      country:'UAE', latitude:24.5013, longitude:54.3925, annual_budget:70000,  connections_count:2, status:'Active',  created_at:'2024-02-15' },
]

// ─── Connections ──────────────────────────────────────────────────────────────
export const MOCK_CONNECTIONS: EnergyConnection[] = [
  { id:'conn-001', tenant_id:'tenant-demo', site_id:'site-1', site_name:'Dubai Business Bay',     ean_code:'971-4-BBY-882100', connection_type:'Electricity', capacity:'3x250A', status:'Active',  meter:{ id:'m1', meter_number:'MTR-UAE-8821', type:'Smart',       commissioned_at:'2022-03-01', last_sync_at:new Date(Date.now()-5*60000).toISOString(),       interval_minutes:15    }, latitude:25.1865, longitude:55.2632, created_at:'2024-01-01' },
  { id:'conn-002', tenant_id:'tenant-demo', site_id:'site-2', site_name:'DIFC Tower',             ean_code:'971-4-DIF-882200', connection_type:'Electricity', capacity:'3x400A', status:'Active',  meter:{ id:'m2', meter_number:'MTR-UAE-8822', type:'Smart',       commissioned_at:'2021-11-01', last_sync_at:new Date(Date.now()-2*60000).toISOString(),       interval_minutes:15    }, latitude:25.2048, longitude:55.2708, created_at:'2024-01-01' },
  { id:'conn-003', tenant_id:'tenant-demo', site_id:'site-3', site_name:'Masdar City Hub',        ean_code:'971-2-MAS-904100', connection_type:'Electricity', capacity:'3x630A', status:'Active',  meter:{ id:'m3', meter_number:'MTR-UAE-9041', type:'Smart',       commissioned_at:'2023-01-01', last_sync_at:new Date(Date.now()-60000).toISOString(),         interval_minutes:5     }, latitude:24.4267, longitude:54.6183, created_at:'2024-01-01' },
  { id:'conn-004', tenant_id:'tenant-demo', site_id:'site-3', site_name:'Masdar City Hub',        ean_code:'971-2-MAS-904110', connection_type:'Gas',         capacity:'G100',   status:'Active',  meter:{ id:'m4', meter_number:'MTR-UAE-9042', type:'Smart',       commissioned_at:'2023-01-01', last_sync_at:new Date(Date.now()-3*60000).toISOString(),       interval_minutes:60    }, latitude:24.4267, longitude:54.6183, created_at:'2024-01-01' },
  { id:'conn-005', tenant_id:'tenant-demo', site_id:'site-4', site_name:'Sharjah Industrial Zone',ean_code:'971-6-SHA-771000', connection_type:'Electricity', capacity:'3x160A', status:'Pending', meter:{ id:'m5', meter_number:'MTR-UAE-7710', type:'Traditional', commissioned_at:'2018-06-01', last_sync_at:new Date(Date.now()-3*24*3600000).toISOString(), interval_minutes:43200 }, latitude:25.3573, longitude:55.4033, created_at:'2024-03-01' },
  { id:'conn-006', tenant_id:'tenant-demo', site_id:'site-5', site_name:'RAK Free Zone',          ean_code:'971-7-RAK-331100', connection_type:'Electricity', capacity:'3x250A', status:'Active',  meter:{ id:'m6', meter_number:'MTR-UAE-7711', type:'Traditional', commissioned_at:'2019-02-01', last_sync_at:new Date(Date.now()-5*24*3600000).toISOString(), interval_minutes:43200 }, latitude:25.7953, longitude:55.9763, created_at:'2024-02-01' },
]

// ─── Time labels ──────────────────────────────────────────────────────────────
export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
export const HOUR_LABELS  = Array.from({length:24},(_,i)=>`${String(i).padStart(2,'0')}:00`)
export const YEAR_LABELS  = ['2021','2022','2023','2024','2025']

// ─── Consumption — Hourly (fleet total, typical UAE business day, kWh / m³) ──
export const CONSUMPTION_HOURLY = {
  labels:      HOUR_LABELS,
  electricity: [120,98,88,85,92,140,248,368,492,532,548,538,502,528,548,565,522,478,442,384,318,264,202,152],
  gas:         [ 82,72,62,52,54, 64,102,184,286,328,308,296,282,304,326,342,302,262,222,184,142,122,102, 88],
}

// ─── Consumption — Daily (last 30 days, fleet total) ─────────────────────────
export const CONSUMPTION_DAILY = {
  labels:      Array.from({length:30},(_,i)=>`${i+1} Jun`),
  electricity: [2210,2180,2350,2420,2290,2180,1800,2310,2290,2410,2380,2250,2190,1750,2290,2310,2420,2380,2250,2300,2180,1820,2280,2360,2410,2390,2200,2290,2320,2380],
  gas:         [  42,  40,  45,  44,  41,  39,  34,  43,  41,  46,  44,  40,  38,  32,  42,  43,  45,  44,  40,  42,  39,  33,  41,  44,  46,  44,  39,  42,  43,  45],
}

// ─── Consumption — Weekly (52 weeks, fleet total) ─────────────────────────────
export const CONSUMPTION_WEEKLY = {
  labels: Array.from({length:52},(_,i)=>`W${String(i+1).padStart(2,'0')}`),
  electricity: [
    15200,15600,16000,16400,16800,17200,17600,18000,18400,18800,
    19200,19600,19800,19600,19400,19200,19000,18800,18600,18400,
    18200,18000,17800,17600,17400,17200,17000,16800,16600,16400,
    16200,16000,16200,16400,16600,16800,17000,17200,17400,17600,
    17800,18000,17600,17200,16800,16400,16000,15800,16000,16400,
    16800,17200,
  ],
  gas: [
    340,330,320,310,298,285,272,260,248,238,
    226,215,206,200,198,200,204,210,218,228,
    238,250,262,275,290,306,320,335,350,364,
    378,390,400,408,414,418,412,404,394,382,
    368,352,338,322,308,294,280,268,258,250,
    242,236,
  ],
}

// ─── Consumption — Monthly (fleet total) ─────────────────────────────────────
export const CONSUMPTION_MONTHLY = {
  electricity: [64200,58900,63400,70100,78100,82000,84700,81200,83400,77800,69200,65400],
  gas:         [ 1240, 1180, 1090,  980,  870,  720,  680,  740,  880, 1020, 1150, 1280],
}

// ─── Consumption — Yearly ─────────────────────────────────────────────────────
export const CONSUMPTION_YEARLY = {
  labels:      YEAR_LABELS,
  electricity: [720000, 775000, 810000, 855000, 878000],
  gas:         [  13200,  12800,  13100,  12600,  12840],
}

// ─── Costs ────────────────────────────────────────────────────────────────────
export const COST_MONTHLY  = [22400,42800,64100,87200,112000,138400,166200,196800,228400,258200,271400,284100]
export const ANNUAL_BUDGET = 360000

// ─── Invoices ─────────────────────────────────────────────────────────────────
export const MOCK_INVOICES: Invoice[] = [
  { id:'inv-1', tenant_id:'tenant-demo', connection_id:'conn-001', site_name:'Dubai Business Bay',     period:'May 2025', amount:24180, expected_amount:23400, currency:'AED', variance_pct:3.3,  ai_status:'verified', created_at:'2025-06-01' },
  { id:'inv-2', tenant_id:'tenant-demo', connection_id:'conn-002', site_name:'DIFC Tower',             period:'May 2025', amount:38720, expected_amount:31200, currency:'AED', variance_pct:24.1, ai_status:'anomaly',  created_at:'2025-06-01' },
  { id:'inv-3', tenant_id:'tenant-demo', connection_id:'conn-003', site_name:'Masdar City Hub',        period:'May 2025', amount:51340, expected_amount:52000, currency:'AED', variance_pct:-1.3, ai_status:'verified', created_at:'2025-06-01' },
  { id:'inv-4', tenant_id:'tenant-demo', connection_id:'conn-005', site_name:'Sharjah Industrial Zone',period:'May 2025', amount:19880, expected_amount:18500, currency:'AED', variance_pct:7.5,  ai_status:'review',   created_at:'2025-06-01' },
]

// ─── Site spend ───────────────────────────────────────────────────────────────
export const SITE_SPEND: Record<string, number> = {
  'site-1': 58200, 'site-2': 89400, 'site-3': 142000,
  'site-4': 19880, 'site-5': 31200, 'site-6': 28400,
}

// ═══════════════════════════════════════════════════════════════════════════════
// CO₂ EMISSIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const CO2_FACTORS = {
  gas_m3:      2.204,   // kgCO₂/m³
  electricity: {
    gas_fired:  0.490,  // kgCO₂/kWh
    coal:       0.820,
    renewable:  0.020,
    mix:        0.380,
  },
}

/** User-configurable electricity source mix (percentages, must sum to 100) */
export type ElecSource = {
  gas_fired:  number   // %
  coal:       number
  renewable:  number
  mix:        number
}

// ── UAE-standard grid mixes per utility (2024 actuals / published targets) ────
// Sources: DEWA Annual Report 2023, ADWEA/TAQA 2023, SEWA, FEWA publications
export const UAE_UTILITY_MIXES: Record<string, ElecSource & { label: string; note: string }> = {
  DEWA: {
    label: 'DEWA (Dubai)',
    gas_fired: 52, coal: 0, renewable: 35, mix: 13,
    note: 'DEWA Clean Energy Strategy 2030: 35% renewable achieved 2023 (solar + nuclear share)',
  },
  ADC: {
    label: 'ADWEA/TAQA (Abu Dhabi)',
    gas_fired: 44, coal: 0, renewable: 44, mix: 12,
    note: 'Includes Barakah Nuclear (clean) + Sweihan & Noor solar plants',
  },
  SEWA: {
    label: 'SEWA (Sharjah)',
    gas_fired: 70, coal: 5, renewable: 5, mix: 20,
    note: 'Sharjah grid mix; SEWA clean energy target 30% by 2030',
  },
  FEWA: {
    label: 'FEWA (RAK / Fujairah / Ajman / UAQ)',
    gas_fired: 68, coal: 5, renewable: 7, mix: 20,
    note: 'Northern Emirates grid. RAK working toward 40% clean by 2040',
  },
}

/** Site-level default mixes — derived from the utility that serves each site */
export const DEFAULT_SITE_ELEC_SOURCES: Record<string, ElecSource> = {
  'site-1': { gas_fired:52, coal:0, renewable:35, mix:13 },  // Dubai BB → DEWA
  'site-2': { gas_fired:52, coal:0, renewable:35, mix:13 },  // DIFC → DEWA
  'site-3': { gas_fired:44, coal:0, renewable:44, mix:12 },  // Masdar → ADC (high solar)
  'site-4': { gas_fired:70, coal:5, renewable: 5, mix:20 },  // Sharjah → SEWA
  'site-5': { gas_fired:68, coal:5, renewable: 7, mix:20 },  // RAK → FEWA
  'site-6': { gas_fired:44, coal:0, renewable:44, mix:12 },  // Abu Dhabi Al Reem → ADC
}

/** Map site → utility name */
export const SITE_UTILITY: Record<string, string> = {
  'site-1': 'DEWA', 'site-2': 'DEWA', 'site-3': 'ADC',
  'site-4': 'SEWA', 'site-5': 'FEWA', 'site-6': 'ADC',
}

/** Map site_id → connection ids (for cascading mix changes) */
export const SITE_CONNECTIONS: Record<string, string[]> = {
  'site-1': ['conn-001','conn-002','conn-003','conn-004','conn-005','conn-006','conn-007','conn-008','conn-009','conn-010','conn-011','conn-024','conn-025'],
  'site-2': ['conn-012','conn-023'],
  'site-3': ['conn-013','conn-014','conn-021','conn-026'],
  'site-4': ['conn-015'],
  'site-5': ['conn-016','conn-022'],
  'site-6': [],
}

/** Back-compat: connection-level mix derived from site mix */
export const DEFAULT_ELEC_SOURCES: Record<string, ElecSource> = {
  'conn-001': DEFAULT_SITE_ELEC_SOURCES['site-1'],
  'conn-002': DEFAULT_SITE_ELEC_SOURCES['site-2'],
  'conn-003': DEFAULT_SITE_ELEC_SOURCES['site-3'],
  'conn-004': DEFAULT_SITE_ELEC_SOURCES['site-3'],
  'conn-005': DEFAULT_SITE_ELEC_SOURCES['site-4'],
  'conn-006': DEFAULT_SITE_ELEC_SOURCES['site-5'],
}

/** Annual electricity (kWh) or gas (m³) consumption per connection */
export const METER_ANNUAL_CONSUMPTION: Record<string, { electricity?: number; gas?: number }> = {
  'conn-001': { electricity: 188400 },
  'conn-002': { electricity: 235800 },
  'conn-003': { electricity: 312000 },
  'conn-004': { gas: 12840 },
  'conn-005': { electricity:  84200 },
  'conn-006': { electricity:  97600 },
}

/** Calc weighted kgCO₂/kWh from source mix */
export function calcElecFactor(src: ElecSource): number {
  return (
    (src.gas_fired  / 100) * CO2_FACTORS.electricity.gas_fired  +
    (src.coal       / 100) * CO2_FACTORS.electricity.coal        +
    (src.renewable  / 100) * CO2_FACTORS.electricity.renewable   +
    (src.mix        / 100) * CO2_FACTORS.electricity.mix
  )
}

/** Calc tCO₂ for a meter given its annual consumption and source mix */
export function calcMeterCO2(
  connectionId: string,
  sources: Record<string, ElecSource>
): number {
  const consumption = METER_ANNUAL_CONSUMPTION[connectionId]
  if (!consumption) return 0
  if (consumption.electricity) {
    const src = sources[connectionId] ?? DEFAULT_ELEC_SOURCES[connectionId]
    if (!src) return 0
    return (consumption.electricity * calcElecFactor(src)) / 1000   // → tCO₂
  }
  if (consumption.gas) {
    return (consumption.gas * CO2_FACTORS.gas_m3) / 1000            // → tCO₂
  }
  return 0
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUDGET DATA
// ═══════════════════════════════════════════════════════════════════════════════

export interface MeterBudgetMonth {
  month: string
  commodity_budget:  number
  transport_budget:  number
  tax_budget:        number
  commodity_actual:  number
  transport_actual:  number
  tax_actual:        number
}

export interface MeterBudget {
  connection_id: string
  meter:         string
  site:          string
  type:          ConnectionType
  monthly:       MeterBudgetMonth[]
}

function mkMonths(
  commBase:  number,
  transport: number,
  tax:       number,
  variances: number[],
): MeterBudgetMonth[] {
  return MONTHS.map((month, i) => {
    // seasonal uplift: higher in summer (i=5..8) for electricity, higher in winter for gas
    const seasonal = commBase * 0.12 * Math.sin((i - 3) * Math.PI / 6)
    const cb = Math.round(commBase + seasonal)
    const v  = variances[i]
    return {
      month,
      commodity_budget:  cb,
      transport_budget:  transport,
      tax_budget:        tax,
      commodity_actual:  Math.round(cb * (1 + v)),
      transport_actual:  transport,
      tax_actual:        Math.round(tax * (1 + v * 0.15)),
    }
  })
}

// Per-meter variance profiles (fraction over/under budget each month)
const VAR_BBY  = [-0.02, 0.01,-0.03, 0.05, 0.08, 0.12, 0.15, 0.10, 0.08, 0.02,-0.05,-0.03]
const VAR_DIFC = [ 0.05, 0.08, 0.03, 0.20, 0.24, 0.15, 0.18, 0.22, 0.24, 0.12, 0.04, 0.02]
const VAR_MAS  = [-0.05,-0.03,-0.02, 0.01,-0.01,-0.02, 0.00,-0.01,-0.01, 0.02,-0.04,-0.06]
const VAR_GAS  = [ 0.02, 0.01, 0.03, 0.05, 0.07, 0.04, 0.03, 0.05, 0.06, 0.08, 0.04, 0.02]
const VAR_SHA  = [-0.10,-0.08,-0.05,-0.03,-0.02,-0.04,-0.06,-0.08,-0.10,-0.12,-0.10,-0.08]
const VAR_RAK  = [-0.01, 0.02,-0.02, 0.04, 0.07, 0.11, 0.13, 0.09, 0.07, 0.01,-0.04,-0.02]

export const METER_BUDGETS: MeterBudget[] = [
  { connection_id:'conn-001', meter:'MTR-UAE-8821', site:'Dubai Business Bay',      type:'Electricity', monthly: mkMonths(4200, 620, 310, VAR_BBY)  },
  { connection_id:'conn-002', meter:'MTR-UAE-8822', site:'DIFC Tower',              type:'Electricity', monthly: mkMonths(6800, 980, 490, VAR_DIFC) },
  { connection_id:'conn-003', meter:'MTR-UAE-9041', site:'Masdar City Hub',         type:'Electricity', monthly: mkMonths(9200,1200, 600, VAR_MAS)  },
  { connection_id:'conn-004', meter:'MTR-UAE-9042', site:'Masdar City Hub (Gas)',   type:'Gas',         monthly: mkMonths(2100, 180,  90, VAR_GAS)  },
  { connection_id:'conn-005', meter:'MTR-UAE-7710', site:'Sharjah Industrial Zone', type:'Electricity', monthly: mkMonths(2800, 420, 210, VAR_SHA)  },
  { connection_id:'conn-006', meter:'MTR-UAE-7711', site:'RAK Free Zone',           type:'Electricity', monthly: mkMonths(3400, 520, 260, VAR_RAK)  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// GROUPING HIERARCHY  (connection → building → site → city → country)
// ═══════════════════════════════════════════════════════════════════════════════

export type GroupLevel = 'portfolio' | 'connection' | 'building' | 'site' | 'city' | 'country'

export interface ConnectionMeta {
  id:          string
  label:       string   // short display name
  product:     'Electricity' | 'Gas'
  building:    string
  site:        string
  city:        string
  country:     string
}

export const CONNECTION_META: ConnectionMeta[] = [
  { id:'conn-001', label:'BBY Main',         product:'Electricity', building:'Tower A',          site:'Dubai Business Bay',      city:'Dubai',          country:'UAE' },
  { id:'conn-002', label:'DIFC Tower',        product:'Electricity', building:'Office Tower',     site:'DIFC Tower',              city:'Dubai',          country:'UAE' },
  { id:'conn-003', label:'Masdar HQ Elec',    product:'Electricity', building:'Masdar HQ',        site:'Masdar City Hub',         city:'Abu Dhabi',      country:'UAE' },
  { id:'conn-004', label:'Masdar HQ Gas',     product:'Gas',         building:'Masdar HQ',        site:'Masdar City Hub',         city:'Abu Dhabi',      country:'UAE' },
  { id:'conn-005', label:'Sharjah Industrial',product:'Electricity', building:'Industrial Unit A', site:'Sharjah Industrial Zone', city:'Sharjah',        country:'UAE' },
  { id:'conn-006', label:'RAK Factory',       product:'Electricity', building:'Factory A',        site:'RAK Free Zone',           city:'Ras Al Khaimah', country:'UAE' },
]

// Monthly electricity consumption per connection (kWh).
// Each row sums to the CONSUMPTION_MONTHLY fleet total for electricity.
// Shares: conn-001≈20.5%, conn-002≈25.7%, conn-003≈34.0%, conn-005≈9.2%, conn-006≈10.6%
// conn-004 is Gas only — its electricity values are 0.
const E_SHARES: Record<string, number> = {
  'conn-001': 0.2050,
  'conn-002': 0.2568,
  'conn-003': 0.3397,
  'conn-004': 0,
  'conn-005': 0.0916,
  'conn-006': 0.1069,
}

// Monthly gas consumption per connection (m³).
// Only conn-004 has gas in the core fleet; share = 1.0.
const G_SHARES: Record<string, number> = {
  'conn-001': 0,
  'conn-002': 0,
  'conn-003': 0,
  'conn-004': 1.0,
  'conn-005': 0,
  'conn-006': 0,
}

function applyShare(totals: number[], share: number): number[] {
  return totals.map(v => Math.round(v * share))
}

/** Monthly electricity kWh per connection (12 values) */
export const CONN_MONTHLY_ELEC: Record<string, number[]> = Object.fromEntries(
  CONNECTION_META.map(c => [c.id, applyShare(CONSUMPTION_MONTHLY.electricity, E_SHARES[c.id])])
)

/** Monthly gas m³ per connection (12 values) */
export const CONN_MONTHLY_GAS: Record<string, number[]> = Object.fromEntries(
  CONNECTION_META.map(c => [c.id, applyShare(CONSUMPTION_MONTHLY.gas, G_SHARES[c.id])])
)

/** Yearly electricity kWh per connection (5 values: 2021..2025) */
export const CONN_YEARLY_ELEC: Record<string, number[]> = Object.fromEntries(
  CONNECTION_META.map(c => [c.id, applyShare(CONSUMPTION_YEARLY.electricity, E_SHARES[c.id])])
)

/** Yearly gas m³ per connection */
export const CONN_YEARLY_GAS: Record<string, number[]> = Object.fromEntries(
  CONNECTION_META.map(c => [c.id, applyShare(CONSUMPTION_YEARLY.gas, G_SHARES[c.id])])
)

// Weekly electricity per connection (52 values, scaled from CONSUMPTION_WEEKLY)
export const CONN_WEEKLY_ELEC: Record<string, number[]> = Object.fromEntries(
  CONNECTION_META.map(c => [c.id, applyShare(CONSUMPTION_WEEKLY.electricity, E_SHARES[c.id])])
)

export const CONN_WEEKLY_GAS: Record<string, number[]> = Object.fromEntries(
  CONNECTION_META.map(c => [c.id, applyShare(CONSUMPTION_WEEKLY.gas, G_SHARES[c.id])])
)

// Daily electricity per connection (30 values)
export const CONN_DAILY_ELEC: Record<string, number[]> = Object.fromEntries(
  CONNECTION_META.map(c => [c.id, applyShare(CONSUMPTION_DAILY.electricity, E_SHARES[c.id])])
)

export const CONN_DAILY_GAS: Record<string, number[]> = Object.fromEntries(
  CONNECTION_META.map(c => [c.id, applyShare(CONSUMPTION_DAILY.gas, G_SHARES[c.id])])
)

// Hourly electricity per connection (24 values)
export const CONN_HOURLY_ELEC: Record<string, number[]> = Object.fromEntries(
  CONNECTION_META.map(c => [c.id, applyShare(CONSUMPTION_HOURLY.electricity, E_SHARES[c.id])])
)

export const CONN_HOURLY_GAS: Record<string, number[]> = Object.fromEntries(
  CONNECTION_META.map(c => [c.id, applyShare(CONSUMPTION_HOURLY.gas, G_SHARES[c.id])])
)

// ═══════════════════════════════════════════════════════════════════════════════
// TARIFFS  (UAE commercial rates, 2024)
// ═══════════════════════════════════════════════════════════════════════════════

export interface TariffStructure {
  commodity_elec:  number   // AED / kWh  (electricity energy charge)
  commodity_gas:   number   // AED / m³
  distribution:    number   // AED / kWh  (network / transport charge)
  capacity_charge: number   // AED / kW / month
  municipality_tax: number  // fraction (e.g. 0.10 = 10%)
  vat:             number   // fraction (0.05 = 5%)
}

/** UAE commercial tariffs per utility — 2024 published rates */
export const UAE_TARIFFS: Record<string, TariffStructure & { label: string }> = {
  DEWA: {
    label: 'DEWA (Dubai)',
    commodity_elec:  0.44,
    commodity_gas:   0.29,
    distribution:    0.055,
    capacity_charge: 12.0,
    municipality_tax: 0.10,
    vat: 0.05,
  },
  ADC: {
    label: 'ADWEA/TAQA (Abu Dhabi)',
    commodity_elec:  0.39,
    commodity_gas:   0.15,
    distribution:    0.048,
    capacity_charge: 10.5,
    municipality_tax: 0.05,
    vat: 0.05,
  },
  SEWA: {
    label: 'SEWA (Sharjah)',
    commodity_elec:  0.38,
    commodity_gas:   0.22,
    distribution:    0.050,
    capacity_charge: 11.0,
    municipality_tax: 0.10,
    vat: 0.05,
  },
  FEWA: {
    label: 'FEWA (Northern Emirates)',
    commodity_elec:  0.40,
    commodity_gas:   0.20,
    distribution:    0.052,
    capacity_charge: 11.5,
    municipality_tax: 0.10,
    vat: 0.05,
  },
}

/** Per-site tariff assignments (derived from which utility serves the site) */
export const DEFAULT_SITE_TARIFFS: Record<string, TariffStructure> = {
  'site-1': UAE_TARIFFS.DEWA,
  'site-2': UAE_TARIFFS.DEWA,
  'site-3': UAE_TARIFFS.ADC,
  'site-4': UAE_TARIFFS.SEWA,
  'site-5': UAE_TARIFFS.FEWA,
  'site-6': UAE_TARIFFS.ADC,
}

/** Historic annual emissions (tCO₂) for path-to-zero forecast */
export const HISTORIC_EMISSIONS: { year: number; total: number; elec: number; gas: number }[] = [
  { year: 2020, total: 412, elec: 384, gas: 28 },
  { year: 2021, total: 398, elec: 371, gas: 27 },
  { year: 2022, total: 374, elec: 348, gas: 26 },
  { year: 2023, total: 354, elec: 330, gas: 24 },
  { year: 2024, total: 336, elec: 314, gas: 22 },
  { year: 2025, total: 318, elec: 296, gas: 22 },   // current year estimate
]

/** Projected BAU vs decarbonisation scenarios (tCO₂) to 2050 */
export const EMISSION_SCENARIOS: {
  year: number
  bau: number          // Business as usual — grid mix stays current
  moderate: number     // Moderate action — 50% renewable by 2035
  ambitious: number    // Ambitious — align with Dubai 2050 clean energy strategy
  target: number       // Net zero target line
}[] = [
  { year:2025, bau:318, moderate:318, ambitious:318, target:318 },
  { year:2026, bau:312, moderate:298, ambitious:272, target:0   },
  { year:2027, bau:308, moderate:278, ambitious:232, target:0   },
  { year:2028, bau:305, moderate:256, ambitious:192, target:0   },
  { year:2029, bau:302, moderate:232, ambitious:158, target:0   },
  { year:2030, bau:299, moderate:208, ambitious:128, target:0   },
  { year:2032, bau:295, moderate:168, ambitious:92,  target:0   },
  { year:2035, bau:290, moderate:118, ambitious:52,  target:0   },
  { year:2040, bau:284, moderate:68,  ambitious:18,  target:0   },
  { year:2045, bau:280, moderate:28,  ambitious:4,   target:0   },
  { year:2050, bau:276, moderate:0,   ambitious:0,   target:0   },
]

/** Group connections by a level key and aggregate their monthly data */
export function groupByLevel(
  level: Exclude<GroupLevel, 'portfolio'>,
  product: 'electricity' | 'gas',
  granularity: 'hour' | 'day' | 'week' | 'month' | 'year'
): { name: string; values: number[] }[] {
  const elecMap: Record<string, Record<string, number[]>> = {
    hour: CONN_HOURLY_ELEC, day: CONN_DAILY_ELEC, week: CONN_WEEKLY_ELEC,
    month: CONN_MONTHLY_ELEC, year: CONN_YEARLY_ELEC,
  }
  const gasMap: Record<string, Record<string, number[]>> = {
    hour: CONN_HOURLY_GAS, day: CONN_DAILY_GAS, week: CONN_WEEKLY_GAS,
    month: CONN_MONTHLY_GAS, year: CONN_YEARLY_GAS,
  }
  const connData = product === 'electricity' ? elecMap[granularity] : gasMap[granularity]
  const key = level === 'connection' ? 'id'
            : level === 'building'   ? 'building'
            : level === 'site'       ? 'site'
            : level === 'city'       ? 'city'
            :                          'country'

  const groups: Record<string, number[]> = {}
  for (const meta of CONNECTION_META) {
    const groupName = meta[key as keyof ConnectionMeta] as string
    const vals = connData[meta.id] ?? []
    if (!groups[groupName]) groups[groupName] = vals.map(() => 0)
    groups[groupName] = groups[groupName].map((v, i) => v + (vals[i] ?? 0))
  }
  return Object.entries(groups).map(([name, values]) => ({ name, values }))
}
