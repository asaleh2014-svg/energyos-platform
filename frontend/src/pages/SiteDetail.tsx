import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Topbar } from '@/components/layout/Topbar'
import {
  MOCK_SITES, SITE_SPEND, UAE_UTILITY_MIXES, SITE_UTILITY,
  CO2_FACTORS, SITE_CONNECTIONS, type ElecSource,
} from '@/lib/mockData'
import { FULL_CONNECTIONS } from '@/lib/connectionsData'
import { useAppStore } from '@/lib/store'
import { MARKET_CONFIGS } from '@/types'
import {
  ArrowLeft, Building2, Zap, Info, ChevronDown, ChevronUp, MapPin,
} from 'lucide-react'
import clsx from 'clsx'

// ─── UAE map projection ───────────────────────────────────────────────────────
const W = 700, H = 400
const LON_MIN = 51.0, LON_MAX = 56.8
const LAT_MIN = 22.2, LAT_MAX = 26.5

function project(lat: number, lon: number): [number, number] {
  const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * W
  const y = H - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * H
  return [x, y]
}

// ─── Energy mix helpers ───────────────────────────────────────────────────────
const MIX_COLORS = { gas_fired:'#f59e0b', coal:'#6b7280', renewable:'#10b981', mix:'#3b82f6' } as const
const MIX_LABELS = { gas_fired:'Gas Fired', coal:'Coal', renewable:'Renewable', mix:'Grid Mix' } as const

function calcEmissionFactor(mix: ElecSource): number {
  return (mix.gas_fired / 100) * CO2_FACTORS.electricity.gas_fired
       + (mix.coal      / 100) * CO2_FACTORS.electricity.coal
       + (mix.renewable / 100) * CO2_FACTORS.electricity.renewable
       + (mix.mix       / 100) * CO2_FACTORS.electricity.mix
}

function MixSlider({
  field, value, color, onChange,
}: { field: string; value: number; color: string; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="w-[90px] text-[11px] text-white/50 flex-shrink-0">
        {MIX_LABELS[field as keyof typeof MIX_LABELS]}
      </div>
      <input type="range" min={0} max={100} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1 h-1.5 rounded-full cursor-pointer"
        style={{ accentColor: color }} />
      <div className="w-10 text-right text-xs font-mono font-semibold" style={{ color }}>
        {value}%
      </div>
    </div>
  )
}

