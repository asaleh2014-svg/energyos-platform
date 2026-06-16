import { useState, useEffect, useRef } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useAppStore } from '@/lib/store'
import { MARKET_CONFIGS } from '@/types'
import { supabase, type InvoiceRow } from '@/lib/supabase'
import { Upload, Bot, Download, Search, CheckSquare, AlertTriangle, Clock, FileText, RefreshCw, X, ExternalLink, Eye } from 'lucide-react'
import clsx from 'clsx'

type PageTab = 'list' | 'schedule' | 'upload'

const STATUS_STYLE: Record<string, string> = {
  Approved: 'status-active',
  Anomaly:  'status-inactive',
  Pending:  'status-pending',
  Paid:     'status-active',
}

type UploadStep = 'idle' | 'uploading' | 'saving' | 'done' | 'error'

export default function Invoices() {
  const { market } = useAppStore()
  const cfg = MARKET_CONFIGS[market]

  const [tab,          setTab]          = useState<PageTab>('list')
  const [invoices,     setInvoices]     = useState<InvoiceRow[]>([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selected,     setSelected]     = useState<Set<string>>(new Set())
  const [viewing,      setViewing]      = useState<InvoiceRow | null>(null)

  // Upload form state
  const fileRef                         = useRef<HTMLInputElement>(null)
  const [uploadStep,   setUploadStep]   = useState<UploadStep>('idle')
  const [uploadErr,    setUploadErr]    = useState('')
  const [dragOver,     setDragOver]     = useState(false)
  const [form, setForm] = useState({
    supplier:        '',
    doc_type:        'Invoice',
    tax_date:        '',
    payment_due:     '',
    customer_account:'',
    amount_ex_vat:   '',
    vat_amount:      '',
    notes:           '',
  })
  const [pickedFile, setPickedFile] = useState<File | null>(null)

  // ── Fetch invoices ──────────────────────────────────────────────────────
  const fetchInvoices = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setInvoices(data as InvoiceRow[])
    setLoading(false)
  }

  useEffect(() => { fetchInvoices() }, [])

  // ── Derived stats ───────────────────────────────────────────────────────
  const anomalyCount  = invoices.filter(i => i.status === 'Anomaly').length
  const pendingCount  = invoices.filter(i => i.status === 'Pending').length
  const totalDue      = invoices.reduce((a, i) => a + (i.amount_inc_vat ?? 0), 0)
  const totalVat      = invoices.reduce((a, i) => a + (i.vat_amount ?? 0), 0)

  const filtered = invoices.filter(i => {
    if (statusFilter !== 'All' && i.status !== statusFilter) return false
    if (search && !i.supplier?.toLowerCase().includes(search.toLowerCase()) &&
        !i.nus_ref?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(i => i.id)))
  }

  // ── Upload handler ──────────────────────────────────────────────────────
  const [extracting, setExtracting] = useState(false)

  const handleFileDrop = async (file: File) => {
    setPickedFile(file)
    setUploadStep('idle')
    setUploadErr('')

    // Auto-extract invoice data with Gemini
    if (file.type === 'application/pdf') {
      setExtracting(true)
      try {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/invoices/extract', { method: 'POST', body: fd })
        const json = await res.json()
        if (json.success && json.data) {
          const d = json.data
          setForm(f => ({
            ...f,
            supplier:         d.supplier         ?? f.supplier,
            doc_type:         d.doc_type          ?? f.doc_type,
            tax_date:         d.tax_date          ?? f.tax_date,
            payment_due:      d.payment_due       ?? f.payment_due,
            customer_account: d.customer_account  ?? f.customer_account,
            amount_ex_vat:    d.amount_ex_vat != null ? String(d.amount_ex_vat) : f.amount_ex_vat,
            vat_amount:       d.vat_amount    != null ? String(d.vat_amount)    : f.vat_amount,
            notes:            d.site_address  ?? d.notes ?? f.notes,
          }))
        }
      } catch (e) {
        // silently ignore — user can fill manually
      } finally {
        setExtracting(false)
      }
    }
  }

  const submitInvoice = async () => {
    if (!pickedFile) { setUploadErr('Please select a file'); return }
    setUploadStep('uploading')
    setUploadErr('')

    // 1. Upload file to Supabase Storage
    const ext      = pickedFile.name.split('.').pop()
    const filePath = `invoices/${Date.now()}-${pickedFile.name}`
    const { error: storageErr } = await supabase.storage
      .from('invoice-files')
      .upload(filePath, pickedFile, { upsert: false })

    if (storageErr) {
      setUploadErr(`Storage error: ${storageErr.message}`)
      setUploadStep('error')
      return
    }

    // 2. Save invoice record to database
    setUploadStep('saving')
    const exVat = parseFloat(form.amount_ex_vat) || 0
    const vat   = parseFloat(form.vat_amount)    || 0
    const { error: dbErr } = await supabase.from('invoices').insert({
      nus_ref:          `NUS-${Date.now().toString().slice(-5)}`,
      supplier:         form.supplier || null,
      doc_type:         form.doc_type,
      tax_date:         form.tax_date   || null,
      payment_due:      form.payment_due || null,
      customer_account: form.customer_account || null,
      amount_ex_vat:    exVat || null,
      vat_amount:       vat   || null,
      amount_inc_vat:   exVat + vat || null,
      status:           'Pending',
      file_path:        filePath,
      file_name:        pickedFile.name,
      notes:            form.notes || null,
    })

    if (dbErr) {
      setUploadErr(`Database error: ${dbErr.message}`)
      setUploadStep('error')
      return
    }

    setUploadStep('done')
    fetchInvoices()
    // Reset form after 3 seconds
    setTimeout(() => {
      setPickedFile(null)
      setUploadStep('idle')
      setForm({ supplier:'', doc_type:'Invoice', tax_date:'', payment_due:'',
                customer_account:'', amount_ex_vat:'', vat_amount:'', notes:'' })
      setTab('list')
    }, 3000)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Invoice Manager" subtitle="AP payment schedule · invoice ingestion & validation" />
      <div className="flex-1 overflow-y-auto p-6">

        {/* ── KPI banner ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4 mb-5">
          <div className="card">
            <div className="label mb-1">Total Invoices</div>
            <div className="text-2xl font-semibold text-white">{invoices.length}</div>
            <div className="text-xs text-white/40 mt-1">in database</div>
          </div>
          <div className="card">
            <div className="label mb-1 flex items-center gap-1"><AlertTriangle size={11} className="text-danger-light"/> Anomalies</div>
            <div className="text-2xl font-semibold text-danger-light">{anomalyCount}</div>
            <div className="text-xs text-white/40 mt-1">require attention</div>
          </div>
          <div className="card">
            <div className="label mb-1">Total Amount Due</div>
            <div className="text-2xl font-semibold text-white">
              {cfg.currencySymbol} {totalDue > 0 ? (totalDue / 1000).toFixed(0) + 'K' : '—'}
            </div>
            <div className="text-xs text-white/40 mt-1">
              {totalVat > 0 ? `incl. VAT ${cfg.currencySymbol} ${(totalVat/1000).toFixed(0)}K` : 'no invoices yet'}
            </div>
          </div>
          <div className="card">
            <div className="label mb-1 flex items-center gap-1"><Clock size={11} className="text-warning-light"/> Pending Review</div>
            <div className="text-2xl font-semibold text-warning-light">{pendingCount}</div>
            <div className="text-xs text-white/40 mt-1">awaiting validation</div>
          </div>
        </div>

        {anomalyCount > 0 && (
          <div className="p-3 bg-danger-muted border border-danger/30 rounded-xl text-xs text-danger-light mb-5 flex items-center gap-2">
            🚨 {anomalyCount} invoice anomaly detected — review before payment.
          </div>
        )}

        {/* ── Tab navigation ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-1 bg-bg-secondary border border-border-subtle rounded-xl p-1">
            {([
              { id: 'list',     label: 'Invoice List'     },
              { id: 'schedule', label: 'Payment Schedule' },
              { id: 'upload',   label: '+ Upload Invoice' },
            ] as { id: PageTab; label: string }[]).map(({ id, label }) => (
              <button key={id} onClick={() => setTab(id)}
                className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  tab === id ? 'bg-accent text-white shadow' : 'text-white/40 hover:text-white/70')}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchInvoices} className="btn-secondary flex items-center gap-2 text-xs">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button className="btn-secondary flex items-center gap-2 text-xs"><Bot size={13}/> AI Check</button>
            <button className="btn-primary flex items-center gap-2 text-xs"><Download size={13}/> Export</button>
          </div>
        </div>

        {/* ── Invoice List ───────────────────────────────────────────────── */}
        {tab === 'list' && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search supplier, ref…"
                  className="bg-bg-card border border-border-subtle rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-accent w-52" />
              </div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-select text-xs">
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Paid">Paid</option>
                <option value="Anomaly">Anomaly</option>
              </select>
              {selected.size > 0 && <span className="text-xs text-accent-hover">{selected.size} selected</span>}
              <span className="text-xs text-white/30 ml-auto">{filtered.length} invoices</span>
            </div>

            {loading ? (
              <div className="card flex items-center justify-center py-16 text-white/30 text-sm gap-3">
                <RefreshCw size={16} className="animate-spin" /> Loading invoices…
              </div>
            ) : filtered.length === 0 ? (
              <div className="card text-center py-16">
                <FileText size={32} className="text-white/10 mx-auto mb-3" />
                <p className="text-white/40 text-sm">No invoices yet</p>
                <p className="text-white/25 text-xs mt-1">Upload your first invoice using the tab above</p>
                <button onClick={() => setTab('upload')} className="btn-primary mt-4 text-xs">
                  Upload Invoice
                </button>
              </div>
            ) : (
              <div className="card p-0 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-subtle">
                      <th className="tbl-th w-8">
                        <button onClick={toggleAll} className="text-white/30 hover:text-white/60">
                          <CheckSquare size={13} />
                        </button>
                      </th>
                      {['NUS Ref', 'Supplier', 'Doc Type', 'Tax Date', 'Payment Due', 'Cust. Acct', 'Excl. VAT', 'VAT', 'Total', 'Status', 'File', 'Action'].map(h => (
                        <th key={h} className="tbl-th">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(inv => (
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
                        <td className="tbl-td font-mono text-xs text-white/50">{inv.nus_ref ?? '—'}</td>
                        <td className="tbl-td text-white font-medium">{inv.supplier ?? '—'}</td>
                        <td className="tbl-td text-white/50 text-xs">{inv.doc_type}</td>
                        <td className="tbl-td text-white/40 text-xs">{inv.tax_date ?? '—'}</td>
                        <td className="tbl-td text-white/40 text-xs">{inv.payment_due ?? '—'}</td>
                        <td className="tbl-td font-mono text-white/40 text-xs">{inv.customer_account ?? '—'}</td>
                        <td className="tbl-td text-white font-medium">
                          {inv.amount_ex_vat != null ? `${cfg.currencySymbol} ${inv.amount_ex_vat.toLocaleString()}` : '—'}
                        </td>
                        <td className="tbl-td text-white/50">
                          {inv.vat_amount != null ? `${cfg.currencySymbol} ${inv.vat_amount.toLocaleString()}` : '—'}
                        </td>
                        <td className="tbl-td text-white font-semibold">
                          {inv.amount_inc_vat != null ? `${cfg.currencySymbol} ${inv.amount_inc_vat.toLocaleString()}` : '—'}
                        </td>
                        <td className="tbl-td">
                          <span className={STATUS_STYLE[inv.status] ?? 'status-pending'}>{inv.status}</span>
                        </td>
                        <td className="tbl-td">
                          {inv.file_name
                            ? <span className="text-xs text-accent-hover flex items-center gap-1"><FileText size={11}/>{inv.file_name}</span>
                            : <span className="text-xs text-white/25">No file</span>}
                        </td>
                        <td className="tbl-td">
                          <button className="btn-sm flex items-center gap-1" onClick={() => setViewing(inv)}>
                            <Eye size={10}/> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border-default bg-bg-card">
                      <td className="tbl-td" colSpan={7}><span className="text-white/40 text-xs font-semibold">Total ({filtered.length})</span></td>
                      <td className="tbl-td text-white font-semibold">
                        {cfg.currencySymbol} {filtered.reduce((a, i) => a + (i.amount_ex_vat ?? 0), 0).toLocaleString()}
                      </td>
                      <td className="tbl-td text-white/60">
                        {cfg.currencySymbol} {filtered.reduce((a, i) => a + (i.vat_amount ?? 0), 0).toLocaleString()}
                      </td>
                      <td className="tbl-td text-white font-bold">
                        {cfg.currencySymbol} {filtered.reduce((a, i) => a + (i.amount_inc_vat ?? 0), 0).toLocaleString()}
                      </td>
                      <td className="tbl-td" colSpan={3}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── Payment Schedule ───────────────────────────────────────────── */}
        {tab === 'schedule' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="section-title">Invoice Payment Schedule</h2>
                <p className="text-xs text-white/30 mt-0.5">AP export — per-invoice line items with tax dates and account codes</p>
              </div>
              <button className="btn-primary flex items-center gap-2 text-xs">
                <Download size={13}/> Download Spreadsheet
              </button>
            </div>

            <div className="card flex items-center gap-4 bg-gradient-to-r from-accent/10 to-purple/10 border-accent/20">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-purple flex items-center justify-center text-white font-bold">E</div>
              <div>
                <div className="text-sm font-semibold text-white">EnergyOS Portfolio Intelligence</div>
                <div className="text-xs text-white/40">Payment Schedule Export · {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</div>
              </div>
            </div>

            {invoices.length === 0 ? (
              <div className="card text-center py-12 text-white/30 text-sm">No invoices to schedule yet</div>
            ) : (
              <div className="card p-0 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border-subtle bg-bg-secondary">
                      {['NUS Ref','Doc Type','Supplier','Tax Date','Payment Due','Cust. Acct','File','Excl. VAT','VAT','Total','Status'].map(h => (
                        <th key={h} className="tbl-th whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.id} className="tbl-row">
                        <td className="tbl-td font-mono text-white/50">{inv.nus_ref ?? '—'}</td>
                        <td className="tbl-td"><span className={inv.doc_type === 'Credit Note' ? 'status-pending' : 'status-active'}>{inv.doc_type}</span></td>
                        <td className="tbl-td text-white/60">{inv.supplier ?? '—'}</td>
                        <td className="tbl-td text-white/40">{inv.tax_date ?? '—'}</td>
                        <td className="tbl-td text-white/40">{inv.payment_due ?? '—'}</td>
                        <td className="tbl-td font-mono text-white/40">{inv.customer_account ?? '—'}</td>
                        <td className="tbl-td text-xs text-accent-hover">{inv.file_name ?? '—'}</td>
                        <td className="tbl-td text-right font-mono text-white">{inv.amount_ex_vat != null ? `${cfg.currencySymbol} ${inv.amount_ex_vat.toLocaleString()}` : '—'}</td>
                        <td className="tbl-td text-right font-mono text-white/50">{inv.vat_amount != null ? `${cfg.currencySymbol} ${inv.vat_amount.toLocaleString()}` : '—'}</td>
                        <td className="tbl-td text-right font-mono font-semibold text-white">{inv.amount_inc_vat != null ? `${cfg.currencySymbol} ${inv.amount_inc_vat.toLocaleString()}` : '—'}</td>
                        <td className="tbl-td"><span className={STATUS_STYLE[inv.status] ?? 'status-pending'}>{inv.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border-default bg-bg-card">
                      <td className="tbl-td font-bold text-white" colSpan={7}>TOTAL</td>
                      <td className="tbl-td text-right font-bold text-white">{cfg.currencySymbol} {invoices.reduce((a,i)=>a+(i.amount_ex_vat??0),0).toLocaleString()}</td>
                      <td className="tbl-td text-right font-bold text-white/60">{cfg.currencySymbol} {invoices.reduce((a,i)=>a+(i.vat_amount??0),0).toLocaleString()}</td>
                      <td className="tbl-td text-right font-bold text-white">{cfg.currencySymbol} {invoices.reduce((a,i)=>a+(i.amount_inc_vat??0),0).toLocaleString()}</td>
                      <td className="tbl-td"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Upload Invoice ─────────────────────────────────────────────── */}
        {tab === 'upload' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="card">
              <h2 className="section-title mb-1">Upload Utility Invoice</h2>
              <p className="text-xs text-white/40 mb-5">PDF, XLS, XLSX, CSV — max 25 MB</p>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileDrop(f) }}
                onClick={() => fileRef.current?.click()}
                className={clsx(
                  'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-5',
                  dragOver ? 'border-accent bg-accent/5' : pickedFile ? 'border-success/40 bg-success/5' : 'border-border-subtle hover:border-accent/40'
                )}>
                <input ref={fileRef} type="file" accept=".pdf,.xls,.xlsx,.csv" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileDrop(f) }} />
                {pickedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText size={24} className="text-success-light" />
                    <div className="text-left">
                      <p className="text-sm text-white font-medium">{pickedFile.name}</p>
                      <p className="text-xs text-white/40">{(pickedFile.size / 1024).toFixed(0)} KB</p>
                      {extracting && <p className="text-xs text-accent-hover flex items-center gap-1 mt-1"><RefreshCw size={10} className="animate-spin"/> AI reading invoice…</p>}
                      {!extracting && <p className="text-xs text-success-light mt-1">✓ Fields auto-filled — review below</p>}
                    </div>
                    <button onClick={e => { e.stopPropagation(); setPickedFile(null) }}
                      className="ml-2 text-white/30 hover:text-white/60"><X size={16}/></button>
                  </div>
                ) : (
                  <>
                    <Upload size={28} className="text-white/20 mx-auto mb-3" />
                    <p className="text-white/60 text-sm">Drag & drop or click to browse</p>
                  </>
                )}
              </div>

              {/* Invoice details form */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="label mb-1 block">Supplier *</label>
                  <input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
                    placeholder="e.g. DEWA" className="w-full bg-bg-card border border-border-subtle rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="label mb-1 block">Document Type</label>
                  <select value={form.doc_type} onChange={e => setForm(f => ({ ...f, doc_type: e.target.value }))} className="form-select w-full text-xs">
                    <option>Invoice</option>
                    <option>Credit Note</option>
                    <option>Statement</option>
                  </select>
                </div>
                <div>
                  <label className="label mb-1 block">Tax Date</label>
                  <input type="date" value={form.tax_date} onChange={e => setForm(f => ({ ...f, tax_date: e.target.value }))}
                    className="w-full bg-bg-card border border-border-subtle rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="label mb-1 block">Payment Due</label>
                  <input type="date" value={form.payment_due} onChange={e => setForm(f => ({ ...f, payment_due: e.target.value }))}
                    className="w-full bg-bg-card border border-border-subtle rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="label mb-1 block">Amount (excl. VAT)</label>
                  <input type="number" value={form.amount_ex_vat} onChange={e => setForm(f => ({ ...f, amount_ex_vat: e.target.value }))}
                    placeholder="0.00" className="w-full bg-bg-card border border-border-subtle rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="label mb-1 block">VAT Amount</label>
                  <input type="number" value={form.vat_amount} onChange={e => setForm(f => ({ ...f, vat_amount: e.target.value }))}
                    placeholder="0.00" className="w-full bg-bg-card border border-border-subtle rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="label mb-1 block">Customer Account</label>
                  <input value={form.customer_account} onChange={e => setForm(f => ({ ...f, customer_account: e.target.value }))}
                    placeholder="CUST-12345" className="w-full bg-bg-card border border-border-subtle rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="label mb-1 block">Notes</label>
                  <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Optional notes" className="w-full bg-bg-card border border-border-subtle rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-accent" />
                </div>
              </div>

              {/* Status / submit */}
              {uploadStep === 'done' && (
                <div className="p-3 bg-success/10 border border-success/30 rounded-xl text-sm text-success-light text-center mb-3">
                  ✓ Invoice uploaded and saved — switching to Invoice List…
                </div>
              )}
              {uploadStep === 'error' && (
                <div className="p-3 bg-danger-muted border border-danger/30 rounded-xl text-xs text-danger-light mb-3">
                  ⚠ {uploadErr}
                </div>
              )}

              <button
                onClick={submitInvoice}
                disabled={uploadStep === 'uploading' || uploadStep === 'saving' || uploadStep === 'done'}
                className={clsx('btn-primary w-full flex items-center justify-center gap-2',
                  (uploadStep === 'uploading' || uploadStep === 'saving') && 'opacity-60 cursor-wait')}>
                {uploadStep === 'uploading' && <><RefreshCw size={13} className="animate-spin" /> Uploading file…</>}
                {uploadStep === 'saving'    && <><RefreshCw size={13} className="animate-spin" /> Saving to database…</>}
                {uploadStep === 'done'      && <>✓ Done</>}
                {(uploadStep === 'idle' || uploadStep === 'error') && <><Upload size={13} /> Submit Invoice</>}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ── Invoice detail slide-over ──────────────────────────────────────── */}
    {viewing && (
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={() => setViewing(null)} />

        {/* Panel */}
        <div className="relative w-full max-w-md bg-bg-primary border-l border-border-subtle flex flex-col shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
            <div>
              <div className="text-sm font-semibold text-white flex items-center gap-2">
                <FileText size={14} className="text-accent" />
                {viewing.nus_ref ?? 'Invoice Detail'}
              </div>
              <div className="text-xs text-white/40 mt-0.5">{viewing.supplier ?? 'Unknown supplier'} · {viewing.doc_type}</div>
            </div>
            <button onClick={() => setViewing(null)} className="text-white/30 hover:text-white/60">
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">

            {/* Status */}
            <div className="flex items-center gap-2">
              <span className={STATUS_STYLE[viewing.status] ?? 'status-pending'}>{viewing.status}</span>
              <span className="text-xs text-white/30">{new Date(viewing.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>

            {/* Amounts */}
            <div className="card bg-bg-secondary">
              <div className="text-xs text-white/40 mb-3 font-semibold uppercase tracking-wider">Amounts</div>
              <div className="space-y-2">
                {[
                  { label: 'Excl. VAT',  value: viewing.amount_ex_vat },
                  { label: 'VAT',        value: viewing.vat_amount    },
                  { label: 'Total',      value: viewing.amount_inc_vat, bold: true },
                ].map(r => (
                  <div key={r.label} className={clsx('flex justify-between text-sm', r.bold && 'border-t border-border-subtle pt-2 mt-2')}>
                    <span className="text-white/50">{r.label}</span>
                    <span className={clsx('font-mono', r.bold ? 'text-white font-semibold text-base' : 'text-white/80')}>
                      {r.value != null ? `${cfg.currencySymbol} ${r.value.toLocaleString()}` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Details */}
            <div className="card bg-bg-secondary">
              <div className="text-xs text-white/40 mb-3 font-semibold uppercase tracking-wider">Invoice Details</div>
              <div className="space-y-2.5 text-sm">
                {[
                  { label: 'NUS Reference',     value: viewing.nus_ref },
                  { label: 'Supplier',          value: viewing.supplier },
                  { label: 'Document Type',     value: viewing.doc_type },
                  { label: 'Tax Date',          value: viewing.tax_date },
                  { label: 'Payment Due',       value: viewing.payment_due },
                  { label: 'Customer Account',  value: viewing.customer_account },
                  { label: 'Currency',          value: viewing.currency },
                ].map(r => (
                  <div key={r.label} className="flex justify-between gap-4">
                    <span className="text-white/40 flex-shrink-0">{r.label}</span>
                    <span className="text-white/80 text-right truncate">{r.value ?? '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            {viewing.notes && (
              <div className="card bg-bg-secondary">
                <div className="text-xs text-white/40 mb-2 font-semibold uppercase tracking-wider">Notes / Address</div>
                <p className="text-xs text-white/60 leading-relaxed">{viewing.notes}</p>
              </div>
            )}

            {/* File */}
            {viewing.file_path && (
              <div className="card bg-bg-secondary">
                <div className="text-xs text-white/40 mb-3 font-semibold uppercase tracking-wider">Attached File</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-accent" />
                    <span className="text-sm text-white/70">{viewing.file_name ?? 'invoice.pdf'}</span>
                  </div>
                  <a
                    href={supabase.storage.from('invoice-files').getPublicUrl(viewing.file_path).data.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary flex items-center gap-1 text-xs">
                    <ExternalLink size={11} /> Open PDF
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex gap-2 p-4 border-t border-border-subtle">
            <button className="btn-secondary flex-1 text-xs flex items-center justify-center gap-1">
              <Download size={12} /> Download
            </button>
            <button
              onClick={() => setViewing(null)}
              className="btn-secondary flex-1 text-xs">
              Close
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  )
}
