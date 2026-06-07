import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useAppStore } from '@/lib/store'
import { MARKET_CONFIGS, type Market } from '@/types'
import clsx from 'clsx'

const TABS = ['Account','Market & Locale','Subscription','API Keys','Team','Notifications']

const PLANS = [
  { id:'starter',      name:'Starter',      price:'AED 299',  period:'/mo', features:['Up to 5 connections','Basic analytics','Email support','1 user seat'] },
  { id:'professional', name:'Professional', price:'AED 899',  period:'/mo', features:['Up to 25 connections','AI auditor + reports','Invoice verification','5 user seats','API access'], popular:true },
  { id:'enterprise',   name:'Enterprise',   price:'Custom',   period:'',    features:['Unlimited connections','White-label option','Dedicated support','Custom AI models','SLA + SSO'] },
]

export default function Settings() {
  const { tenant, market, setMarket } = useAppStore()
  const [tab, setTab] = useState('Account')

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
          <div className="card">

            {tab === 'Account' && (
              <div>
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
              <div>
                <h2 className="text-sm font-semibold text-white mb-5">Market & Locale</h2>
                <div className="mb-4">
                  <label className="label block mb-1.5">Primary Market</label>
                  <select className="form-select" value={market} onChange={e => setMarket(e.target.value as Market)}>
                    {Object.entries(MARKET_CONFIGS).map(([k, v]) => (
                      <option key={k} value={k}>{v.flag} {v.label} — {v.tariffAuthority}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="label block mb-1.5">Currency</label>
                  <select className="form-select" defaultValue={MARKET_CONFIGS[market].currency}>
                    {Object.values(MARKET_CONFIGS).map(v => (
                      <option key={v.currency} value={v.currency}>{v.currency} — {v.flag}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="label block mb-1.5">Meter ID Format</label>
                  <input className="form-input" defaultValue={MARKET_CONFIGS[market].meterIdFormat} readOnly />
                </div>
                <div className="p-3 bg-accent/5 border border-accent/20 rounded-lg text-xs text-accent-hover mt-4">
                  {MARKET_CONFIGS[market].flag} {market} mode active — capacity in {MARKET_CONFIGS[market].capacityUnit}, currency {MARKET_CONFIGS[market].currency}.
                </div>
                <button className="btn-primary mt-4">Save</button>
              </div>
            )}

            {tab === 'Subscription' && (
              <div>
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
              <div>
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
              <div>
                <h2 className="text-sm font-semibold text-white mb-5">Team Members</h2>
                <table className="w-full mb-5">
                  <thead>
                    <tr>{['Name','Email','Role','Status',''].map(h => <th key={h} className="tbl-th">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {[
                      { name:'Ahmad Al-Hassan', email:'ahmad@masdar.ae', role:'Administrator', status:'Active' },
                      { name:'Sara Khalid',     email:'sara@masdar.ae',  role:'Auditor',       status:'Active' },
                      { name:'James O\'Brien',  email:'james@masdar.ae', role:'Viewer',        status:'Pending' },
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
              <div>
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
