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

/** User-configurable electricity source mix per connection (percentages, must sum to 100) */
export type ElecSource = {
  gas_fired:  number   // %
  coal:       number
  renewable:  number
  mix:        number
}

export const DEFAULT_ELEC_SOURCES: Record<string, ElecSource> = {
  'conn-001': { gas_fired:55, coal: 5, renewable:15, mix:25 },  // Dubai Business Bay
  'conn-002': { gas_fired:60, coal: 5, renewable:10, mix:25 },  // DIFC Tower
  'conn-003': { gas_fired:20, coal: 0, renewable:70, mix:10 },  // Masdar City Hub — high solar
  'conn-005': { gas_fired:65, coal:10, renewable: 5, mix:20 },  // Sharjah Industrial
  'conn-006': { gas_fired:60, coal: 5, renewable:10, mix:25 },  // RAK Free Zone
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
