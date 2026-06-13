import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { MOCK_SITES, SITE_SPEND, UAE_UTILITY_MIXES, SITE_UTILITY, CO2_FACTORS, type ElecSource } from '@/lib/mockData'
import { useAppStore } from '@/lib/store'
import { MARKET_CONFIGS } from '@/types'
import { MapPin, X, ChevronDown, ChevronUp, Info, Zap } from 'lucide-react'
import clsx from 'clsx'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcEmissionFactor(mix: ElecSource): number {
  return (
    (mix.gas_fired  / 100) * CO2_FACTORS.electricity.gas_fired  +
    (mix.coal       / 100) * CO2_FACTORS.electricity.coal        +
    (mix.renewable  / 100) * CO2_FACTORS.electricity.renewable   +
    (mix.mix        / 100) * CO2_FACTORS.electricity.mix
  )
}

function mixSum(mix: ElecSource) {
  return mix.gas_fired + mix.coal + mix.renewable + mix.mix
}

const MIX_COLORS = {
  gas_fired: '#f59e0b',
  coal:      '#6b7280',
  renewable: '#10b981',
  mix:       '#3b82f6',
}

const MIX_LABELS = {
  gas_fired: 'Gas Fired',
  coal:      'Coal',
  renewable: 'Renewable',
  mix:       'Grid Mix',
}

// ─── Mix slider ───────────────────────────────────────────────────────────────
function MixSlider({
  field, value, color, onChange,
}: { field: string; value: number; color: string; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="w-[90px] text-[11px] text-white/50 flex-shrink-0">
        {MIX_LABELS[field as keyof typeof MIX_LABELS]}
      </div>
      <input
        type="range" min={0} max={100} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1 h-1.5 accent-current rounded-full cursor-pointer"
        style={{ accentColor: color }}
      />
      <div className="w-10 text-right text-xs font-mono font-semibold"
        style={{ color }}>{value}%</div>
    </div>
  )
}

