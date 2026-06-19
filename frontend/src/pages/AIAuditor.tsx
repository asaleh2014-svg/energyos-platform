import { useState, useRef, useEffect } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useAppStore } from '@/lib/store'
import { MARKET_CONFIGS, type AIProvider, type Market } from '@/types'
import { supabase } from '@/lib/supabase'
import { aiApi } from '@/lib/api'
import { Send, Bot, RefreshCw, Download, Trash2 } from 'lucide-react'
import clsx from 'clsx'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface PortfolioContext {
  invoices:    any[]
  sites:       any[]
  connections: any[]
  consumption: any[]
  loaded: boolean
}

const PROVIDERS: { id: AIProvider; name: string; model: string; tag: string }[] = [
  { id: 'claude',  name: 'Claude',  model: 'claude-sonnet-4-20250514', tag: 'Anthropic · Recommended' },
  { id: 'gemini',  name: 'Gemini',  model: 'gemini-2.5-flash',         tag: 'Google' },
  { id: 'openai',  name: 'GPT-4o',  model: 'gpt-4o-2024-08-06',        tag: 'OpenAI' },
]

const QUICK_PROMPTS = [
  { label: '🔍 Anomaly scan',     text: 'Identify any anomalies or unusual patterns in my invoice and consumption data.' },
  { label: '💰 Spend analysis',   text: 'Summarise my total spend, VAT, and which suppliers I am paying most.' },
  { label: '📋 Exec summary',     text: 'Generate an executive summary of my energy portfolio for the board.' },
  { label: '🧾 Invoice check',    text: 'Check my invoices for any billing errors or overcharges.' },
  { label: '🌱 ESG report',       text: 'What ESG metrics should I report for UAE Net Zero 2050 compliance?' },
  { label: '⚡ Consumption trend', text: 'Analyse my consumption trends across sites and identify the highest consuming locations.' },
  { label: '📉 Cost reduction',   text: 'What are the top 3 actions I can take to reduce my energy costs?' },
  { label: '🔋 Contract review',  text: 'Based on my consumption patterns, are my current tariff contracts optimal?' },
]

function buildContext(data: PortfolioContext, flags: Record<string, boolean>): string {
  const lines: string[] = ['=== EnergyOS Live Portfolio Data ===\n']

  if (flags['Invoice data'] && data.invoices.length > 0) {
    lines.push(`--- INVOICES (${data.invoices.length} records) ---`)
    const totalExVat = data.invoices.reduce((a, i) => a + (i.amount_ex_vat ?? 0), 0)
    const totalVat   = data.invoices.reduce((a, i) => a + (i.vat_amount ?? 0), 0)
    const totalInc   = data.invoices.reduce((a, i) => a + (i.amount_inc_vat ?? 0), 0)
    const anomalies  = data.invoices.filter(i => i.status === 'Anomaly').length
    lines.push(`Total invoices: ${data.invoices.length}`)
    lines.push(`Total excl. VAT: ${totalExVat.toLocaleString()}`)
    lines.push(`Total VAT: ${totalVat.toLocaleString()}`)
    lines.push(`Total incl. VAT: ${totalInc.toLocaleString()}`)
    lines.push(`Anomalies flagged: ${anomalies}`)
    lines.push(`Statuses: ${[...new Set(data.invoices.map(i => i.status))].join(', ')}`)
    lines.push(`Suppliers: ${[...new Set(data.invoices.map(i => i.supplier).filter(Boolean))].join(', ')}`)
    lines.push('\nInvoice details:')
    data.invoices.forEach(inv => {
      lines.push(`  • ${inv.nus_ref ?? 'N/A'} | ${inv.supplier ?? '?'} | ${inv.doc_type} | ExVAT: ${inv.amount_ex_vat ?? '?'} | VAT: ${inv.vat_amount ?? '?'} | Total: ${inv.amount_inc_vat ?? '?'} | Due: ${inv.payment_due ?? '?'} | Status: ${inv.status}${inv.notes ? ` | Notes: ${inv.notes}` : ''}`)
    })
    lines.push('')
  }

  if (flags['Fleet data'] && data.connections.length > 0) {
    lines.push(`--- CONNECTIONS (${data.connections.length} meters) ---`)
    data.connections.forEach((c: any) => {
      lines.push(`  • ${c.meter_number ?? c.id} | ${c.product} | Site: ${c.name} | Status: ${c.status} | Monitoring: ${c.monitoring}`)
    })
    lines.push('')
  }

  if (flags['Sites'] && data.sites.length > 0) {
    lines.push(`--- SITES (${data.sites.length} locations) ---`)
    data.sites.forEach((s: any) => {
      lines.push(`  • ${s.name} | Status: ${s.status}`)
    })
    lines.push('')
  }

  if (flags['Consumption data'] && data.consumption.length > 0) {
    lines.push(`--- CONSUMPTION RECORDS (${data.consumption.length} records) ---`)
    const totalKwh = data.consumption.filter(c => c.unit === 'kWh').reduce((a: number, c: any) => a + (c.consumption ?? 0), 0)
    lines.push(`Total electricity: ${totalKwh.toLocaleString()} kWh`)
    data.consumption.slice(0, 20).forEach((c: any) => {
      lines.push(`  • Meter: ${c.meter_id?.slice(0,8)} | ${c.period_start}–${c.period_end} | ${c.consumption} ${c.unit}${c.cost ? ` | Cost: ${c.cost}` : ''}`)
    })
    lines.push('')
  }

  if (lines.length === 1) {
    lines.push('No data loaded yet — user has no records in the database.')
  }

  return lines.join('\n')
}

