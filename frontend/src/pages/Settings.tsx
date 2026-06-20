import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useAppStore } from '@/lib/store'
import { MARKET_CONFIGS, type Market } from '@/types'
import { Zap, Flame, Shield, Building2, Info } from 'lucide-react'
import clsx from 'clsx'

const TABS = ['Account','Market & Locale','Subscription','API Keys','Team','Notifications']

const PLANS = [
  { id:'starter',      name:'Starter',      price:'AED 299',  period:'/mo', features:['Up to 5 connections','Basic analytics','Email support','1 user seat'] },
  { id:'professional', name:'Professional', price:'AED 899',  period:'/mo', features:['Up to 25 connections','AI auditor + reports','Invoice verification','5 user seats','API access'], popular:true },
  { id:'enterprise',   name:'Enterprise',   price:'Custom',   period:'',    features:['Unlimited connections','White-label option','Dedicated support','Custom AI models','SLA + SSO'] },
]

// Group markets for display
const MARKET_GROUPS = [
  {
    group: '🇦🇪 United Arab Emirates',
    entries: ['UAE-DXB','UAE-AUH','UAE-SHJ','UAE-RAK','UAE-AJM','UAE-FUJ','UAE-UAQ'] as Market[],
  },
  {
    group: '🌍 Other Markets',
    entries: ['NL','UK','SA','INTL'] as Market[],
  },
]

