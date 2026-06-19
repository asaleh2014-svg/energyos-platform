// ─── Energy types & CO2 emission factors (kgCO2/kWh) ─────────────────────────

export interface EnergyMix {
  grid_pct:      number  // grid electricity (fossil-heavy)
  gas_pct:       number  // natural gas (direct combustion / CHP)
  renewable_pct: number  // solar, wind, hydro
  coal_pct:      number  // coal / heavy oil
  nuclear_pct:   number  // nuclear
}

// Lifecycle emission factors (kgCO2e / kWh)
export const CO2_FACTORS: Record<keyof EnergyMix, number> = {
  grid_pct:      0.420,  // UAE / Middle East grid average
  gas_pct:       0.202,  // natural gas combustion
  renewable_pct: 0.020,  // solar/wind lifecycle
  coal_pct:      0.820,  // coal combustion
  nuclear_pct:   0.012,  // nuclear lifecycle
}

// ─── City / country defaults ───────────────────────────────────────────────────

export const CITY_MIX_DEFAULTS: Record<string, EnergyMix> = {
  // UAE — Abu Dhabi: Barakah nuclear (≈25%), growing solar, rest gas grid
  'Abu Dhabi': { grid_pct: 35, gas_pct: 25, renewable_pct: 15, coal_pct: 0, nuclear_pct: 25 },
  // UAE — Dubai: DEWA grid, strong solar push (Mohammed Bin Rashid)
  'Dubai':     { grid_pct: 50, gas_pct: 20, renewable_pct: 28, coal_pct: 2, nuclear_pct: 0 },
  // UAE — Sharjah / others: mostly SEWA grid (gas-heavy)
  'Sharjah':   { grid_pct: 65, gas_pct: 30, renewable_pct: 5,  coal_pct: 0, nuclear_pct: 0 },
  // Netherlands: diverse mix (wind, gas, nuclear, solar)
  'Amsterdam': { grid_pct: 20, gas_pct: 30, renewable_pct: 40, coal_pct: 5, nuclear_pct: 5 },
  'Rotterdam': { grid_pct: 25, gas_pct: 35, renewable_pct: 30, coal_pct: 5, nuclear_pct: 5 },
  'Dordrecht': { grid_pct: 25, gas_pct: 35, renewable_pct: 30, coal_pct: 5, nuclear_pct: 5 },
}

export const COUNTRY_MIX_DEFAULTS: Record<string, EnergyMix> = {
  UAE:         { grid_pct: 48, gas_pct: 25, renewable_pct: 13, coal_pct: 1,  nuclear_pct: 13 },
  Netherlands: { grid_pct: 22, gas_pct: 33, renewable_pct: 35, coal_pct: 5,  nuclear_pct: 5  },
  default:     { grid_pct: 60, gas_pct: 20, renewable_pct: 15, coal_pct: 5,  nuclear_pct: 0  },
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Weighted average emission factor (kgCO2/kWh) for a given mix */
export function mixEmissionFactor(mix: EnergyMix): number {
  return (
    mix.grid_pct      * CO2_FACTORS.grid_pct      +
    mix.gas_pct       * CO2_FACTORS.gas_pct       +
    mix.renewable_pct * CO2_FACTORS.renewable_pct +
    mix.coal_pct      * CO2_FACTORS.coal_pct      +
    mix.nuclear_pct   * CO2_FACTORS.nuclear_pct
  ) / 100
}

/** CO2 in kg for a given kWh consumption and mix */
export function calcCO2kg(kwh: number, mix: EnergyMix): number {
  return kwh * mixEmissionFactor(mix)
}

/** CO2 in tonnes */
export function calcCO2t(kwh: number, mix: EnergyMix): number {
  return calcCO2kg(kwh, mix) / 1000
}

/** Resolve mix for a city, falling back to country then global default */
export function cityMix(city: string): EnergyMix {
  return CITY_MIX_DEFAULTS[city] ?? COUNTRY_MIX_DEFAULTS['default']
}

/** Normalise a mix so percentages sum to 100 */
export function normaliseMix(mix: EnergyMix): EnergyMix {
  const total = Object.values(mix).reduce((a, v) => a + v, 0)
  if (total === 0) return mix
  const scale = 100 / total
  return {
    grid_pct:      Math.round(mix.grid_pct      * scale),
    gas_pct:       Math.round(mix.gas_pct       * scale),
    renewable_pct: Math.round(mix.renewable_pct * scale),
    coal_pct:      Math.round(mix.coal_pct      * scale),
    nuclear_pct:   Math.round(mix.nuclear_pct   * scale),
  }
}

/** Display label for a mix key */
export const MIX_LABELS: Record<keyof EnergyMix, string> = {
  grid_pct:      'Grid Mix',
  gas_pct:       'Natural Gas',
  renewable_pct: 'Renewable',
  coal_pct:      'Coal',
  nuclear_pct:   'Nuclear',
}

export const MIX_COLORS: Record<keyof EnergyMix, string> = {
  grid_pct:      '#f59e0b',
  gas_pct:       '#ef4444',
  renewable_pct: '#10b981',
  coal_pct:      '#6b7280',
  nuclear_pct:   '#8b5cf6',
}

// ─── Cascade resolution ───────────────────────────────────────────────────────

export interface MixSource {
  mix:    EnergyMix
  source: 'connection' | 'site' | 'city' | 'country'
  label:  string
}

/**
 * Resolve the effective energy mix for a connection.
 * Priority: connection override → site mix → city default → country default
 */
export function resolveConnectionMix(opts: {
  connectionMixOverride?: EnergyMix | null
  siteMix?: EnergyMix | null
  city?: string
  country?: string
}): MixSource {
  const { connectionMixOverride, siteMix, city, country } = opts

  if (connectionMixOverride) {
    return { mix: connectionMixOverride, source: 'connection', label: 'Manual override' }
  }
  if (siteMix) {
    return { mix: siteMix, source: 'site', label: 'Inherited from site' }
  }
  if (city && CITY_MIX_DEFAULTS[city]) {
    return { mix: CITY_MIX_DEFAULTS[city], source: 'city', label: `${city} city default` }
  }
  const countryKey = country ?? 'default'
  const mix = COUNTRY_MIX_DEFAULTS[countryKey] ?? COUNTRY_MIX_DEFAULTS['default']
  return { mix, source: 'country', label: `${countryKey} country default` }
}
