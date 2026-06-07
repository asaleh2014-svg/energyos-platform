import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Market, AIProvider, Tenant } from '@/types'
import { DEFAULT_ELEC_SOURCES, type ElecSource } from '@/lib/mockData'

interface AppState {
  market:        Market
  aiProvider:    AIProvider
  tenant:        Tenant | null
  sidebarOpen:   boolean
  elecSources:   Record<string, ElecSource>   // per connectionId
  setMarket:     (m: Market) => void
  setAIProvider: (p: AIProvider) => void
  setTenant:     (t: Tenant) => void
  toggleSidebar: () => void
  setElecSource: (connectionId: string, src: ElecSource) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      market:      'UAE',
      aiProvider:  'claude',
      elecSources: DEFAULT_ELEC_SOURCES,
      tenant: {
        id:                'tenant-demo',
        name:              'Masdar City Group',
        plan:              'professional',
        market:            'UAE',
        currency:          'AED',
        connections_count: 15,
        created_at:        '2024-01-01',
      },
      sidebarOpen:   true,
      setMarket:     (market)      => set({ market }),
      setAIProvider: (aiProvider)  => set({ aiProvider }),
      setTenant:     (tenant)      => set({ tenant }),
      toggleSidebar: ()            => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setElecSource: (connectionId, src) =>
        set((s) => ({ elecSources: { ...s.elecSources, [connectionId]: src } })),
    }),
    { name: 'energyos-store' }
  )
)