export default function Settings() {
  const { tenant, market, setMarket } = useAppStore()
  const [tab, setTab] = useState('Account')
  const cfg = MARKET_CONFIGS[market]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Settings" subtitle="Account, market & subscription configuration" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-[200px_1fr] gap-5">

          {/* Settings nav */}
          <div className="flex flex-col gap-1">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={clsx('text-left px-3 py-2 rounded-lg text-sm transition-all',
                  tab === t ? 'bg-accent/15 text-accent-hover font-medium' : 'text-white/50 hover:bg-bg-card hover:text-white/80'
                )}>{t}</button>
            ))}
          </div>

          {/* Panel */}
          <div>

            {tab === 'Account' && (
              <div className="card">
                <h2 className="text-sm font-semibold text-white mb-5">Account Settings</h2>
                {[
                  { label:'Organization Name', value:'Masdar City Group', type:'text' },
                  { label:'Admin Email', value:'admin@masdar.ae', type:'email' },
                  { label:'Primary Contact', value:'Ahmad Al-Hassan', type:'text' },
                  { label:'Phone', value:'+971 50 XXX XXXX', type:'text' },
                ].map(f => (
                  <div key={f.label} className="mb-4">
                    <label className="label block mb-1.5">{f.label}</label>
                    <input className="form-input" type={f.type} defaultValue={f.value} />
                  </div>
                ))}
                <button className="btn-primary mt-2">Save Changes</button>
              </div>
            )}

            {tab === 'Market & Locale' && (
              <div className="space-y-4">
                {/* Market selector */}
                <div className="card">
                  <h2 className="text-sm font-semibold text-white mb-4">Primary Market</h2>
                  <select
                    className="form-select w-full mb-4"
                    value={market}
                    onChange={e => setMarket(e.target.value as Market)}
                  >
                    {MARKET_GROUPS.map(g => (
                      <optgroup key={g.group} label={g.group}>
                        {g.entries.map(k => {
                          const v = MARKET_CONFIGS[k]
                          return (
                            <option key={k} value={k}>
                              {v.flag} {v.label}
                            </option>
                          )
                        })}
                      </optgroup>
                    ))}
                  </select>

                  {/* Active market badge */}
                  <div className="flex items-center gap-2 p-3 bg-accent/5 border border-accent/20 rounded-lg text-xs">
                    <span className="text-xl">{cfg.flag}</span>
                    <div>
                      <span className="text-accent-hover font-semibold">{cfg.label}</span>
                      <span className="text-white/40 ml-2">·</span>
                      <span className="text-white/40 ml-2">{cfg.currency} · {cfg.vatLabel} {cfg.vatPct}%</span>
                    </div>
                  </div>
                </div>

                {/* Market detail card */}
                <div className="card">
                  <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Building2 size={14} className="text-accent" />
                    Market Information — {cfg.label}
                  </h2>

                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-5 text-xs">
                    {[
                      { label: 'Tariff Authority',    value: cfg.tariffAuthority },
                      { label: 'Network Operator',    value: cfg.networkOperator },
                      { label: 'Regulatory Body',     value: cfg.regulatoryBody },
                      { label: 'Meter ID Format',     value: cfg.meterIdFormat },
                      { label: 'Capacity Unit',       value: cfg.capacityUnit },
                      { label: 'Tax',                 value: `${cfg.vatLabel} ${cfg.vatPct}%` },
                    ].map(r => (
                      <div key={r.label}>
                        <div className="text-white/35 mb-0.5">{r.label}</div>
                        <div className="text-white/80">{r.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Electricity tariff bands */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap size={12} className="text-yellow-400" />
                      <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                        Electricity Tariff — {cfg.currency}/kWh
                      </span>
                    </div>
                    <div className="card p-0 overflow-hidden bg-bg-secondary">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border-subtle">
                            <th className="tbl-th">Band</th>
                            <th className="tbl-th text-right">Rate ({cfg.currency}/kWh)</th>
                            <th className="tbl-th text-right">incl. {cfg.vatPct}% {cfg.vatLabel}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cfg.electricityBands.map((b, i) => (
                            <tr key={i} className="tbl-row">
                              <td className="tbl-td text-white/70">{b.label}</td>
                              <td className="tbl-td text-right font-mono text-yellow-300">{b.rate.toFixed(3)}</td>
                              <td className="tbl-td text-right font-mono text-white/50">
                                {(b.rate * (1 + cfg.vatPct / 100)).toFixed(3)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Gas tariff bands */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Flame size={12} className="text-orange-400" />
                      <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                        Gas Tariff — {cfg.currency}/m³
                      </span>
                    </div>
                    <div className="card p-0 overflow-hidden bg-bg-secondary">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border-subtle">
                            <th className="tbl-th">Band</th>
                            <th className="tbl-th text-right">Rate ({cfg.currency}/m³)</th>
                            <th className="tbl-th text-right">incl. {cfg.vatPct}% {cfg.vatLabel}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cfg.gasBands.map((b, i) => (
                            <tr key={i} className="tbl-row">
                              <td className="tbl-td text-white/70">{b.label}</td>
                              <td className="tbl-td text-right font-mono text-orange-300">{b.rate.toFixed(3)}</td>
                              <td className="tbl-td text-right font-mono text-white/50">
                                {(b.rate * (1 + cfg.vatPct / 100)).toFixed(3)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Notes */}
                  {cfg.notes && (
                    <div className="flex items-start gap-2 p-3 bg-bg-secondary border border-border-subtle rounded-lg text-xs text-white/50">
                      <Info size={12} className="text-accent mt-0.5 shrink-0" />
                      <p className="leading-relaxed">{cfg.notes}</p>
                    </div>
                  )}
                </div>

                {/* All UAE markets overview */}
                {market.startsWith('UAE') && (
                  <div className="card">
                    <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                      <Shield size={14} className="text-accent" />
                      All UAE Energy Markets
                    </h2>
                    <div className="card p-0 overflow-hidden bg-bg-secondary">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border-subtle">
                            <th className="tbl-th">Emirate / Utility</th>
                            <th className="tbl-th">Regulator</th>
                            <th className="tbl-th text-right">Elec (AED/kWh)</th>
                            <th className="tbl-th text-right">Gas (AED/m³)</th>
                            <th className="tbl-th">Meter Format</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(['UAE-DXB','UAE-AUH','UAE-SHJ','UAE-RAK','UAE-AJM','UAE-FUJ','UAE-UAQ'] as Market[]).map(k => {
                            const m = MARKET_CONFIGS[k]
                            return (
                              <tr key={k} className={clsx('tbl-row cursor-pointer', market === k && 'bg-accent/8')}
                                onClick={() => setMarket(k)}>
                                <td className="tbl-td text-white font-medium">{m.flag} {m.label}</td>
                                <td className="tbl-td text-white/50">{m.networkOperator}</td>
                                <td className="tbl-td text-right font-mono text-yellow-300">{m.electricityRate.toFixed(2)}</td>
                                <td className="tbl-td text-right font-mono text-orange-300">{m.gasRate.toFixed(2)}</td>
                                <td className="tbl-td text-white/40 text-[11px]">{m.meterIdFormat.split('(')[0].trim()}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[11px] text-white/30 mt-2">Click a row to set as active market. Tariffs are indicative commercial rates (excl. VAT). Source: Utility tariff schedules 2023–2024.</p>
                  </div>
                )}

                <div className="flex justify-end">
                  <button className="btn-primary">Save Market Settings</button>
                </div>
              </div>
            )}

            {tab === 'Subscription' && (
              <div className="card">
                <h2 className="text-sm font-semibold text-white mb-5">Subscription Plan</h2>
                <div className="grid grid-cols-3 gap-4 mb-5">
                  {PLANS.map(plan => (
                    <div key={plan.id} className={clsx(
                      'border rounded-xl p-5 cursor-pointer transition-all',
                      tenant?.plan === plan.id ? 'border-accent bg-accent/8' : plan.popular ? 'border-purple/50' : 'border-border-subtle hover:border-border-default'
                    )}>
                      {plan.popular && <div className="text-[10px] bg-purple/20 text-purple-light px-2 py-0.5 rounded-full inline-block mb-2">★ Popular</div>}
                      {tenant?.plan === plan.id && <div className="text-[10px] bg-accent/20 text-accent-hover px-2 py-0.5 rounded-full inline-block mb-2">Current plan</div>}
                      <div className="text-sm font-semibold text-white mb-1">{plan.name}</div>
                      <div className="text-xl font-semibold text-white tracking-tight">{plan.price}<span className="text-sm text-white/30 font-normal">{plan.period}</span></div>
                      <ul className="mt-3 space-y-1.5">
                        {plan.features.map(f => (
                          <li key={f} className="text-xs text-white/50 flex items-start gap-1.5">
                            <span className="text-success mt-0.5">✓</span> {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'API Keys' && (
              <div className="card">
                <h2 className="text-sm font-semibold text-white mb-2">AI Provider API Keys</h2>
                <div className="p-3 bg-accent/5 border border-accent/20 rounded-lg text-xs text-accent-hover mb-5">
                  🔒 Keys are encrypted at rest (AES-256). Never logged or exposed to the frontend. Stored server-side only.
                </div>
                {[
                  { label:'Anthropic (Claude) API Key', placeholder:'sk-ant-...' },
                  { label:'Google (Gemini) API Key',    placeholder:'Not configured' },
                  { label:'OpenAI (GPT-4o) API Key',    placeholder:'Not configured' },
                ].map(f => (
                  <div key={f.label} className="mb-4">
                    <label className="label block mb-1.5">{f.label}</label>
                    <input className="form-input font-mono text-xs" type="password" placeholder={f.placeholder} />
                  </div>
                ))}
                <div className="mb-4">
                  <label className="label block mb-1.5">Default AI Provider</label>
                  <select className="form-select">
                    <option>Claude (Anthropic) — Recommended</option>
                    <option>Gemini (Google)</option>
                    <option>GPT-4o (OpenAI)</option>
                  </select>
                </div>
                <button className="btn-primary">Save API Keys</button>
              </div>
            )}

            {tab === 'Team' && (
              <div className="card">
                <h2 className="text-sm font-semibold text-white mb-5">Team Members</h2>
                <table className="w-full mb-5">
                  <thead>
                    <tr>{['Name','Email','Role','Status',''].map(h => <th key={h} className="tbl-th">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {[
                      { name:'Ahmad Al-Hassan', email:'ahmad@masdar.ae', role:'Administrator', status:'Active' },
                      { name:'Sara Khalid',     email:'sara@masdar.ae',  role:'Auditor',       status:'Active' },
                      { name:"James O'Brien",   email:'james@masdar.ae', role:'Viewer',        status:'Pending' },
                    ].map(u => (
                      <tr key={u.email} className="tbl-row">
                        <td className="tbl-td text-white font-medium">{u.name}</td>
                        <td className="tbl-td text-white/50">{u.email}</td>
                        <td className="tbl-td text-white/60">{u.role}</td>
                        <td className="tbl-td"><span className={`status-${u.status.toLowerCase()}`}>{u.status}</span></td>
                        <td className="tbl-td"><button className="btn-sm">{u.status === 'Pending' ? 'Resend' : 'Edit'}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button className="btn-primary">+ Invite Team Member</button>
              </div>
            )}

            {tab === 'Notifications' && (
              <div className="card">
                <h2 className="text-sm font-semibold text-white mb-5">Notification Preferences</h2>
                {[
                  { label:'Invoice anomaly alerts',        on:true },
                  { label:'Weekly AI summary email',       on:true },
                  { label:'Budget threshold alerts (80%)', on:true },
                  { label:'Meter offline alerts',          on:true },
                  { label:'Consumption spike (>20%)',      on:false },
                  { label:'Regulatory update alerts',      on:true },
                ].map(n => (
                  <div key={n.label} className="flex items-center justify-between py-3 border-b border-border-subtle last:border-0">
                    <span className="text-sm text-white/60">{n.label}</span>
                    <div className={clsx('w-9 h-5 rounded-full relative cursor-pointer transition-colors', n.on ? 'bg-accent' : 'bg-bg-hover border border-border-default')}>
                      <div className={clsx('absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform', n.on ? 'left-4' : 'left-0.5')} />
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
