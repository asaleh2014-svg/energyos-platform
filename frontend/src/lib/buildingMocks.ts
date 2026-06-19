import { MONTHS } from '@/lib/mockData'
import type { Period } from '@/components/PeriodSelector'

const MN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const SEASONAL_B = [1.12,1.08,1.0,0.92,0.85,0.82,0.84,0.86,0.93,1.0,1.06,1.10]

const ENERGY_LABELS = ['A++', 'A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G'] as const
export type EnergyLabel = typeof ENERGY_LABELS[number]

export const LABEL_COLORS: Record<EnergyLabel, string> = {
  'A++': '#006400', 'A+': '#008000', 'A': '#00b300',
  'B': '#7ab648', 'C': '#ffd700', 'D': '#ffa500',
  'E': '#ff6600', 'F': '#e03c31', 'G': '#c0392b',
}

export const BREEAM = ['Outstanding', 'Excellent', 'Very Good', 'Good', 'Pass', 'Unclassified']
export const LEED   = ['Platinum', 'Gold', 'Silver', 'Certified', 'None']
export { ENERGY_LABELS }

const UAE_ADDRESSES = [
  'Tower A, Al Reem Island, Abu Dhabi',
  'Block 3, Al Maryah Island, Abu Dhabi',
  'Gate District, DIFC, Dubai',
  'Building 5, Business Bay, Dubai',
  'Tower 2, Jumeirah Lake Towers, Dubai',
  'Unit 12, Masdar City, Abu Dhabi',
  'Sheikh Zayed Road, Trade Centre, Dubai',
  'Al Wasl Road, Jumeirah, Dubai',
  'Corniche Road, Abu Dhabi',
  'Downtown Boulevard, Downtown Dubai',
  'Marina Walk, Dubai Marina',
  'Palm Jumeirah Crescent, Dubai',
]

function hash(s: string, salt = 0) {
  return s.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + salt
}

function seededItem<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length]
}

export interface MockBuilding {
  id: string
  siteId: string
  name: string
  address: string
  area_m2: number
  floors: number
  year_built: number
  energy_label: EnergyLabel
  breeam: string
  leed: string
  occupancy_pct: number
  meter_count: number
  elec_kwh_year: number
  gas_m3_year: number
  status: 'Active' | 'Inactive' | 'Under Review'
}

export function mockBuildingsForSite(siteId: string, count = 3): MockBuilding[] {
  return Array.from({ length: count }, (_, i) => {
    const seed = hash(siteId, i * 31)
    const area  = 500 + (seed % 4500)
    const elec  = Math.round(area * (80 + (seed % 120)))
    const gas   = Math.round(area * (5  + (seed % 15)))
    return {
      id:            `${siteId}-b${i}`,
      siteId,
      name:          `Building ${String.fromCharCode(65 + i)}`,
      address:       seededItem(UAE_ADDRESSES, seed + i),
      area_m2:       area,
      floors:        1 + (seed % 15),
      year_built:    1990 + (seed % 35),
      energy_label:  seededItem(ENERGY_LABELS, seed) as EnergyLabel,
      breeam:        seededItem(BREEAM, seed + 1),
      leed:          seededItem(LEED,   seed + 2),
      occupancy_pct: 40 + (seed % 55),
      meter_count:   1 + (seed % 8),
      elec_kwh_year: elec,
      gas_m3_year:   gas,
      status:        seededItem(['Active', 'Active', 'Active', 'Inactive', 'Under Review'] as const, seed),
    }
  })
}

export function buildingMonthly(b: MockBuilding, period?: Period) {
  const seed = b.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const rng = (i: number) => 0.90 + ((seed * (i+1) * 9301 + 49297) % 233280) / 233280 * 0.20
  const baseElec = b.elec_kwh_year / 12
  const baseGas  = b.gas_m3_year  / 12

  if (!period) {
    return MONTHS.map((m, i) => ({
      month: m,
      elec: Math.round(baseElec * SEASONAL_B[i] * rng(i)),
      gas:  Math.round(baseGas  * SEASONAL_B[i] * rng(i + 13)),
    }))
  }

  const rows: { month: string; elec: number; gas: number }[] = []
  const now = new Date()

  // Daily granularity (single month selected)
  if (period.granularity === 'day') {
    const dayElec = baseElec / 30
    const dayGas  = baseGas  / 30
    const cur = new Date(period.from.getFullYear(), period.from.getMonth(), period.from.getDate())
    const end = new Date(period.to.getFullYear(),   period.to.getMonth(),   period.to.getDate())
    let idx = 0
    while (cur <= end) {
      const m = cur.getMonth()
      rows.push({
        month: `${cur.getDate()} ${MN[m]}`,
        elec:  Math.round(dayElec * SEASONAL_B[m] * rng(idx)),
        gas:   Math.round(dayGas  * SEASONAL_B[m] * rng(idx + 13)),
      })
      cur.setDate(cur.getDate() + 1)
      idx++
    }
    return rows
  }

  // Monthly granularity
  const cur = new Date(period.from.getFullYear(), period.from.getMonth(), 1)
  const end = new Date(period.to.getFullYear(),   period.to.getMonth(),   1)
  let idx = 0
  while (cur <= end) {
    const m  = cur.getMonth()
    const yr = cur.getFullYear()
    const label = `${MN[m]}${yr !== now.getFullYear() ? ` ${yr}` : ''}`
    rows.push({
      month: label,
      elec:  Math.round(baseElec * SEASONAL_B[m] * rng(idx)),
      gas:   Math.round(baseGas  * SEASONAL_B[m] * rng(idx + 13)),
    })
    cur.setMonth(cur.getMonth() + 1)
    idx++
  }
  return rows
}
