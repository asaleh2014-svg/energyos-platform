import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Download, Printer, Play, Plus, Search, RefreshCw, FileText, Globe, Bot } from 'lucide-react'
import clsx from 'clsx'

type ReportTab = 'system' | 'custom' | 'templates'

interface Report {
  id: string
  name: string
  description: string
  audience: 'Global' | 'Client'
  category: string
  lastRun: string
  format: 'PDF' | 'XLS' | 'Both'
}

const SYSTEM_REPORTS: Report[] = [
  {
    id: 'r1', name: 'Portfolio KPI Summary', audience: 'Global',
    description: 'Standardized KPIs compiled and aggregated annually across all sites — consumption, spend, CO₂ intensity, data quality.',
    category: 'Client Summary', lastRun: 'Today 06:00', format: 'Both',
  },
  {
    id: 'r2', name: 'Invoice Data Reports — 13 Period', audience: 'Global',
    description: 'Complete invoice and billing data across 13 accounting periods with variance analysis.',
    category: 'Client Summary', lastRun: '2 days ago', format: 'XLS',
  },
  {
    id: 'r3', name: 'Site Analytics', audience: 'Global',
    description: 'Per-site breakdown of energy consumption, cost, and emissions with ranking and benchmarking.',
    category: 'Client Summary', lastRun: 'Yesterday', format: 'Both',
  },
  {
    id: 'r4', name: 'Country Analytics', audience: 'Global',
    description: 'Site & Supply Count, Expenditure, Expenditure Ranking, Consumption, CO₂ Ranking by country.',
    category: 'Client Summary', lastRun: '3 days ago', format: 'Both',
  },
  {
    id: 'r5', name: 'Two-Year Consumption Comparison', audience: 'Global',
    description: 'Side-by-side comparison of current vs prior year electricity and gas consumption by site.',
    category: 'Two-Year Comparison', lastRun: '1 week ago', format: 'Both',
  },
  {
    id: 'r6', name: 'Long-Term Trends (5 Year)', audience: 'Global',
    description: 'Multi-year consumption and cost trends showing normalised intensity metrics per m² and per occupant.',
    category: 'Long-Term Trends', lastRun: '2 weeks ago', format: 'PDF',
  },
  {
    id: 'r7', name: 'Efficiency Tools — Benchmarking', audience: 'Global',
    description: 'Efficiency Ranking, Intensity Ranking, Efficiency Benchmark across all properties.',
    category: 'Efficiency Tools', lastRun: '1 week ago', format: 'Both',
  },
  {
    id: 'r8', name: 'Performance Report', audience: 'Global',
    description: 'Consumption and cost performance vs budget and prior periods with deviation analysis.',
    category: 'Performance Tools', lastRun: '3 days ago', format: 'Both',
  },
  {
    id: 'r9', name: 'Budget vs Actuals', audience: 'Global',
    description: 'Contract variance monitoring — actual vs budgeted spend per meter, site, and country.',
    category: 'Budgeting & Reporting', lastRun: 'Today', format: 'XLS',
  },
  {
    id: 'r10', name: 'Contract Variance Monitoring', audience: 'Global',
    description: 'Detect billing deviations outside contracted tariff bands with supplier reference matching.',
    category: 'Contract Variance', lastRun: '4 days ago', format: 'Both',
  },
  {
    id: 'r11', name: 'Electricity Supply Demand Download', audience: 'Global',
    description: 'Maximum Demand, Capacity, Power Factor by month — filterable by site and supply.',
    category: 'Performance Tools', lastRun: '1 week ago', format: 'XLS',
  },
  {
    id: 'r12', name: 'Site Data Download', audience: 'Global',
    description: 'Every supply/utility itemized per site per month: data quality, total consumption, total cost, average unit price.',
    category: 'Client Summary', lastRun: '2 days ago', format: 'XLS',
  },
  {
    id: 'r13', name: 'Carbon Footprint (Annual)', audience: 'Global',
    description: 'Scope 1 & 2 emissions by source (Electricity, Gas, Oil, District Energy) vs baseline year.',
    category: 'Carbon Tracking', lastRun: 'Yesterday', format: 'PDF',
  },
  {
    id: 'r14', name: 'Supplies & Energy Types Report', audience: 'Global',
    description: 'Utility supply register with green energy certificate flags, metering PODs, and operator details.',
    category: 'Client Summary', lastRun: '1 week ago', format: 'XLS',
  },
  {
    id: 'r15', name: 'Site Load by Country', audience: 'Global',
    description: 'Aggregated load profiles grouped by country for grid planning and capacity tracking.',
    category: 'Performance Tools', lastRun: '2 weeks ago', format: 'Both',
  },
]

const CUSTOM_REPORTS: Report[] = [
  {
    id: 'c1', name: 'Masdar City Quarterly Review', audience: 'Client',
    description: 'Custom quarterly energy performance report for Masdar City campus — includes renewable offset analysis.',
    category: 'Custom', lastRun: 'Last quarter', format: 'PDF',
  },
  {
    id: 'c2', name: 'DIFC Portfolio ESG Report', audience: 'Client',
    description: 'ESG disclosure report for DIFC Authority covering Scope 1/2/3 emissions and green building targets.',
    category: 'Custom', lastRun: '2 months ago', format: 'PDF',
  },
  {
    id: 'c3', name: 'Comparative Site Selector — UAE North', audience: 'Client',
    description: 'Select sites by group/country/individually for customised comparison reporting.',
    category: 'Custom', lastRun: '3 weeks ago', format: 'Both',
  },
]

