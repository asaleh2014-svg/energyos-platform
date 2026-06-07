export type Market = 'UAE' | 'NL' | 'UK' | 'SA' | 'INTL'
export type ConnectionType = 'Electricity' | 'Gas'
export type ConnectionStatus = 'Active' | 'Inactive' | 'Pending'
export type MeterType = 'Smart' | 'Traditional'
export type UserRole = 'Administrator' | 'Auditor' | 'Viewer'
export type AIProvider = 'claude' | 'gemini' | 'openai'
export type PlanTier = 'starter' | 'professional' | 'enterprise'

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

export interface MarketConfig {
  label: string
  flag: string
  currency: string
  currencySymbol: string
  tariffAuthority: string
  meterIdFormat: string
  capacityUnit: string
}

export const MARKET_CONFIGS: Record<Market, MarketConfig> = {
  UAE: {
    label: 'UAE',
    flag: '🇦🇪',
    currency: 'AED',
    currencySymbol: 'AED',
    tariffAuthority: 'DEWA / FEWA / SEWA / ADC',
    meterIdFormat: 'DEWA Reference Number',
    capacityUnit: 'kVA',
  },
  NL: {
    label: 'Netherlands',
    flag: '🇳🇱',
    currency: 'EUR',
    currencySymbol: '€',
    tariffAuthority: 'Enexis / Liander / Stedin',
    meterIdFormat: '18-digit EAN code',
    capacityUnit: 'A',
  },
  UK: {
    label: 'United Kingdom',
    flag: '🇬🇧',
    currency: 'GBP',
    currencySymbol: '£',
    tariffAuthority: 'Ofgem / National Grid',
    meterIdFormat: 'MPAN 21-digit',
    capacityUnit: 'kVA',
  },
  SA: {
    label: 'Saudi Arabia',
    flag: '🇸🇦',
    currency: 'SAR',
    currencySymbol: 'SAR',
    tariffAuthority: 'SEC',
    meterIdFormat: 'SEC Account Number',
    capacityUnit: 'kVA',
  },
  INTL: {
    label: 'International',
    flag: '🌐',
    currency: 'USD',
    currencySymbol: '$',
    tariffAuthority: 'Custom',
    meterIdFormat: 'Custom',
    capacityUnit: 'kVA',
  },
}
