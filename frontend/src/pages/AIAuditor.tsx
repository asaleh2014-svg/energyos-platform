import { useState, useRef, useEffect } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useAppStore } from '@/lib/store'
import { MARKET_CONFIGS, type AIProvider, type Market } from '@/types'
import { MOCK_CONNECTIONS } from '@/lib/mockData'
import { aiApi } from '@/lib/api'
import { Send, Bot } from 'lucide-react'
import clsx from 'clsx'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const PROVIDERS: { id: AIProvider; name: string; model: string; tag: string }[] = [
  { id: 'claude',  name: 'Claude',  model: 'claude-sonnet-4-20250514', tag: 'Anthropic · Recommended' },
  { id: 'gemini',  name: 'Gemini',  model: 'gemini-1.5-pro',           tag: 'Google' },
  { id: 'openai',  name: 'GPT-4o',  model: 'gpt-4o-2024-08-06',        tag: 'OpenAI' },
]

const QUICK_PROMPTS = [
  { label: '🔍 Anomaly scan',     text: 'Identify any consumption anomalies in my portfolio this month.' },
  { label: '⚡ Capacity audit',   text: 'Which connections are overpaying for capacity they are not using?' },
  { label: '📋 Exec summary',     text: 'Generate an executive summary of my energy portfolio for the board.' },
  { label: '🧾 Invoice check',    text: 'Check my DEWA invoices for billing errors or peak demand charges I can reduce.' },
  { label: '🌱 ESG report',       text: 'What ESG metrics should I report for UAE Net Zero 2050 compliance?' },
]

const FLEET_CONTEXT = `
Fleet: 15 energy connections across 7 UAE sites.
Active: 12 | Pending: 3
Sites: Dubai Business Bay (3x250A elec), DIFC Tower (3x400A elec), Masdar City Hub (3x630A elec + G100 gas), Sharjah Industrial (pending), RAK Free Zone (2x250A), Abu Dhabi Al Reem (2x160A).
Consumption MTD: 847,320 kWh electricity, 12,840 m³ gas.
Total spend MTD: AED 284,190 | Annual budget: AED 360,000 (73% utilized).
Invoice anomaly: CONN-002 (DIFC Tower) billed AED 38,720 vs expected AED 31,200 (+24.1%).
Meter upgrades due: CONN-005 (Sharjah), CONN-006 (RAK) — traditional meters, FEWA Q2 2026 mandate.
Tariff: DEWA 2024 commercial slab. Market: UAE.
`

export default function AIAuditor() {
  const { aiProvider, setAIProvider, market } = useAppStore()
  const [localMarket, setLocalMarket] = useState<Market>(market)
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: '**EnergyOS Auditor ready.**\n\nI have full context on your 15 connections across 7 UAE sites, 12 months of consumption records, and your DEWA tariff structure.\n\nI can help with: anomaly detection, invoice verification, capacity optimization, contract analysis, ESG reporting, and UAE Net Zero 2050 compliance.'
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showQuick, setShowQuick] = useState(true)
  const msgsRef = useRef<HTMLDivElement>(null)

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
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
      const data = await aiApi.chat(history, aiProvider, localMarket, FLEET_CONTEXT)
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Could not reach the AI backend. Please ensure the backend server is running and your API key is configured in Settings → API Keys.'
      }])
    } finally {
      setLoading(false)
    }
  }

  const renderContent = (text: string) =>
    text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="AI Auditor" subtitle="Pluggable AI energy intelligence" />
      <div className="flex flex-1 overflow-hidden p-4 gap-4">

        {/* Left sidebar */}
        <aside className="w-60 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
          <div className="card flex flex-col gap-2 p-4">
            <div className="label mb-1">AI Provider</div>
            {PROVIDERS.map(p => (
              <div
                key={p.id}
                onClick={() => setAIProvider(p.id)}
                className={clsx(
                  'border rounded-lg p-3 cursor-pointer transition-all',
                  aiProvider === p.id
                    ? 'border-accent bg-accent/10'
                    : 'border-border-subtle hover:border-border-default'
                )}
              >
                <div className="text-sm font-semibold text-white">{p.name}</div>
                <div className="font-mono text-[10px] text-white/30 mt-0.5">{p.model}</div>
                <div className={clsx('text-[10px] mt-1.5 px-1.5 py-0.5 rounded-full inline-block',
                  aiProvider === p.id ? 'bg-accent/20 text-accent-hover' : 'bg-bg-hover text-white/30'
                )}>{p.tag}</div>
              </div>
            ))}
          </div>

          <div className="card p-4">
            <div className="label mb-2">Market Context</div>
            <select className="form-select text-xs" value={localMarket} onChange={e => setLocalMarket(e.target.value as Market)}>
              {Object.entries(MARKET_CONFIGS).map(([k, v]) => (
                <option key={k} value={k}>{v.flag} {v.label} · {v.tariffAuthority.split('/')[0].trim()}</option>
              ))}
            </select>
          </div>

          <div className="card p-4">
            <div className="label mb-3">Context Included</div>
            {['Fleet data','Consumption records','Budget data','Tariff tables','Invoice anomalies'].map(item => (
              <div key={item} className="flex items-center justify-between py-1.5 border-b border-border-subtle last:border-0">
                <span className="text-xs text-white/50">{item}</span>
                <div className="w-7 h-4 bg-accent rounded-full relative">
                  <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Chat */}
        <div className="flex-1 flex flex-col card p-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border-subtle">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <div>
              <div className="text-sm font-semibold text-white">AI Energy Auditor</div>
              <div className="text-xs text-white/30">
                {PROVIDERS.find(p => p.id === aiProvider)?.name} · {MARKET_CONFIGS[localMarket].flag} {localMarket} market context
              </div>
            </div>
          </div>

          {/* Messages */}
          <div ref={msgsRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={clsx('flex gap-2.5 max-w-[90%]', m.role === 'user' && 'ml-auto flex-row-reverse')}>
                <div className={clsx(
                  'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-1',
                  m.role === 'assistant' ? 'bg-gradient-to-br from-accent to-purple text-white' : 'bg-bg-hover text-white/50'
                )}>
                  {m.role === 'assistant' ? <Bot size={13} /> : 'AH'}
                </div>
                <div className={clsx(
                  'rounded-xl px-4 py-3 text-sm leading-relaxed border',
                  m.role === 'assistant'
                    ? 'bg-bg-hover border-border-subtle text-white/80'
                    : 'bg-accent/15 border-accent/30 text-accent-hover'
                )}
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

          {/* Quick prompts */}
          {showQuick && (
            <div className="flex flex-wrap gap-2 px-4 pb-2">
              {QUICK_PROMPTS.map(q => (
                <button
                  key={q.label}
                  onClick={() => sendMessage(q.text)}
                  className="text-xs bg-bg-hover border border-border-subtle text-white/50 hover:border-accent hover:text-accent-hover px-3 py-1.5 rounded-full transition-all"
                >
                  {q.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex gap-3 p-4 border-t border-border-subtle">
            <textarea
              className="flex-1 form-input resize-none min-h-10 max-h-28 py-2.5"
              placeholder="Ask anything about your energy portfolio..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
              rows={1}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed self-end"
            >
              <Send size={14} /> Send
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