const TEMPLATES: Report[] = [
  {
    id: 't1', name: 'Monthly Executive Summary', audience: 'Global',
    description: 'AI-generated executive overview with KPI cards, anomaly highlights, and cost forecasts.',
    category: 'Template', lastRun: '—', format: 'PDF',
  },
  {
    id: 't2', name: 'Quarterly Board Pack', audience: 'Global',
    description: 'Branded board-ready pack with spend trend, carbon progress, and budget vs actuals.',
    category: 'Template', lastRun: '—', format: 'PDF',
  },
  {
    id: 't3', name: 'Annual Sustainability Report', audience: 'Global',
    description: 'GRI / TCFD aligned annual report template with emission source breakdown and target tracking.',
    category: 'Template', lastRun: '—', format: 'PDF',
  },
]

const CATEGORIES = [
  'All Categories', 'Client Summary', 'Two-Year Comparison', 'Long-Term Trends',
  'Efficiency Tools', 'Performance Tools', 'Budgeting & Reporting', 'Contract Variance',
  'Carbon Tracking', 'Custom', 'Template',
]

export default function Reports() {
  const [tab,      setTab]      = useState<ReportTab>('system')
  const [category, setCategory] = useState('All Categories')
  const [search,   setSearch]   = useState('')
  const [running,  setRunning]  = useState<string | null>(null)

  const reports = tab === 'system' ? SYSTEM_REPORTS : tab === 'custom' ? CUSTOM_REPORTS : TEMPLATES

  const filtered = reports.filter(r => {
    if (category !== 'All Categories' && r.category !== category) return false
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) &&
        !r.description.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const runReport = (id: string) => {
    setRunning(id)
    setTimeout(() => setRunning(null), 2500)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Report Library" subtitle="Execute, download, and schedule standardised reports" />
      <div className="flex-1 overflow-y-auto p-6">

        {/* ── Tabs + actions ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-1 bg-bg-secondary border border-border-subtle rounded-xl p-1">
            {([
              { id: 'system',    label: 'System Reports', icon: Globe },
              { id: 'custom',    label: 'My Reports',     icon: FileText },
              { id: 'templates', label: 'Templates',      icon: Bot },
            ] as { id: ReportTab; label: string; icon: typeof Globe }[]).map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  tab === id ? 'bg-accent text-white shadow' : 'text-white/40 hover:text-white/70')}>
                <Icon size={13} />{label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary flex items-center gap-2 text-xs"><Plus size={13} /> Create Report</button>
            <button className="btn-secondary flex items-center gap-2 text-xs"><RefreshCw size={13} /> Refresh</button>
          </div>
        </div>

        {/* ── Filter bar ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-xs">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search reports…"
              className="w-full bg-bg-card border border-border-subtle rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-accent" />
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)} className="form-select text-xs">
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <span className="text-xs text-white/30">{filtered.length} report{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* ── Report table ──────────────────────────────────────────────── */}
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle">
                {['Report Name', 'Category', 'Audience', 'Description', 'Last Run', 'Format', 'Actions'].map(h => (
                  <th key={h} className="tbl-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="tbl-row">
                  <td className="tbl-td">
                    <div className="flex items-center gap-2">
                      <FileText size={13} className="text-accent/60 flex-shrink-0" />
                      <span className="text-white font-medium text-sm">{r.name}</span>
                    </div>
                  </td>
                  <td className="tbl-td">
                    <span className="text-xs bg-bg-secondary border border-border-subtle px-2 py-0.5 rounded-full text-white/50">
                      {r.category}
                    </span>
                  </td>
                  <td className="tbl-td">
                    <span className={r.audience === 'Global' ? 'status-active' : 'status-pending'}>
                      {r.audience === 'Global' ? '🌐 Global' : '🏢 Client'}
                    </span>
                  </td>
                  <td className="tbl-td text-white/50 text-xs max-w-xs">
                    <span className="line-clamp-2">{r.description}</span>
                  </td>
                  <td className="tbl-td text-white/35 text-xs whitespace-nowrap">{r.lastRun}</td>
                  <td className="tbl-td">
                    <span className="text-xs text-white/50 font-mono">{r.format}</span>
                  </td>
                  <td className="tbl-td">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => runReport(r.id)}
                        className={clsx(
                          'btn-sm flex items-center gap-1',
                          running === r.id ? 'opacity-50 cursor-wait' : ''
                        )}>
                        {running === r.id
                          ? <><RefreshCw size={10} className="animate-spin" /> Running…</>
                          : <><Play size={10} /> Execute</>}
                      </button>
                      <button className="btn-sm"><Printer size={10} /></button>
                      <button className="btn-sm"><Download size={10} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="tbl-td text-center text-white/30 py-8">
                    No reports match your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── AI Executive Summary (kept from old Reports) ────────────────── */}
        <div className="mt-5 p-4 rounded-xl border border-accent/20 bg-accent/5 flex items-start gap-3">
          <Bot size={16} className="text-accent mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-white mb-1">AI Executive Summary — auto-generated weekly</div>
            <p className="text-xs text-white/50 leading-relaxed">
              The AI Auditor generates a plain-language executive summary every Monday at 06:00 covering anomaly detection,
              contract efficiency, budget forecasts, and ESG compliance. Navigate to <strong className="text-accent-hover">Intelligence → AI Auditor</strong> to view or run on demand.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
