import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Market, AIProvider, Tenant } from '@/types'
import {
  DEFAULT_SITE_ELEC_SOURCES, DEFAULT_SITE_TARIFFS, MOCK_SITES,
  type ElecSource, type TariffStructure,
} from '@/lib/mockData'

interface AppState {
  market:        Market
  aiProvider:    AIProvider
  tenant:        Tenant | null
  sidebarOpen:   boolean

  // Site-level energy mix (keyed by site_id)
  siteMixes:     Record<string, ElecSource>

  // Site-level tariffs (keyed by site_id)
  siteTariffs:   Record<string, TariffStructure>

  setMarket:     (m: Market) => void
  setAIProvider: (p: AIProvider) => void
  setTenant:     (t: Tenant) => void
  toggleSidebar: () => void

  /** Set energy mix for one site */
  setSiteMix: (siteId: string, mix: ElecSource) => void

  /** Apply one site's mix to all sites in the same city */
  applySiteMixToCity: (siteId: string) => void

  /** Set tariff for one site */
  setSiteTariff: (siteId: string, tariff: TariffStructure) => void

  /** Apply one site's tariff to a set of site ids */
  applyTariffToSites: (sourceSiteId: string, targetSiteIds: string[]) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      market:      'UAE',
      aiProvider:  'claude',
      siteMixes:   DEFAULT_SITE_ELEC_SOURCES,
      siteTariffs: DEFAULT_SITE_TARIFFS,
      tenant: {
        id:                'tenant-demo',
        name:              'Masdar City Group',
        plan:              'professional',
        market:            'UAE',
        currency:          'AED',
        connections_count: 15,
        created_at:        '2024-01-01',
      },
      sidebarOpen: true,

      setMarket:     (market)     => set({ market }),
      setAIProvider: (aiProvider) => set({ aiProvider }),
      setTenant:     (tenant)     => set({ tenant }),
      toggleSidebar: ()           => set(s => ({ sidebarOpen: !s.sidebarOpen })),

      setSiteMix: (siteId, mix) =>
        set(s => ({ siteMixes: { ...s.siteMixes, [siteId]: mix } })),

      applySiteMixToCity: (siteId) => {
        const site = MOCK_SITES.find(s => s.id === siteId)
        if (!site) return
        const mix = get().siteMixes[siteId]
        const sameCity = MOCK_SITES.filter(s => s.city === site.city).map(s => s.id)
        const updated: Record<string, ElecSource> = { ...get().siteMixes }
        sameCity.forEach(id => { updated[id] = mix })
        set({ siteMixes: updated })
      },

      setSiteTariff: (siteId, tariff) =>
        set(s => ({ siteTariffs: { ...s.siteTariffs, [siteId]: tariff } })),

      applyTariffToSites: (sourceSiteId, targetSiteIds) => {
        const tariff = get().siteTariffs[sourceSiteId]
        if (!tariff) return
        const updated: Record<string, TariffStructure> = { ...get().siteTariffs }
        targetSiteIds.forEach(id => { updated[id] = tariff })
        set({ siteTariffs: updated })
      },
    }),
    { name: 'energyos-store-v2' }
  )
)