// ─── Product colours ──────────────────────────────────────────────────────────
const PRODUCT_COLOR: Record<string, string> = {
  Electricity: '#f59e0b',
  Gas:         '#3b82f6',
  Water:       '#06b6d4',
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SiteDetail() {
  const { siteId } = useParams<{ siteId: string }>()
  const navigate   = useNavigate()
  const { market, siteMixes, setSiteMix, applySiteMixToCity } = useAppStore()
  const cfg = MARKET_CONFIGS[market]

  const site = MOCK_SITES.find(s => s.id === siteId)
  if (!site) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Topbar title="Site not found" subtitle="" />
        <div className="p-6 text-white/40">No site found for id: {siteId}</div>
      </div>
    )
  }

  const spend   = SITE_SPEND[siteId!] ?? 0
  const util    = Math.round((spend / site.annual_budget) * 100)
  const utility = SITE_UTILITY[siteId!] ?? 'DEWA'
  const utilityMix = UAE_UTILITY_MIXES[utility]

  const connIds   = SITE_CONNECTIONS[siteId!] ?? []
  const siteConns = FULL_CONNECTIONS.filter(c => connIds.includes(c.id))

  // Group by building
  const buildingMap: Record<string, typeof siteConns> = {}
  for (const c of siteConns) {
    if (!buildingMap[c.building]) buildingMap[c.building] = []
    buildingMap[c.building].push(c)
  }
  const buildings = Object.entries(buildingMap)

  // Energy mix editor
  const currentMix = siteMixes[siteId!] ?? { gas_fired:52, coal:0, renewable:35, mix:13 }
  const [draft, setDraft]       = useState<ElecSource>({ ...currentMix })
  const [showApply, setShowApply] = useState(false)
  const [appliedMsg, setAppliedMsg] = useState('')

  const total       = draft.gas_fired + draft.coal + draft.renewable + draft.mix
  const factor      = calcEmissionFactor(draft)
  const factorColor = factor < 0.15 ? '#10b981' : factor < 0.35 ? '#f59e0b' : '#ef4444'
  const sameCitySites = MOCK_SITES.filter(s => s.city === site.city && s.id !== siteId)

  const setField = (field: keyof ElecSource) => (v: number) =>
    setDraft(d => ({ ...d, [field]: v }))

  const save = () => {
    if (total !== 100) return
    setSiteMix(siteId!, draft)
    setAppliedMsg('Saved for this site.')
    setTimeout(() => setAppliedMsg(''), 2500)
  }

  const saveToCity = () => {
    if (total !== 100) return
    setSiteMix(siteId!, draft)
    applySiteMixToCity(siteId!)
    setAppliedMsg(`Applied to all ${sameCitySites.length + 1} sites in ${site.city}.`)
    setShowApply(false)
    setTimeout(() => setAppliedMsg(''), 3000)
  }

  const barColor = util > 85 ? '#ef4444' : util > 60 ? '#f59e0b' : '#10b981'
  const [sx, sy] = project(site.latitude, site.longitude)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title={site.name} subtitle={`${site.city}, ${site.country} · Served by ${utility}`} />
      <div className="flex-1 overflow-y-auto p-6">

        {/* Back */}
        <button
          onClick={() => navigate('/sites')}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 mb-5 transition-colors group"
        >
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to Sites
        </button>

        {/* KPI row */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          <div className="card">
            <div className="label mb-1">Spend (YTD)</div>
            <div className="text-xl font-semibold text-white">{cfg.currencySymbol} {spend.toLocaleString()}</div>
          </div>
          <div className="card">
            <div className="label mb-1">Annual Budget</div>
            <div className="text-xl font-semibold text-white">{cfg.currencySymbol} {site.annual_budget.toLocaleString()}</div>
          </div>
          <div className="card">
            <div className="label mb-1">Budget Utilisation</div>
            <div className={clsx(
              'text-xl font-semibold',
              util > 85 ? 'text-danger-light' : util > 60 ? 'text-warning-light' : 'text-success-light'
            )}>{util}%</div>
            <div className="h-1 bg-bg-primary rounded-full mt-1.5 overflow-hidden">
              <div className="h-full rounded-full" style={{ width:`${util}%`, background:barColor }} />
            </div>
          </div>
          <div className="card">
            <div className="label mb-1">Connections</div>
            <div className="text-xl font-semibold text-white">{connIds.length}</div>
            <div className="text-xs text-white/40 mt-0.5">
              across {buildings.length} building{buildings.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-3 gap-5">

          {/* ─ Left: Map + Buildings ─────────────────────────────────────────── */}
          <div className="col-span-2 space-y-5">

            {/* UAE Map */}
            <div className="card overflow-hidden p-0">
              <div className="px-4 pt-4 pb-2">
                <h2 className="section-title">Site Location</h2>
                <p className="text-xs text-white/30 mt-0.5 flex items-center gap-1">
                  <MapPin size={10} />
                  {site.latitude.toFixed(4)}°N {site.longitude.toFixed(4)}°E · {site.city}, {site.country}
                </p>
              </div>
              <div className="bg-bg-primary/40" style={{ height: 220 }}>
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                  {/* Subtle grid */}
                  {[51,52,53,54,55,56].map(lon => {
                    const [gx] = project(24, lon)
                    return <line key={lon} x1={gx} y1={0} x2={gx} y2={H} stroke="#ffffff07" strokeWidth={1} />
                  })}
                  {[23,24,25,26].map(lat => {
                    const [, gy] = project(lat, 54)
                    return <line key={lat} x1={0} y1={gy} x2={W} y2={gy} stroke="#ffffff07" strokeWidth={1} />
                  })}

                  {/* Other sites — faint */}
                  {MOCK_SITES.filter(s => s.id !== siteId).map(s => {
                    const [px, py] = project(s.latitude, s.longitude)
                    return (
                      <g key={s.id}>
                        <circle cx={px} cy={py} r={5} fill="#ffffff15" stroke="#ffffff25" strokeWidth={1} />
                        <text x={px + 8} y={py + 4} fill="#ffffff30" fontSize={9}>{s.name}</text>
                      </g>
                    )
                  })}

                  {/* Connection dots */}
                  {siteConns.map(c => {
                    const [cx2, cy2] = project(c.latitude, c.longitude)
                    const col = PRODUCT_COLOR[c.product] ?? '#fff'
                    return (
                      <circle key={c.id} cx={cx2} cy={cy2} r={3.5}
                        fill={col} opacity={0.75} stroke="#00000040" strokeWidth={0.5} />
                    )
                  })}

                  {/* This site — glowing pin */}
                  <circle cx={sx} cy={sy} r={22} fill="#3b82f610" stroke="#3b82f640" strokeWidth={1} />
                  <circle cx={sx} cy={sy} r={10} fill="#3b82f6" opacity={0.25} />
                  <circle cx={sx} cy={sy} r={6}  fill="#3b82f6" />
                  <circle cx={sx} cy={sy} r={2.5} fill="white" />

                  {/* Label */}
                  <rect x={sx + 14} y={sy - 18} width={160} height={30} rx={4}
                    fill="#0d2b35" stroke="#3b82f640" strokeWidth={1} opacity={0.9} />
                  <text x={sx + 22} y={sy - 4} fill="white" fontSize={11} fontWeight={600}>{site.name}</text>
                  <text x={sx + 22} y={sy + 8} fill="#ffffff55" fontSize={9}>{site.city} · {connIds.length} connections</text>
                </svg>
              </div>
            </div>

            {/* Buildings & Connections */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="section-title">Buildings &amp; Connections</h2>
                <span className="text-[10px] text-white/30">{siteConns.length} connections across {buildings.length} buildings</span>
              </div>

              {buildings.length === 0 ? (
                <div className="card text-center py-10 text-white/30 text-sm">
                  No connections assigned to this site yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {buildings.map(([building, conns]) => (
                    <div key={building} className="card">
                      {/* Building header */}
                      <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-border-subtle">
                        <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
                          <Building2 size={13} className="text-accent" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">{building}</div>
                        </div>
                        <span className="text-[10px] text-white/35 ml-auto">
                          {conns.length} connection{conns.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Connection rows */}
                      <div className="space-y-1">
                        {conns.map(c => (
                          <div key={c.id}
                            className="flex items-center gap-3 px-2.5 py-2 rounded-lg bg-bg-primary/50 hover:bg-bg-primary transition-colors cursor-default">
                            <span className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ background: PRODUCT_COLOR[c.product] ?? '#fff' }} />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-white/85 truncate">{c.name}</div>
                              <div className="text-[10px] text-white/35">{c.ean_code}</div>
                            </div>
                            <div className="hidden sm:flex items-center gap-2 text-[10px] text-white/30 flex-shrink-0">
                              <span className="font-mono">{c.connection_type}</span>
                              <span>·</span>
                              <span>{c.product}</span>
                            </div>
                            <span className={`status-${c.status.toLowerCase()} flex-shrink-0`}>{c.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ─ Right: Energy mix editor ──────────────────────────────────────── */}
          <div>
            <div className="card sticky top-0">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">Energy Source Mix</h3>
                  <p className="text-[10px] text-white/35 mt-0.5">Applies to all {connIds.length} connections</p>
                </div>
                <button
                  onClick={() => setDraft({ ...utilityMix })}
                  className="text-[10px] text-accent-hover border border-accent/30 hover:border-accent/60 px-2 py-0.5 rounded-lg transition-colors flex-shrink-0 ml-2"
                >
                  Reset to {utility}
                </button>
              </div>

              {/* UAE utility reference card */}
              <div className="mb-4 p-2.5 rounded-lg border border-border-subtle bg-bg-primary/50">
                <div className="flex items-center gap-1.5 mb-1">
                  <Info size={10} className="text-accent" />
                  <span className="text-[9px] text-accent-hover font-semibold uppercase tracking-widest">
                    {utility} Published Mix 2024
                  </span>
                </div>
                <p className="text-[9px] text-white/40 mb-1.5 leading-relaxed">{utilityMix.note}</p>
                <div className="flex gap-x-2 gap-y-1 flex-wrap">
                  {(Object.keys(MIX_LABELS) as (keyof typeof MIX_LABELS)[]).map(k => (
                    <div key={k} className="flex items-center gap-1 text-[9px] text-white/50">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: MIX_COLORS[k] }} />
                      {MIX_LABELS[k]}: <span className="text-white/70 font-mono ml-0.5">{utilityMix[k]}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sliders */}
              <div className="mb-1">
                {(Object.keys(MIX_LABELS) as (keyof ElecSource)[]).map(k => (
                  <MixSlider key={k} field={k} value={draft[k]}
                    color={MIX_COLORS[k as keyof typeof MIX_COLORS]}
                    onChange={setField(k)} />
                ))}
              </div>

              {/* Total bar */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-2 flex-1 rounded-full overflow-hidden flex">
                  {(Object.keys(MIX_LABELS) as (keyof ElecSource)[]).map(k => (
                    <div key={k} style={{
                      width: `${draft[k]}%`,
                      background: MIX_COLORS[k as keyof typeof MIX_COLORS],
                    }} />
                  ))}
                </div>
                <span className={clsx('text-xs font-mono font-semibold w-16 text-right',
                  total === 100 ? 'text-success-light' : 'text-danger-light')}>
                  {total}% {total !== 100 && '≠100'}
                </span>
              </div>

              {/* Emission factor result */}
              <div className="p-2.5 rounded-lg border border-border-subtle bg-bg-primary/50 mb-4">
                <div className="text-[9px] text-white/35 uppercase tracking-widest mb-0.5">
                  Resulting Emission Factor
                </div>
                <div className="text-base font-semibold font-mono" style={{ color: factorColor }}>
                  {factor.toFixed(3)} kgCO₂/kWh
                </div>
                <div className="text-[9px] text-white/30 mt-0.5">
                  Gas: {CO2_FACTORS.electricity.gas_fired} · Coal: {CO2_FACTORS.electricity.coal} · Renewable: {CO2_FACTORS.electricity.renewable}
                </div>
              </div>

              {/* Feedback */}
              {appliedMsg && (
                <div className="mb-3 text-xs text-success-light bg-success/10 border border-success/20 rounded-lg px-3 py-2">
                  ✓ {appliedMsg}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={save}
                  disabled={total !== 100}
                  className="btn-primary w-full justify-center disabled:opacity-40"
                >
                  <Zap size={13} /> Save for this site
                </button>

                {sameCitySites.length > 0 && (
                  <button
                    onClick={() => setShowApply(v => !v)}
                    className="btn-secondary w-full justify-center"
                  >
                    Apply to all in {site.city}
                    {showApply ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                )}

                {showApply && (
                  <div className="p-2.5 rounded-lg border border-warning/30 bg-warning/5">
                    <p className="text-[10px] text-warning-light mb-1.5">
                      Overwrite mix for {sameCitySites.length + 1} sites in {site.city}:
                    </p>
                    <ul className="text-[10px] text-white/50 mb-2 space-y-0.5">
                      <li>• {site.name} (this site)</li>
                      {sameCitySites.map(s => <li key={s.id}>• {s.name}</li>)}
                    </ul>
                    <button
                      onClick={saveToCity}
                      disabled={total !== 100}
                      className="w-full bg-warning/20 hover:bg-warning/30 border border-warning/40 text-warning-light text-xs py-1.5 rounded-lg transition-colors disabled:opacity-40"
                    >
                      Confirm — apply to {site.city}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
