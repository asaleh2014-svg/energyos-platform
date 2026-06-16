import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { MOCK_INVOICES } from '@/lib/mockData'
import { useAppStore } from '@/lib/store'
import { MARKET_CONFIGS } from '@/types'
import { Upload, Bot, Download, Filter, Search, CheckSquare, AlertTriangle, Clock, ChevronDown } from 'lucide-react'
import clsx from 'clsx'

const AI_STATUS_STYLE: Record<string, string> = {
  verified: 'status-active',
  anomaly:  'status-inactive',
  review:   'status-pending',
  pending:  'status-pending',
}

const AI_STATUS_LABEL: Record<string, string> = {
  verified: '✓ Verified',
  anomaly:  '⚠ Anomaly',
  review:   '⏳ Review',
  pending:  '⏳ Pending',
}

// Extended AP-style invoice data (NUS payment schedule concept)
const INVOICES_EXTENDED = MOCK_INVOICES.map((inv, i) => ({
  ...inv,
  nus_ref:        `NUS-${(2400 + i).toString()}`,
  doc_type:       i % 3 === 0 ? 'Credit Note' : 'Invoice',
  received_date:  `${10 + i} May 2026`,
  supply_address: inv.site_name + ', Dubai, UAE',
  utility:        i % 4 === 0 ? 'Gas' : 'Electricity',
  supplier:       i % 2 === 0 ? 'DEWA' : i % 3 === 0 ? 'SEWA' : 'ADWEA',
  tax_date:       `${15 + i} May 2026`,
  payment_due:    `${25 + i} Jun 2026`,
  cust_acct:      `CUST-${10000 + i * 7}`,
  group_acct:     `GRP-${5000 + i * 3}`,
  invoice_no:     `INV-${20000 + i * 11}`,
  amount_ex_vat:  Math.round(inv.amount / 1.05),
  vat:            Math.round(inv.amount - inv.amount / 1.05),
  amount_total:   inv.amount,
}))

type PageTab = 'list' | 'schedule' | 'upload'

