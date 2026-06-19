import { MONTHS } from '@/lib/mockData'

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

export function buildingMonthly(b: MockBuilding) {
  const seed = b.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const seasonal = [1.12,1.08,1.0,0.92,0.85,0.82,0.84,0.86,0.93,1.0,1.06,1.10]
  const rng = (i: number) => 0.90 + ((seed * (i+1) * 9301 + 49297) % 233280) / 233280 * 0.20
  const baseElec = b.elec_kwh_year / 12
  const baseGas  = b.gas_m3_year  / 12
  return MONTHS.map((m, i) => ({
    month: m,
    elec:  Math.round(baseElec * seasonal[i] * rng(i)),
    gas:   Math.round(baseGas  * seasonal[i] * rng(i + 13)),
  }))
}
