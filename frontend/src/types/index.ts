export type Market = 'UAE-DXB' | 'UAE-AUH' | 'UAE-SHJ' | 'UAE-RAK' | 'UAE-AJM' | 'UAE-FUJ' | 'UAE-UAQ' | 'NL' | 'UK' | 'SA' | 'INTL'
export type ConnectionType = 'Electricity' | 'Gas'
export type ConnectionStatus = 'Active' | 'Inactive' | 'Pending'
export type MeterType = 'Smart' | 'Traditional'
export type UserRole = 'Administrator' | 'Auditor' | 'Viewer'
export type AIProvider = 'claude' | 'gemini' | 'openai'
export type PlanTier = 'starter' | 'professional' | 'enterprise'

export interface TariffBand {
  label: string
  from: number | null   // kWh or m3 threshold (null = no lower limit)
  to: number | null     // kWh or m3 threshold (null = open-ended)
  rate: number          // per kWh or per m3
}

export interface MarketConfig {
  label: string
  flag: string
  currency: string
  currencySymbol: string
  /** Regulator / tariff authority */
  tariffAuthority: string
  /** Network / grid operator */
  networkOperator: string
  /** Government regulatory body */
  regulatoryBody: string
  meterIdFormat: string
  capacityUnit: string
  vatPct: number              // e.g. 5 for UAE, 21 for NL
  vatLabel: string            // 'VAT' | 'BTW'
  /** Flat or tiered electricity rate (AED or EUR per kWh) */
  electricityRate: number     // blended / typical rate
  electricityBands: TariffBand[]
  /** Flat or tiered gas rate (AED or EUR per m3) */
  gasRate: number
  gasBands: TariffBand[]
  /** Notes / context */
  notes: string
}

export interface Tenant {
  id: string
  name: string
  plan: PlanTier
  market: Market
  currency: string
  connections_count: number
  created_at: string
}

export interface Site {
  id: string
  tenant_id: string
  name: string
  city: string
  country: string
  latitude: number
  longitude: number
  annual_budget: number
  connections_count: number
  status: ConnectionStatus
  created_at: string
}

export interface Meter {
  id: string
  meter_number: string
  type: MeterType
  commissioned_at: string
  last_sync_at: string
  interval_minutes: number
}

export interface EnergyConnection {
  id: string
  tenant_id: string
  site_id: string
  site_name: string
  ean_code: string
  connection_type: ConnectionType
  capacity: string
  status: ConnectionStatus
  meter: Meter
  latitude: number
  longitude: number
  created_at: string
}

export interface ConsumptionRecord {
  id: string
  connection_id: string
  tenant_id: string
  period_start: string
  period_end: string
  consumption: number
  unit: 'kWh' | 'm3'
  cost: number
  currency: string
}