export default function Invoices() {
  const { market } = useAppStore()
  const cfg = MARKET_CONFIGS[market]
  const [tab,         setTab]         = useState<PageTab>('list')
  const [search,      setSearch]      = useState('')
  const [utilFilter,  setUtilFilter]  = useState('All')
  const [statusFilter,setStatusFilter]= useState('All')
  const [selected,    setSelected]    = useState<Set<string>>(new Set())
  const [uploadStep,  setUploadStep]  = useState(0)

  const anomalyCount = MOCK_INVOICES.filter(i => i.ai_status === 'anomaly').length
  const totalDue     = INVOICES_EXTENDED.reduce((a, i) => a + i.amount_total, 0)
  const totalVat     = INVOICES_EXTENDED.reduce((a, i) => a + i.vat, 0)

  const filtered = INVOICES_EXTENDED.filter(i => {
    if (utilFilter  !== 'All' && i.utility   !== utilFilter)   return false
    if (statusFilter !== 'All' && i.ai_status !== statusFilter) return false
    if (search && !i.site_name.toLowerCase().includes(search.toLowerCase()) &&
        !i.invoice_no.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(i => i.id)))
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Invoice Manager" subtitle="AP payment schedule · invoice ingestion & validation" />
      <div className="flex-1 overflow-y-auto p-6">

        {/* ── KPI banner ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4 mb-5">
          <div className="card">
            <div className="label mb-1">Total Invoices</div>
            <div className="text-2xl font-semibold text-white">{MOCK_INVOICES.length}</div>
            <div className="text-xs text-white/40 mt-1">this period</div>
          </div>
          <div className="card">
            <div className="label mb-1 flex items-center gap-1"><AlertTriangle size={11} className="text-danger-light"/> Anomalies</div>
            <div className="text-2xl font-semibold text-danger-light">{anomalyCount}</div>
            <div className="text-xs text-white/40 mt-1">require attention</div>
          </div>
          <div className="card">
            <div className="label mb-1">Total Amount Due</div>
            <div className="text-2xl font-semibold text-white">{cfg.currencySymbol} {(totalDue / 1000).toFixed(0)}K</div>
            <div className="text-xs text-white/40 mt-1">incl. VAT {cfg.currencySymbol} {(totalVat / 1000).toFixed(0)}K</div>
          </div>
          <div className="card">
            <div className="label mb-1 flex items-center gap-1"><Clock size={11} className="text-warning-light"/> Pending Review</div>
            <div className="text-2xl font-semibold text-warning-light">
              {MOCK_INVOICES.filter(i => i.ai_status === 'review' || i.ai_status === 'pending').length}
            </div>
            <div className="text-xs text-white/40 mt-1">awaiting validation</div>
          </div>
        </div>

        {anomalyCount > 0 && (
          <div className="p-3 bg-danger-muted border border-danger/30 rounded-xl text-xs text-danger-light mb-5 flex items-center gap-2">
            🚨 {anomalyCount} invoice anomaly detected — AI flagged significant billing variance. Review before payment.
          </div>
        )}

        {/* ── Tab navigation ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-1 bg-bg-secondary border border-border-subtle rounded-xl p-1">
            {([
              { id: 'list',     label: 'Invoice List'      },
              { id: 'schedule', label: 'Payment Schedule'  },
              { id: 'upload',   label: 'Upload Invoice'    },
            ] as { id: PageTab; label: string }[]).map(({ id, label }) => (
              <button key={id} onClick={() => setTab(id)}
                className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  tab === id ? 'bg-accent text-white shadow' : 'text-white/40 hover:text-white/70')}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary flex items-center gap-2 text-xs"><Bot size={13}/> Run AI Check</button>
            <button className="btn-primary flex items-center gap-2 text-xs"><Download size={13}/> Export {cfg.currencySymbol} Schedule</button>
          </div>
        </div>

        {/* ── Invoice List tab ───────────────────────────────────────────── */}
        {tab === 'list' && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search invoices…"
                  className="bg-bg-card border border-border-subtle rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-accent w-52" />
              </div>
              <select value={utilFilter} onChange={e => setUtilFilter(e.target.value)} className="form-select text-xs">
                <option value="All">All Utilities</option>
                <option value="Electricity">Electricity</option>
                <option value="Gas">Gas</option>
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-select text-xs">
                <option value="All">All Statuses</option>
                <option value="verified">Verified</option>
                <option value="anomaly">Anomaly</option>
                <option value="review">Review</option>
                <option value="pending">Pending</option>
              </select>
              {selected.size > 0 && (
                <span className="text-xs text-accent-hover">{selected.size} selected</span>
              )}
              <span className="text-xs text-white/30 ml-auto">{filtered.length} invoices</span>
            </div>

            <div className="card p-0 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="tbl-th w-8">
                      <button onClick={toggleAll} className="text-white/30 hover:text-white/60">
                        <CheckSquare size={13} />
                      </button>
                    </th>
                    {['Invoice #', 'NUS Ref', 'Site / Connection', 'Utility', 'Supplier', 'Period', 'Amount (ex. VAT)', 'VAT', 'Total', 'Payment Due', 'AI Status', 'Action'].map(h => (
                      <th key={h} className="tbl-th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(inv => {
                    const varColor = inv.variance_pct > 15
                      ? 'text-danger-light' : inv.variance_pct > 5 ? 'text-warning-light'
                      : inv.variance_pct < 0 ? 'text-success-light' : 'text-white/50'
                    return (
                      <tr key={inv.id} className={clsx('tbl-row', selected.has(inv.id) && 'bg-accent/5')}>
                        <td className="tbl-td">
                          <button onClick={() => {
                            const s = new Set(selected)
                            s.has(inv.id) ? s.delete(inv.id) : s.add(inv.id)
                            setSelected(s)
                          }} className="text-white/30 hover:text-white/60">
                            <CheckSquare size={13} className={selected.has(inv.id) ? 'text-accent' : ''} />
                          </button>
                        </td>
                        <td className="tbl-td font-mono text-xs text-white/60">{inv.invoice_no}</td>
                        <td className="tbl-td font-mono text-xs text-white/40">{inv.nus_ref}</td>
                        <td className="tbl-td text-white font-medium">{inv.site_name}</td>
                        <td className="tbl-td"><span className={inv.utility === 'Electricity' ? 'type-elec' : 'type-gas'}>{inv.utility === 'Electricity' ? '⚡' : '🔥'} {inv.utility}</span></td>
                        <td className="tbl-td text-white/50 text-xs">{inv.supplier}</td>
                        <td className="tbl-td text-white/50">{inv.period}</td>
                        <td className="tbl-td text-white font-medium">{cfg.currencySymbol} {inv.amount_ex_vat.toLocaleString()}</td>
                        <td className="tbl-td text-white/50">{cfg.currencySymbol} {inv.vat.toLocaleString()}</td>
                        <td className="tbl-td text-white font-semibold">{cfg.currencySymbol} {inv.amount_total.toLocaleString()}</td>
                        <td className="tbl-td text-xs text-white/40">{inv.payment_due}</td>
                        <td className="tbl-td">
                          <span className={AI_STATUS_STYLE[inv.ai_status]}>{AI_STATUS_LABEL[inv.ai_status]}</span>
                        </td>
                        <td className="tbl-td">
                          {inv.ai_status === 'anomaly'
                            ? <button className="btn-sm" style={{ borderColor: '#ef4444', color: '#f87171' }}>Dispute</button>
                            : <button className="btn-sm">View</button>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border-default bg-bg-card">
                    <td className="tbl-td" colSpan={7}><span className="text-white/40 text-xs font-semibold">Running Total ({filtered.length} invoices)</span></td>
                    <td className="tbl-td text-white font-semibold">{cfg.currencySymbol} {filtered.reduce((a, i) => a + i.amount_ex_vat, 0).toLocaleString()}</td>
                    <td className="tbl-td text-white/60">{cfg.currencySymbol} {filtered.reduce((a, i) => a + i.vat, 0).toLocaleString()}</td>
                    <td className="tbl-td text-white font-bold text-base">{cfg.currencySymbol} {filtered.reduce((a, i) => a + i.amount_total, 0).toLocaleString()}</td>
                    <td className="tbl-td" colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}

        {/* ── Payment Schedule tab ──────────────────────────────────────── */}
        {tab === 'schedule' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="section-title">Invoice Payment Schedule</h2>
                <p className="text-xs text-white/30 mt-0.5">AP export — per-invoice line items with tax dates and account codes</p>
              </div>
              <button className="btn-primary flex items-center gap-2 text-xs">
                <Download size={13}/> Download as Spreadsheet
              </button>
            </div>

            {/* Branded header (NUS concept) */}
            <div className="card flex items-center gap-4 bg-gradient-to-r from-accent/10 to-purple/10 border-accent/20">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-purple flex items-center justify-center text-white font-bold">E</div>
              <div>
                <div className="text-sm font-semibold text-white">EnergyOS Portfolio Intelligence</div>
                <div className="text-xs text-white/40">Masdar City Group · Payment Schedule Export · {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</div>
              </div>
            </div>

            <div className="card p-0 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border-subtle bg-bg-secondary">
                    {['NUS Ref', 'Doc Type', 'Invoice ID', 'Date Received', 'Supply Address', 'Status', 'Utility', 'Supplier', 'Tax Date', 'Payment Due', 'Cust. Acct', 'Group Acct', 'Invoice No.', 'Excl. VAT', 'VAT', 'Total'].map(h => (
                      <th key={h} className="tbl-th whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {INVOICES_EXTENDED.map(inv => (
                    <tr key={inv.id} className="tbl-row">
                      <td className="tbl-td font-mono text-white/50">{inv.nus_ref}</td>
                      <td className="tbl-td"><span className={inv.doc_type === 'Credit Note' ? 'status-pending' : 'status-active'}>{inv.doc_type}</span></td>
                      <td className="tbl-td font-mono text-white/60">{inv.invoice_no}</td>
                      <td className="tbl-td text-white/40">{inv.received_date}</td>
                      <td className="tbl-td text-white/60 max-w-[120px] truncate">{inv.supply_address}</td>
                      <td className="tbl-td"><span className={AI_STATUS_STYLE[inv.ai_status]}>{AI_STATUS_LABEL[inv.ai_status]}</span></td>
                      <td className="tbl-td text-white/60">{inv.utility}</td>
                      <td className="tbl-td text-white/60">{inv.supplier}</td>
                      <td className="tbl-td text-white/40">{inv.tax_date}</td>
                      <td className="tbl-td text-white/40">{inv.payment_due}</td>
                      <td className="tbl-td font-mono text-white/40">{inv.cust_acct}</td>
                      <td className="tbl-td font-mono text-white/40">{inv.group_acct}</td>
                      <td className="tbl-td font-mono text-white/60">{inv.invoice_no}</td>
                      <td className="tbl-td text-right font-mono text-white">{cfg.currencySymbol} {inv.amount_ex_vat.toLocaleString()}</td>
                      <td className="tbl-td text-right font-mono text-white/50">{cfg.currencySymbol} {inv.vat.toLocaleString()}</td>
                      <td className="tbl-td text-right font-mono font-semibold text-white">{cfg.currencySymbol} {inv.amount_total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border-default bg-bg-card">
                    <td className="tbl-td font-bold text-white" colSpan={13}>TOTAL</td>
                    <td className="tbl-td text-right font-bold text-white">{cfg.currencySymbol} {INVOICES_EXTENDED.reduce((a,i)=>a+i.amount_ex_vat,0).toLocaleString()}</td>
                    <td className="tbl-td text-right font-bold text-white/60">{cfg.currencySymbol} {INVOICES_EXTENDED.reduce((a,i)=>a+i.vat,0).toLocaleString()}</td>
                    <td className="tbl-td text-right font-bold text-white">{cfg.currencySymbol} {INVOICES_EXTENDED.reduce((a,i)=>a+i.amount_total,0).toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ── Upload tab ────────────────────────────────────────────────── */}
        {tab === 'upload' && (
          <div className="max-w-2xl mx-auto">
            <div className="card">
              <h2 className="section-title mb-1">Upload Utility Invoice</h2>
              <p className="text-xs text-white/40 mb-6">Supported formats: PDF, XLS, XLSX, CSV — max 25MB per file</p>

              {uploadStep === 0 && (
                <div
                  className="border-2 border-dashed border-border-subtle rounded-xl p-12 text-center hover:border-accent/40 transition-colors cursor-pointer"
                  onClick={() => setUploadStep(1)}>
                  <Upload size={32} className="text-white/20 mx-auto mb-4" />
                  <p className="text-white/60 text-sm mb-1">Drag & drop invoice files here</p>
                  <p className="text-white/30 text-xs">or click to browse</p>
                </div>
              )}

              {uploadStep >= 1 && (
                <div className="space-y-4">
                  {[
                    { step: 1, label: 'File received',          done: uploadStep >= 1, current: uploadStep === 1 },
                    { step: 2, label: 'AI extraction running',  done: uploadStep >= 2, current: uploadStep === 2 },
                    { step: 3, label: 'Validation complete',    done: uploadStep >= 3, current: uploadStep === 3 },
                    { step: 4, label: 'Ready for review',       done: uploadStep >= 4, current: uploadStep === 4 },
                  ].map(({ step, label, done, current }) => (
                    <div key={step} className={clsx(
                      'flex items-center gap-3 p-3 rounded-xl border transition-all',
                      done ? 'bg-success/5 border-success/20' : current ? 'bg-accent/5 border-accent/20' : 'border-border-subtle'
                    )}>
                      <div className={clsx(
                        'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                        done ? 'bg-success/20 text-success-light' : 'bg-bg-secondary text-white/30'
                      )}>
                        {done ? '✓' : step}
                      </div>
                      <span className={clsx('text-sm', done ? 'text-success-light' : 'text-white/40')}>{label}</span>
                    </div>
                  ))}

                  {uploadStep < 4 && (
                    <button onClick={() => setUploadStep(s => Math.min(s + 1, 4))}
                      className="btn-primary w-full flex items-center justify-center gap-2">
                      <ChevronDown size={14} /> Next Step (simulate)
                    </button>
                  )}
                  {uploadStep === 4 && (
                    <div className="p-4 bg-success/10 border border-success/30 rounded-xl text-sm text-success-light text-center">
                      ✓ Invoice processed and added to the payment schedule
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