export default function AIAuditor() {
  const { aiProvider, setAIProvider, market } = useAppStore()
  const [localMarket, setLocalMarket] = useState<Market>(market)
  const [portfolio,   setPortfolio]   = useState<PortfolioContext>({ invoices: [], sites: [], connections: [], consumption: [], loaded: false })
  const [loadingData, setLoadingData] = useState(true)
  const [contextFlags, setContextFlags] = useState<Record<string, boolean>>({
    'Invoice data':       true,
    'Fleet data':         true,
    'Sites':              true,
    'Consumption data':   true,
    'Budget data':        false,
    'Tariff tables':      false,
  })

  const [messages, setMessages] = useState<Message[]>([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [showQuick,setShowQuick]= useState(true)
  const msgsRef = useRef<HTMLDivElement>(null)

  // ── Load real data from Supabase ────────────────────────────────────────
  const loadPortfolioData = async () => {
    setLoadingData(true)
    const [{ data: invoices }, { data: sites }, { data: connections }, { data: consumption }] = await Promise.all([
      supabase.from('invoices').select('*').order('created_at', { ascending: false }),
      supabase.from('sites').select('id, name, status').limit(50),
      supabase.from('energy_connections').select('*').limit(50),
      supabase.from('consumption_records').select('*').order('period_start', { ascending: false }).limit(100),
    ])

    const inv  = invoices    ?? []
    const sit  = sites       ?? []
    const conn = connections ?? []
    const cons = consumption ?? []

    setPortfolio({ invoices: inv, sites: sit, connections: conn, consumption: cons, loaded: true })
    setLoadingData(false)

    // Set welcome message with real stats
    const totalInv = inv.reduce((a: number, i: any) => a + (i.amount_inc_vat ?? 0), 0)
    const anomalies = inv.filter((i: any) => i.status === 'Anomaly').length
    setMessages([{
      role: 'assistant',
      content: `**EnergyOS Auditor ready — live data loaded.**\n\n` +
        `I have access to your real portfolio:\n` +
        `• **${inv.length} invoice${inv.length !== 1 ? 's'  : ''}** — Total ${totalInv.toLocaleString()} incl. VAT${anomalies > 0 ? ` · ⚠️ ${anomalies} anomal${anomalies > 1 ? 'ies' : 'y'}` : ''}\n` +
        `• **${conn.length} connection${conn.length !== 1 ? 's' : ''}** across ${sit.length} site${sit.length !== 1 ? 's' : ''}\n` +
        `• **${cons.length} consumption record${cons.length !== 1 ? 's' : ''}** loaded\n\n` +
        `Ask me anything — I'll analyse your actual data.`
    }])
  }

  useEffect(() => { loadPortfolioData() }, [])

  useEffect(() => {
    msgsRef.current?.scrollTo({ top: msgsRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return
    setShowQuick(false)
    const userMsg: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const context = buildContext(portfolio, contextFlags)
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
      const data = await aiApi.chat(history, aiProvider, localMarket, context)
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Could not reach the AI backend. Make sure the backend server is running on port 3001.',
      }])
    } finally {
      setLoading(false)
    }
  }

  const renderContent = (text: string) =>
    text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="AI Auditor" subtitle="Pluggable AI energy intelligence" />
      <div className="flex flex-1 overflow-hidden p-4 gap-4">

        {/* ── Left sidebar ────────────────────────────────────────────────── */}
        <aside className="w-60 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">

          {/* Provider selector */}
          <div className="card flex flex-col gap-2 p-4">
            <div className="label mb-1">AI Provider</div>
            {PROVIDERS.map(p => (
              <div key={p.id} onClick={() => setAIProvider(p.id)}
                className={clsx('border rounded-lg p-3 cursor-pointer transition-all',
                  aiProvider === p.id ? 'border-accent bg-accent/10' : 'border-border-subtle hover:border-border-default')}>
                <div className="text-sm font-semibold text-white">{p.name}</div>
                <div className="font-mono text-[10px] text-white/30 mt-0.5">{p.model}</div>
                <div className={clsx('text-[10px] mt-1.5 px-1.5 py-0.5 rounded-full inline-block',
                  aiProvider === p.id ? 'bg-accent/20 text-accent-hover' : 'bg-bg-hover text-white/30')}>
                  {p.tag}
                </div>
              </div>
            ))}
          </div>

          {/* Market */}
          <div className="card p-4">
            <div className="label mb-2">Market Context</div>
            <select className="form-select text-xs" value={localMarket} onChange={e => setLocalMarket(e.target.value as Market)}>
              {Object.entries(MARKET_CONFIGS).map(([k, v]) => (
                <option key={k} value={k}>{v.flag} {v.label} · {v.tariffAuthority.split('/')[0].trim()}</option>
              ))}
            </select>
          </div>

          {/* Context toggles */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="label">Context Included</div>
              <button onClick={loadPortfolioData} title="Refresh data"
                className="text-white/30 hover:text-white/60">
                <RefreshCw size={12} className={loadingData ? 'animate-spin' : ''} />
              </button>
            </div>
            {Object.keys(contextFlags).map(item => (
              <div key={item} className="flex items-center justify-between py-1.5 border-b border-border-subtle last:border-0">
                <span className="text-xs text-white/50">{item}</span>
                <button
                  onClick={() => setContextFlags(f => ({ ...f, [item]: !f[item] }))}
                  className={clsx('w-7 h-4 rounded-full relative transition-colors',
                    contextFlags[item] ? 'bg-accent' : 'bg-bg-hover border border-border-subtle')}>
                  <div className={clsx('absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all',
                    contextFlags[item] ? 'right-0.5' : 'left-0.5')} />
                </button>
              </div>
            ))}

            {/* Live data summary */}
            {portfolio.loaded && (
              <div className="mt-3 pt-3 border-t border-border-subtle space-y-1">
                <div className="text-[10px] text-white/30">Live data loaded:</div>
                <div className="text-[10px] text-success-light">✓ {portfolio.invoices.length} invoices</div>
                <div className="text-[10px] text-success-light">✓ {portfolio.connections.length} connections</div>
                <div className="text-[10px] text-success-light">✓ {portfolio.sites.length} sites</div>
                <div className="text-[10px] text-success-light">✓ {portfolio.consumption.length} consumption records</div>
              </div>
            )}
          </div>
        </aside>

        {/* ── Chat panel ──────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col card p-0 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border-subtle">
            <div className={clsx('w-2 h-2 rounded-full', loadingData ? 'bg-warning animate-pulse' : 'bg-success animate-pulse')} />
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">AI Energy Auditor</div>
              <div className="text-xs text-white/30">
                {PROVIDERS.find(p => p.id === aiProvider)?.name} · {MARKET_CONFIGS[localMarket].flag} {localMarket} market · {loadingData ? 'Loading data…' : 'Live data active'}
              </div>
            </div>
            <button
              onClick={() => {
                const txt = messages.map(m => `[${m.role.toUpperCase()}]\n${m.content}`).join('\n\n---\n\n')
                const blob = new Blob([txt], { type: 'text/plain' })
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
                a.download = `energyos-ai-audit-${new Date().toISOString().slice(0,10)}.txt`; a.click()
              }}
              title="Export chat"
              className="text-white/30 hover:text-white/60 transition-colors p-1.5">
              <Download size={13} />
            </button>
            <button
              onClick={() => { setMessages([]); setShowQuick(true) }}
              title="Clear chat"
              className="text-white/30 hover:text-white/60 transition-colors p-1.5">
              <Trash2 size={13} />
            </button>
          </div>

          <div ref={msgsRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={clsx('flex gap-2.5 max-w-[90%]', m.role === 'user' && 'ml-auto flex-row-reverse')}>
                <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-1',
                  m.role === 'assistant' ? 'bg-gradient-to-br from-accent to-purple text-white' : 'bg-bg-hover text-white/50')}>
                  {m.role === 'assistant' ? <Bot size={13} /> : 'AH'}
                </div>
                <div className={clsx('rounded-xl px-4 py-3 text-sm leading-relaxed border',
                  m.role === 'assistant' ? 'bg-bg-hover border-border-subtle text-white/80' : 'bg-accent/15 border-accent/30 text-accent-hover')}
                  dangerouslySetInnerHTML={{ __html: renderContent(m.content) }}
                />
              </div>
            ))}
            {loading && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-purple flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot size={13} className="text-white" />
                </div>
                <div className="bg-bg-hover border border-border-subtle rounded-xl px-4 py-3 flex items-center gap-1.5">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {showQuick && (
            <div className="flex flex-wrap gap-2 px-4 pb-2">
              {QUICK_PROMPTS.map(q => (
                <button key={q.label} onClick={() => sendMessage(q.text)}
                  className="text-xs bg-bg-hover border border-border-subtle text-white/50 hover:border-accent hover:text-accent-hover px-3 py-1.5 rounded-full transition-all">
                  {q.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-3 p-4 border-t border-border-subtle">
            <textarea
              className="flex-1 form-input resize-none min-h-10 max-h-28 py-2.5"
              placeholder="Ask anything about your energy portfolio..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
              rows={1}
            />
            <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}
              className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed self-end">
              <Send size={14} /> Send
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