// ─── Site detail panel ────────────────────────────────────────────────────────
function SitePanel({ siteId, onClose }: { siteId: string; onClose: () => void }) {
  const { market, siteMixes, setSiteMix, applySiteMixToCity } = useAppStore()
  const cfg = MARKET_CONFIGS[market]
  const site = MOCK_SITES.find(s => s.id === siteId)!
  const spend = SITE_SPEND[siteId] ?? 0
  const util = Math.round((spend / site.annual_budget) * 100)

  const currentMix = siteMixes[siteId] ?? { gas_fired:52, coal:0, renewable:35, mix:13 }
  const [draft, setDraft] = useState<ElecSource>({ ...currentMix })
  const [showApply, setShowApply] = useState(false)
  const [appliedMsg, setAppliedMsg] = useState('')

  const utility = SITE_UTILITY[siteId]
  const utilityMix = UAE_UTILITY_MIXES[utility]
  const total = mixSum(draft)
  const factor = calcEmissionFactor(draft)
  const factorColor = factor < 0.15 ? '#10b981' : factor < 0.35 ? '#f59e0b' : '#ef4444'

  const sameCitySites = MOCK_SITES.filter(s => s.city === site.city && s.id !== siteId)

  const setField = (field: keyof ElecSource) => (v: number) => {
    setDraft(d => ({ ...d, [field]: v }))
  }

  const save = () => {
    if (total !== 100) return
    setSiteMix(siteId, draft)
    setAppliedMsg('Saved for this site.')
    setTimeout(() => setAppliedMsg(''), 2500)
  }

  const saveToCity = () => {
    if (total !== 100) return
    setSiteMix(siteId, draft)
    applySiteMixToCity(siteId)
    setAppliedMsg(`Applied to all ${sameCitySites.length + 1} sites in ${site.city}.`)
    setShowApply(false)
    setTimeout(() => setAppliedMsg(''), 3000)
  }

  const resetToUtility = () => setDraft({ ...utilityMix })

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-[480px] bg-bg-secondary border-l border-border-subtle flex flex-col shadow-2xl overflow-y-auto">

        {/* Header */}
        <div className="px-5 py-4 border-b border-border-subtle flex items-start justify-between"
          style={{ background: 'linear-gradient(135deg,#0d3d4a,#0a2a33)' }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MapPin size={15} className="text-accent" />
              <h2 className="text-base font-semibold text-white">{site.name}</h2>
              <span className={`status-${site.status.toLowerCase()}`}>{site.status}</span>
            </div>
            <p className="text-xs text-white/40">{site.city}, {site.country} · {site.connections_count} connections · Served by {utility}</p>
          </div>
          <button onClick={onClose}
            className="text-white/40 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10">
            <X size={16} />
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3 px-5 py-4 border-b border-border-subtle">
          <div>
            <div className="text-[10px] text-white/35 uppercase tracking-widest mb-0.5">Spend (YTD)</div>
            <div className="text-lg font-semibold text-white">{cfg.currencySymbol} {spend.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[10px] text-white/35 uppercase tracking-widest mb-0.5">Budget</div>
            <div className="text-lg font-semibold text-white">{cfg.currencySymbol} {site.annual_budget.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[10px] text-white/35 uppercase tracking-widest mb-0.5">Utilisation</div>
            <div className={clsx('text-lg font-semibold', util > 85 ? 'text-danger-light' : util > 60 ? 'text-warning-light' : 'text-success-light')}>
              {util}%
            </div>
          </div>
        </div>

        {/* Energy Mix Editor */}
        <div className="px-5 py-5 flex-1">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-white">Energy Source Mix</h3>
              <p className="text-[11px] text-white/35 mt-0.5">
                Applies to all connections at this site for CO₂ calculations
              </p>
            </div>
            <button onClick={resetToUtility}
              className="text-[11px] text-accent-hover hover:text-white border border-accent/30 hover:border-accent/60 px-2.5 py-1 rounded-lg transition-colors">
              Reset to {utility} standard
            </button>
          </div>

          {/* UAE standard reference */}
          <div className="mb-4 p-3 rounded-lg border border-border-subtle bg-bg-card/50">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Info size={11} className="text-accent" />
              <span className="text-[10px] text-accent-hover font-semibold uppercase tracking-widest">{utility} Published Mix 2024</span>
            </div>
            <p className="text-[10px] text-white/40 mb-2">{utilityMix.note}</p>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(MIX_LABELS) as (keyof typeof MIX_LABELS)[]).map(k => (
                <div key={k} className="flex items-center gap-1 text-[10px] text-white/50">
                  <span className="w-2 h-2 rounded-full" style={{ background: MIX_COLORS[k] }} />
                  {MIX_LABELS[k]}: <span className="text-white/70 font-mono ml-0.5">{utilityMix[k]}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="mb-2">
            {(Object.keys(MIX_LABELS) as (keyof ElecSource)[]).map(k => (
              <MixSlider key={k} field={k} value={draft[k]}
                color={MIX_COLORS[k as keyof typeof MIX_COLORS]}
                onChange={setField(k)} />
            ))}
          </div>

          {/* Sum indicator */}
          <div className="flex items-center justify-between mb-4">
            <div className="h-2 flex-1 rounded-full overflow-hidden flex mr-4">
              {(Object.keys(MIX_LABELS) as (keyof ElecSource)[]).map(k => (
                <div key={k} style={{
                  width: `${draft[k]}%`,
                  background: MIX_COLORS[k as keyof typeof MIX_COLORS],
                }} />
              ))}
            </div>
            <span className={clsx('text-xs font-mono font-semibold',
              total === 100 ? 'text-success-light' : 'text-danger-light'
            )}>
              {total}% {total !== 100 && '(must = 100%)'}
            </span>
          </div>

          {/* Emission factor result */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border-subtle bg-bg-card/50 mb-5">
            <div>
              <div className="text-[10px] text-white/35 uppercase tracking-widest mb-0.5">Resulting Emission Factor</div>
              <div className="text-lg font-semibold font-mono" style={{ color: factorColor }}>
                {factor.toFixed(3)} kgCO₂/kWh
              </div>
            </div>
            <div className="text-right text-[11px] text-white/40">
              <div>Gas: {CO2_FACTORS.electricity.gas_fired} · Coal: {CO2_FACTORS.electricity.coal}</div>
              <div>Renewable: {CO2_FACTORS.electricity.renewable} · Mix: {CO2_FACTORS.electricity.mix}</div>
            </div>
          </div>

          {/* Save actions */}
          {appliedMsg && (
            <div className="mb-3 text-xs text-success-light bg-success/10 border border-success/20 rounded-lg px-3 py-2">
              ✓ {appliedMsg}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button
              onClick={save}
              disabled={total !== 100}
              className="btn-primary w-full justify-center disabled:opacity-40">
              <Zap size={13} /> Save for this site
            </button>

            {sameCitySites.length > 0 && (
              <button
                onClick={() => setShowApply(v => !v)}
                className="btn-secondary w-full justify-center">
                Apply to all sites in {site.city}
                {showApply ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            )}

            {showApply && sameCitySites.length > 0 && (
              <div className="p-3 rounded-lg border border-warning/30 bg-warning/5">
                <p className="text-xs text-warning-light mb-2">
                  This will overwrite the energy mix for {sameCitySites.length + 1} sites in {site.city}:
                </p>
                <ul className="text-[11px] text-white/50 mb-3 space-y-0.5">
                  <li>• {site.name} (this site)</li>
                  {sameCitySites.map(s => <li key={s.id}>• {s.name}</li>)}
                </ul>
                <button
                  onClick={saveToCity}
                  disabled={total !== 100}
                  className="w-full bg-warning/20 hover:bg-warning/30 border border-warning/40 text-warning-light text-xs py-1.5 rounded-lg transition-colors disabled:opacity-40">
                  Confirm — apply to {site.city}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Sites() {
  const { market, siteMixes } = useAppStore()
  const cfg = MARKET_CONFIGS[market]
  const [activeSite, setActiveSite] = useState<string | null>(null)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Sites" subtitle="Operational facility overview" />
      <div className="flex-1 overflow-y-auto p-6">

        <div className="grid grid-cols-3 gap-4">
          {MOCK_SITES.map(site => {
            const spend = SITE_SPEND[site.id] ?? 0
            const util  = Math.round((spend / site.annual_budget) * 100)
            const barColor = util > 85 ? '#ef4444' : util > 60 ? '#f59e0b' : '#10b981'
            const mix = siteMixes[site.id] ?? { gas_fired:52, coal:0, renewable:35, mix:13 }
            const utility = SITE_UTILITY[site.id] ?? 'DEWA'
            const factor = calcEmissionFactor(mix)
            const factorColor = factor < 0.15 ? '#10b981' : factor < 0.35 ? '#f59e0b' : '#ef4444'

            return (
              <div
                key={site.id}
                className="card-hover cursor-pointer group"
                onClick={() => setActiveSite(site.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-sm font-semibold text-white group-hover:text-accent-hover transition-colors">
                      {site.name}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-white/40">
                      <MapPin size={10} /> {site.city}, {site.country} · {site.connections_count} connections
                    </div>
                  </div>
                  <span className={`status-${site.status.toLowerCase()}`}>{site.status}</span>
                </div>

                {/* Budget bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-white/40 mb-1.5">
                    <span>Budget utilization</span>
                    <span className="text-white/60">{util}%</span>
                  </div>
                  <div className="h-1.5 bg-bg-primary rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width:`${util}%`, background:barColor }} />
                  </div>
                </div>

                <div className="flex justify-between text-xs mb-3">
                  <div>
                    <span className="text-white/40">Spend: </span>
                    <span className="text-white font-medium">{cfg.currencySymbol} {spend.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-white/40">Budget: </span>
                    <span className="text-white/60">{cfg.currencySymbol} {site.annual_budget.toLocaleString()}</span>
                  </div>
                </div>

                {/* Energy mix strip */}
                <div className="mb-1.5">
                  <div className="flex items-center justify-between text-[10px] text-white/35 mb-1">
                    <span>Energy mix ({utility})</span>
                    <span style={{ color: factorColor }} className="font-mono font-semibold">
                      {factor.toFixed(3)} kgCO₂/kWh
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden flex">
                    {(Object.keys(MIX_COLORS) as (keyof ElecSource)[]).map(k => (
                      <div key={k} style={{ width:`${mix[k]}%`, background:MIX_COLORS[k] }} />
                    ))}
                  </div>
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    {(Object.keys(MIX_LABELS) as (keyof ElecSource)[]).filter(k => mix[k] > 0).map(k => (
                      <span key={k} className="text-[9px] text-white/35 flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: MIX_COLORS[k] }} />
                        {MIX_LABELS[k]} {mix[k]}%
                      </span>
                    ))}
                  </div>
                </div>

                <p className="text-[10px] text-accent-hover mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to edit energy mix →
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {activeSite && (
        <SitePanel siteId={activeSite} onClose={() => setActiveSite(null)} />
      )}
    </div>
  )
}