export interface Invoice {
  id: string
  tenant_id: string
  connection_id: string
  site_name: string
  period: string
  amount: number
  expected_amount: number
  currency: string
  variance_pct: number
  ai_status: 'verified' | 'anomaly' | 'review' | 'pending'
  created_at: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// ─── MARKET CONFIGS ───────────────────────────────────────────────────────────
// UAE tariffs: Federal Energy Regulatory Authority (FEWA) sets framework.
// Each emirate has its own utility. All are AED, VAT 5%.
// Source: DEWA tariff circular 2023, ADDC tariff schedule 2023, SEWA 2023, RAKIA 2022
//
// NL: ACM (Autoriteit Consument & Markt) regulates network operators.
// Network operators: Enexis (north/east), Liander (GLD/NH/FRL), Stedin (south/ZH)
// Suppliers: Vattenfall, Eneco, Essent, Greenchoice, etc.
// BTW: 21% on energy since 2023 (was 9% before).
// Electricity: ~0.28 EUR/kWh (supplier) + ~0.09 EUR/kWh (network) = ~0.37 total
// Gas: ~0.85 EUR/m3 (supplier) + ~0.45 EUR/m3 (network) = ~1.30 total (2024 avg)

export const MARKET_CONFIGS: Record<Market, MarketConfig> = {

  'UAE-DXB': {
    label: 'Dubai (DEWA)',
    flag: '🇦🇪',
    currency: 'AED',
    currencySymbol: 'AED',
    tariffAuthority: 'DEWA — Dubai Electricity & Water Authority',
    networkOperator: 'DEWA',
    regulatoryBody: 'DEWA / Dubai Supreme Council of Energy',
    meterIdFormat: 'DEWA Premises Number (10 digits)',
    capacityUnit: 'kVA',
    vatPct: 5,
    vatLabel: 'VAT',
    electricityRate: 0.40,
    electricityBands: [
      { label: '0–2,000 kWh',  from: 0,    to: 2000, rate: 0.23 },
      { label: '2,001–4,000',  from: 2001, to: 4000, rate: 0.28 },
      { label: '4,001–6,000',  from: 4001, to: 6000, rate: 0.32 },
      { label: '6,001–8,000',  from: 6001, to: 8000, rate: 0.38 },
      { label: '>8,000 kWh',   from: 8001, to: null, rate: 0.44 },
    ],
    gasRate: 3.20,
    gasBands: [
      { label: '0–35 m³',   from: 0,  to: 35,   rate: 2.10 },
      { label: '36–70 m³',  from: 36, to: 70,   rate: 2.80 },
      { label: '>70 m³',    from: 71, to: null,  rate: 3.20 },
    ],
    notes: 'Commercial tariff L4 (demand ≥ 500 kVA). Fuel surcharge 5 fils/kWh applied Oct–Mar. Green electricity optional at +3 fils/kWh.',
  },

  'UAE-AUH': {
    label: 'Abu Dhabi (ADDC)',
    flag: '🇦🇪',
    currency: 'AED',
    currencySymbol: 'AED',
    tariffAuthority: 'ADDC / AADC — Abu Dhabi Distribution Company',
    networkOperator: 'ADDC (Abu Dhabi city) / AADC (Al Ain)',
    regulatoryBody: 'ADWEA — Abu Dhabi Water & Electricity Authority (Tariff regulation by PWOL)',
    meterIdFormat: 'ADDC Account Number (12 digits)',
    capacityUnit: 'kVA',
    vatPct: 5,
    vatLabel: 'VAT',
    electricityRate: 0.32,
    electricityBands: [
      { label: '0–500 kWh',    from: 0,   to: 500,  rate: 0.21 },
      { label: '501–1,000',    from: 501,  to: 1000, rate: 0.25 },
      { label: '1,001–2,000',  from: 1001, to: 2000, rate: 0.30 },
      { label: '>2,000 kWh',   from: 2001, to: null, rate: 0.32 },
    ],
    gasRate: 3.00,
    gasBands: [
      { label: 'All consumption', from: 0, to: null, rate: 3.00 },
    ],
    notes: 'Abu Dhabi Emirate (excl. Al Ain served by AADC). Masdar City has separate clean-energy tariff. Demand charges apply above 630 kVA.',
  },

  'UAE-SHJ': {
    label: 'Sharjah (SEWA)',
    flag: '🇦🇪',
    currency: 'AED',
    currencySymbol: 'AED',
    tariffAuthority: 'SEWA — Sharjah Electricity, Water & Gas Authority',
    networkOperator: 'SEWA',
    regulatoryBody: 'SEWA / Sharjah Executive Council',
    meterIdFormat: 'SEWA Account Number (9 digits)',
    capacityUnit: 'kVA',
    vatPct: 5,
    vatLabel: 'VAT',
    electricityRate: 0.38,
    electricityBands: [
      { label: '0–1,500 kWh',   from: 0,    to: 1500, rate: 0.25 },
      { label: '1,501–4,000',   from: 1501, to: 4000, rate: 0.33 },
      { label: '>4,000 kWh',    from: 4001, to: null, rate: 0.38 },
    ],
    gasRate: 3.10,
    gasBands: [
      { label: 'All consumption', from: 0, to: null, rate: 3.10 },
    ],
    notes: 'SEWA also covers Khor Fakkan and Kalba (east coast enclaves). Industrial zones (Hamriyah, SAIF) may qualify for industrial tariff at 0.30 AED/kWh.',
  },

  'UAE-RAK': {
    label: 'Ras Al Khaimah (RAKIA)',
    flag: '🇦🇪',
    currency: 'AED',
    currencySymbol: 'AED',
    tariffAuthority: 'RAKIA / RAK Utilities',
    networkOperator: 'RAK Power / RAKIA Utilities',
    regulatoryBody: 'RAK Department of Energy',
    meterIdFormat: 'RAK Utilities Account (8 digits)',
    capacityUnit: 'kVA',
    vatPct: 5,
    vatLabel: 'VAT',
    electricityRate: 0.30,
    electricityBands: [
      { label: 'All commercial', from: 0, to: null, rate: 0.30 },
    ],
    gasRate: 3.00,
    gasBands: [
      { label: 'All consumption', from: 0, to: null, rate: 3.00 },
    ],
    notes: 'RAK offers competitive flat commercial rate to attract industrial tenants to RAKIA and other free zones. No tiered structure for commercial/industrial.',
  },

  'UAE-AJM': {
    label: 'Ajman (FEWA)',
    flag: '🇦🇪',
    currency: 'AED',
    currencySymbol: 'AED',
    tariffAuthority: 'FEWA — Federal Electricity & Water Authority',
    networkOperator: 'FEWA',
    regulatoryBody: 'Ministry of Energy & Infrastructure (UAE Federal)',
    meterIdFormat: 'FEWA Account Number (10 digits)',
    capacityUnit: 'kVA',
    vatPct: 5,
    vatLabel: 'VAT',
    electricityRate: 0.28,
    electricityBands: [
      { label: 'All commercial', from: 0, to: null, rate: 0.28 },
    ],
    gasRate: 3.00,
    gasBands: [
      { label: 'All consumption', from: 0, to: null, rate: 3.00 },
    ],
    notes: 'FEWA serves Ajman, Umm Al Quwain, Fujairah and the mountainous parts of Ras Al Khaimah. Federal tariff is the lowest in the UAE.',
  },

  'UAE-FUJ': {
    label: 'Fujairah (FEWA)',
    flag: '🇦🇪',
    currency: 'AED',
    currencySymbol: 'AED',
    tariffAuthority: 'FEWA — Federal Electricity & Water Authority',
    networkOperator: 'FEWA',
    regulatoryBody: 'Ministry of Energy & Infrastructure (UAE Federal)',
    meterIdFormat: 'FEWA Account Number (10 digits)',
    capacityUnit: 'kVA',
    vatPct: 5,
    vatLabel: 'VAT',
    electricityRate: 0.28,
    electricityBands: [
      { label: 'All commercial', from: 0, to: null, rate: 0.28 },
    ],
    gasRate: 3.00,
    gasBands: [
      { label: 'All consumption', from: 0, to: null, rate: 3.00 },
    ],
    notes: 'Fujairah is a key UAE oil terminal hub. FEWA federal tariff applies. Port and industrial consumers may negotiate direct FEWA supply agreements.',
  },

  'UAE-UAQ': {
    label: 'Umm Al Quwain (FEWA)',
    flag: '🇦🇪',
    currency: 'AED',
    currencySymbol: 'AED',
    tariffAuthority: 'FEWA — Federal Electricity & Water Authority',
    networkOperator: 'FEWA',
    regulatoryBody: 'Ministry of Energy & Infrastructure (UAE Federal)',
    meterIdFormat: 'FEWA Account Number (10 digits)',
    capacityUnit: 'kVA',
    vatPct: 5,
    vatLabel: 'VAT',
    electricityRate: 0.28,
    electricityBands: [
      { label: 'All commercial', from: 0, to: null, rate: 0.28 },
    ],
    gasRate: 3.00,
    gasBands: [
      { label: 'All consumption', from: 0, to: null, rate: 3.00 },
    ],
    notes: 'UAQ is the smallest emirate. FEWA federal tariff applies. UAQ Free Trade Zone and Al Sinniyah Island developments use FEWA supply.',
  },

  'NL': {
    label: 'Netherlands',
    flag: '🇳🇱',
    currency: 'EUR',
    currencySymbol: '€',
    tariffAuthority: 'ACM — Autoriteit Consument & Markt (network tariffs regulated)',
    networkOperator: 'Enexis / Liander / Stedin / Coteq',
    regulatoryBody: 'ACM — Netherlands Authority for Consumers & Markets',
    meterIdFormat: '18-digit EAN code (EAN 871xxxxx)',
    capacityUnit: 'A',
    vatPct: 21,
    vatLabel: 'BTW',
    electricityRate: 0.28,
    electricityBands: [
      { label: 'Supplier component',  from: 0, to: null, rate: 0.28 },
      { label: 'Network (nettarief)', from: 0, to: null, rate: 0.09 },
    ],
    gasRate: 0.85,
    gasBands: [
      { label: 'Supplier component',    from: 0, to: null, rate: 0.85 },
      { label: 'Network (nettarief)',   from: 0, to: null, rate: 0.45 },
    ],
    notes: 'Network tariffs (nettarieven) set annually by ACM per network operator and connection capacity (A-value). ' +
           'BTW (21%) applies to both supply and network components since 2023. ' +
           'ODE (Opslag Duurzame Energie) surcharge included in supplier rate. ' +
           'Smart meter (slimme meter) mandatory for new connections ≥80A. ' +
           'Capacity-based tariffs (congestieheffing) being phased in by Enexis/Liander from 2024.',
  },

  'UK': {
    label: 'United Kingdom',
    flag: '🇬🇧',
    currency: 'GBP',
    currencySymbol: '£',
    tariffAuthority: 'Ofgem — Office of Gas & Electricity Markets',
    networkOperator: 'National Grid / UK Power Networks / Western Power',
    regulatoryBody: 'Ofgem',
    meterIdFormat: 'MPAN 21-digit / MPRN 10-digit',
    capacityUnit: 'kVA',
    vatPct: 5,
    vatLabel: 'VAT',
    electricityRate: 0.24,
    electricityBands: [
      { label: 'Unit rate (Ofgem cap Q2 2024)', from: 0, to: null, rate: 0.245 },
    ],
    gasRate: 0.06,
    gasBands: [
      { label: 'Unit rate (Ofgem cap Q2 2024)', from: 0, to: null, rate: 0.06 },
    ],
    notes: 'Ofgem price cap reviewed quarterly. Business tariffs are not capped. 5% VAT on domestic; 20% on commercial supplies.',
  },

  'SA': {
    label: 'Saudi Arabia',
    flag: '🇸🇦',
    currency: 'SAR',
    currencySymbol: 'SAR',
    tariffAuthority: 'SEC — Saudi Electricity Company',
    networkOperator: 'SEC (vertically integrated)',
    regulatoryBody: 'ECRA — Electricity & Cogeneration Regulatory Authority',
    meterIdFormat: 'SEC Account Number (12 digits)',
    capacityUnit: 'kVA',
    vatPct: 15,
    vatLabel: 'VAT',
    electricityRate: 0.18,
    electricityBands: [
      { label: '0–6,000 kWh',   from: 0,    to: 6000, rate: 0.18 },
      { label: '>6,000 kWh',    from: 6001, to: null,  rate: 0.30 },
    ],
    gasRate: 0.04,
    gasBands: [
      { label: 'Industrial gas', from: 0, to: null, rate: 0.04 },
    ],
    notes: 'Saudi VAT raised to 15% in 2020. SEC is the sole supplier and grid operator. Vision 2030 renewable energy program targets 50% renewables by 2030.',
  },

  'INTL': {
    label: 'International',
    flag: '🌐',
    currency: 'USD',
    currencySymbol: '$',
    tariffAuthority: 'Custom',
    networkOperator: 'Custom',
    regulatoryBody: 'Custom',
    meterIdFormat: 'Custom',
    capacityUnit: 'kVA',
    vatPct: 0,
    vatLabel: 'VAT',
    electricityRate: 0.15,
    electricityBands: [
      { label: 'Custom rate', from: 0, to: null, rate: 0.15 },
    ],
    gasRate: 0.50,
    gasBands: [
      { label: 'Custom rate', from: 0, to: null, rate: 0.50 },
    ],
    notes: 'Set custom tariff rates per market in Settings.',
  },
}

// Legacy alias — keep 'UAE' pointing to Dubai as default
export const UAE = MARKET_CONFIGS['UAE-DXB']
