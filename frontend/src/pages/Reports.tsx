import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Download, Printer, Play, Plus, Search, RefreshCw, FileText, Globe, Bot } from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '@/lib/supabase'
import { useTenantId } from '@/lib/auth'
import { useAuth } from '@/lib/auth'

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
  { id:'r1',  name:'Portfolio KPI Summary',              audience:'Global', description:'Standardized KPIs compiled and aggregated annually across all sites — consumption, spend, CO₂ intensity, data quality.',                         category:'Client Summary',        lastRun:'Today 06:00',  format:'Both' },
  { id:'r2',  name:'Invoice Data Reports — 13 Period',   audience:'Global', description:'Complete invoice and billing data across 13 accounting periods with variance analysis.',                                                          category:'Client Summary',        lastRun:'2 days ago',   format:'XLS'  },
  { id:'r3',  name:'Site Analytics',                     audience:'Global', description:'Per-site breakdown of energy consumption, cost, and emissions with ranking and benchmarking.',                                                    category:'Client Summary',        lastRun:'Yesterday',    format:'Both' },
  { id:'r4',  name:'Country Analytics',                  audience:'Global', description:'Site & Supply Count, Expenditure, Expenditure Ranking, Consumption, CO₂ Ranking by country.',                                                   category:'Client Summary',        lastRun:'3 days ago',   format:'Both' },
  { id:'r5',  name:'Two-Year Consumption Comparison',    audience:'Global', description:'Side-by-side comparison of current vs prior year electricity and gas consumption by site.',                                                       category:'Two-Year Comparison',   lastRun:'1 week ago',   format:'Both' },
  { id:'r6',  name:'Long-Term Trends (5 Year)',          audience:'Global', description:'Multi-year consumption and cost trends showing normalised intensity metrics per m² and per occupant.',                                            category:'Long-Term Trends',      lastRun:'2 weeks ago',  format:'PDF'  },
  { id:'r7',  name:'Efficiency Tools — Benchmarking',   audience:'Global', description:'Efficiency Ranking, Intensity Ranking, Efficiency Benchmark across all properties.',                                                             category:'Efficiency Tools',      lastRun:'1 week ago',   format:'Both' },
  { id:'r8',  name:'Performance Report',                 audience:'Global', description:'Consumption and cost performance vs budget and prior periods with deviation analysis.',                                                           category:'Performance Tools',     lastRun:'3 days ago',   format:'Both' },
  { id:'r9',  name:'Budget vs Actuals',                  audience:'Global', description:'Contract variance monitoring — actual vs budgeted spend per meter, site, and country.',                                                          category:'Budgeting & Reporting', lastRun:'Today',        format:'XLS'  },
  { id:'r10', name:'Contract Variance Monitoring',       audience:'Global', description:'Detect billing deviations outside contracted tariff bands with supplier reference matching.',                                                    category:'Contract Variance',     lastRun:'4 days ago',   format:'Both' },
  { id:'r11', name:'Electricity Supply Demand Download', audience:'Global', description:'Maximum Demand, Capacity, Power Factor by month — filterable by site and supply.',                                                              category:'Performance Tools',     lastRun:'1 week ago',   format:'XLS'  },
  { id:'r12', name:'Site Data Download',                 audience:'Global', description:'Every supply/utility itemized per site per month: data quality, total consumption, total cost, average unit price.',                            category:'Client Summary',        lastRun:'2 days ago',   format:'XLS'  },
  { id:'r13', name:'Carbon Footprint (Annual)',          audience:'Global', description:'Scope 1 & 2 emissions by source (Electricity, Gas, Oil, District Energy) vs baseline year.',                                                    category:'Carbon Tracking',       lastRun:'Yesterday',    format:'Both' },
  { id:'r14', name:'Supplies & Energy Types Report',     audience:'Global', description:'Utility supply register with green energy certificate flags, metering PODs, and operator details.',                                             category:'Client Summary',        lastRun:'1 week ago',   format:'XLS'  },
  { id:'r15', name:'Site Load by Country',               audience:'Global', description:'Aggregated load profiles grouped by country for grid planning and capacity tracking.',                                                           category:'Performance Tools',     lastRun:'2 weeks ago',  format:'Both' },
]

const CUSTOM_REPORTS: Report[] = [
  { id:'c1', name:'Masdar City Quarterly Review',       audience:'Client', description:'Custom quarterly energy performance report for Masdar City campus — includes renewable offset analysis.',   category:'Custom', lastRun:'Last quarter', format:'PDF'  },
  { id:'c2', name:'DIFC Portfolio ESG Report',          audience:'Client', description:'ESG disclosure report for DIFC Authority covering Scope 1/2/3 emissions and green building targets.',       category:'Custom', lastRun:'2 months ago', format:'PDF'  },
  { id:'c3', name:'Comparative Site Selector — UAE North', audience:'Client', description:'Select sites by group/country/individually for customised comparison reporting.',                       category:'Custom', lastRun:'3 weeks ago',  format:'Both' },
]

const TEMPLATES: Report[] = [
  { id:'t1', name:'Monthly Executive Summary',  audience:'Global', description:'AI-generated executive overview with KPI cards, anomaly highlights, and cost forecasts.',                           category:'Template', lastRun:'—', format:'PDF' },
  { id:'t2', name:'Quarterly Board Pack',       audience:'Global', description:'Branded board-ready pack with spend trend, carbon progress, and budget vs actuals.',                               category:'Template', lastRun:'—', format:'PDF' },
  { id:'t3', name:'Annual Sustainability Report', audience:'Global', description:'GRI / TCFD aligned annual report template with emission source breakdown and target tracking.',                  category:'Template', lastRun:'—', format:'PDF' },
]

const CATEGORIES = [
  'All Categories','Client Summary','Two-Year Comparison','Long-Term Trends',
  'Efficiency Tools','Performance Tools','Budgeting & Reporting','Contract Variance',
  'Carbon Tracking','Custom','Template',
]

// ─── Shared PDF styles ──────────────────────────────────────────────────────────
const PDF_STYLES = `
* { margin:0;padding:0;box-sizing:border-box; }
body { font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;font-size:11pt;background:white; }
@page { size:A4;margin:18mm 15mm; }
.header { display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:12px;border-bottom:3px solid #4f46e5;margin-bottom:20px; }
.logo { font-size:20pt;font-weight:800;color:#4f46e5;letter-spacing:-0.5px; }
.logo span { color:#10b981; }
.meta { text-align:right;font-size:9pt;color:#6b7280;line-height:1.6; }
.meta strong { color:#1a1a2e;font-size:11pt;display:block; }
.section { margin-bottom:22px; }
.section-title { font-size:10pt;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#4f46e5;margin-bottom:10px;padding-bottom:4px;border-bottom:1px solid #e5e7eb; }
.kpi-grid { display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px; }
.kpi { background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px; }
.kpi-label { font-size:8pt;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;margin-bottom:4px; }
.kpi-value { font-size:16pt;font-weight:700;color:#1a1a2e; }
.kpi-sub { font-size:8pt;color:#9ca3af;margin-top:2px; }
.kpi.critical { border-color:#fca5a5;background:#fff5f5; }
.kpi.critical .kpi-value { color:#dc2626; }
.kpi.warning { border-color:#fcd34d;background:#fffbeb; }
.kpi.warning .kpi-value { color:#d97706; }
.kpi.green .kpi-value { color:#059669; }
table { width:100%;border-collapse:collapse;font-size:9.5pt; }
th { background:#f1f5f9;text-align:left;padding:7px 10px;font-weight:600;color:#374151;border-bottom:2px solid #e2e8f0; }
td { padding:6px 10px;border-bottom:1px solid #f1f5f9;color:#374151; }
tr:nth-child(even) td { background:#fafafa; }
.badge { display:inline-block;padding:2px 7px;border-radius:999px;font-size:8pt;font-weight:700; }
.badge-critical { background:#fee2e2;color:#dc2626; }
.badge-warning  { background:#fef3c7;color:#d97706; }
.badge-ok       { background:#d1fae5;color:#059669; }
.footer { margin-top:30px;padding-top:10px;border-top:1px solid #e5e7eb;font-size:8pt;color:#9ca3af;display:flex;justify-content:space-between; }
@media print { body { -webkit-print-color-adjust:exact;print-color-adjust:exact; } }
`

function openPDF(title: string, body: string, tenantName: string) {
  const now = new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${title}</title>
<style>${PDF_STYLES}</style></head><body>
<div class="header">
  <div><div class="logo">Energy<span>OS</span></div><div style="font-size:9pt;color:#6b7280;margin-top:3px">Portfolio Intelligence Platform</div></div>
  <div class="meta"><strong>${tenantName}</strong>${title}<br>Generated: ${now}<br>Confidential — Internal Use Only</div>
</div>
${body}
<div class="footer"><span>EnergyOS · Portfolio Intelligence · ${tenantName}</span><span>Generated ${now} · Confidential</span></div>
</body></html>`
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) { alert('Allow popups to generate PDF reports.'); return }
  win.document.write(html)
  win.document.close()
  setTimeout(() => win.print(), 600)
}

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ─── Report generators ──────────────────────────────────────────────────────────

async function genR1_PDF(tenantId: string, tenantName: string) {
  const [sitesRes, connsRes, consRes, anomalyRes] = await Promise.all([
    supabase.from('sites').select('id,name,status').eq('tenant_id', tenantId),
    supabase.from('energy_connections').select('id,connection_type,site_name,status').eq('tenant_id', tenantId),
    supabase.from('consumption_records').select('consumption,unit,cost').eq('tenant_id', tenantId),
    fetch(`/api/anomalies/${tenantId}`).then(r => r.ok ? r.json() : { anomalies:[] }).catch(() => ({ anomalies:[] })),
  ])
  const sites=sitesRes.data??[], conns=connsRes.data??[], consRec=consRes.data??[]
  const anomalies: any[] = anomalyRes.anomalies ?? []
  const totalElec = consRec.filter(r=>r.unit==='kWh').reduce((s,r)=>s+Number(r.consumption),0)
  const totalGas  = consRec.filter(r=>r.unit==='m3').reduce((s,r)=>s+Number(r.consumption),0)
  const totalCost = consRec.reduce((s,r)=>s+Number(r.cost),0)
  const co2 = Math.round((totalElec*0.45+totalGas*2.04)/1000)
  const criticals = anomalies.filter(a=>a.severity==='critical')
  const warnings  = anomalies.filter(a=>a.severity==='warning')

  openPDF('Portfolio KPI Summary Report', `
<div class="section"><div class="section-title">Portfolio Overview</div>
<div class="kpi-grid">
  <div class="kpi"><div class="kpi-label">Active Sites</div><div class="kpi-value">${sites.length}</div><div class="kpi-sub">${conns.length} connections</div></div>
  <div class="kpi"><div class="kpi-label">Electricity</div><div class="kpi-value">${(totalElec/1000).toFixed(0)} MWh</div><div class="kpi-sub">${totalElec.toLocaleString()} kWh</div></div>
  <div class="kpi"><div class="kpi-label">Total Spend</div><div class="kpi-value">AED ${(totalCost/1000).toFixed(0)}K</div><div class="kpi-sub">${totalCost.toLocaleString()} AED</div></div>
  <div class="kpi"><div class="kpi-label">CO₂ Emissions</div><div class="kpi-value">${co2} t</div><div class="kpi-sub">Scope 1+2 estimate</div></div>
</div></div>
<div class="section"><div class="section-title">Anomaly Summary</div>
<div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">
  <div class="kpi critical"><div class="kpi-label">Critical</div><div class="kpi-value">${criticals.length}</div></div>
  <div class="kpi warning"><div class="kpi-label">Warnings</div><div class="kpi-value">${warnings.length}</div></div>
  <div class="kpi"><div class="kpi-label">Records Scanned</div><div class="kpi-value">${consRec.length}</div></div>
</div>
${anomalies.length>0?`<table><thead><tr><th>Severity</th><th>Period</th><th>Connection</th><th>Finding</th></tr></thead><tbody>
${anomalies.slice(0,8).map(a=>`<tr><td><span class="badge badge-${a.severity==='critical'?'critical':'warning'}">${a.severity.toUpperCase()}</span></td><td>${a.period}</td><td>${a.connection_label}</td><td>${a.title}</td></tr>`).join('')}
</tbody></table>`:'<p style="color:#6b7280;font-size:9pt">No anomalies detected.</p>'}
</div>
${sites.length>0?`<div class="section"><div class="section-title">Site Register</div>
<table><thead><tr><th>Site Name</th><th>Connections</th><th>Status</th></tr></thead><tbody>
${sites.map(s=>`<tr><td>${s.name}</td><td style="text-align:center">${conns.filter(c=>c.site_name===s.name).length}</td><td>${s.status??'Active'}</td></tr>`).join('')}
</tbody></table></div>`:''}
`, tenantName)
}

async function genR1_XLS(tenantId: string) {
  const [sitesRes, connsRes, consRes] = await Promise.all([
    supabase.from('sites').select('id,name,status').eq('tenant_id', tenantId),
    supabase.from('energy_connections').select('id,connection_type,site_name,status').eq('tenant_id', tenantId),
    supabase.from('consumption_records').select('connection_id,period_start,consumption,unit,cost').eq('tenant_id', tenantId),
  ])
  const sites=sitesRes.data??[], conns=connsRes.data??[], cons=consRes.data??[]
  const rows: string[][] = [['Site Name','Connections','Electricity (kWh)','Gas (m3)','Total Cost (AED)','CO2 (tCO2)','Status']]
  for (const s of sites) {
    const sConns = conns.filter(c=>c.site_name===s.name)
    const connIds = new Set(sConns.map(c=>c.id))
    const sCons = cons.filter(r=>connIds.has(r.connection_id))
    const elec = sCons.filter(r=>r.unit==='kWh').reduce((a,r)=>a+Number(r.consumption),0)
    const gas  = sCons.filter(r=>r.unit==='m3').reduce((a,r)=>a+Number(r.consumption),0)
    const cost = sCons.reduce((a,r)=>a+Number(r.cost),0)
    const co2  = ((elec*0.45+gas*2.04)/1000).toFixed(1)
    rows.push([s.name, String(sConns.length), elec.toFixed(0), gas.toFixed(0), cost.toFixed(0), co2, s.status??'Active'])
  }
  downloadCSV('portfolio-kpi-summary.csv', rows)
}

async function genR2_XLS(tenantId: string) {
  const { data } = await supabase.from('invoices').select('*').eq('tenant_id', tenantId).order('tax_date')
  const rows: string[][] = [['Ref','Supplier','Doc Type','Tax Date','Payment Due','Customer Account','Amount Ex VAT','VAT Amount','Amount Inc VAT','Status','Notes']]
  for (const inv of data ?? []) {
    rows.push([inv.nus_ref??'',inv.supplier??'',inv.doc_type??'',inv.tax_date??'',inv.payment_due??'',inv.customer_account??'',
      String(inv.amount_ex_vat??0),String(inv.vat_amount??0),String(inv.amount_inc_vat??0),inv.status??'',inv.notes??''])
  }
  downloadCSV('invoice-data-13-period.csv', rows)
}

async function genR3_PDF(tenantId: string, tenantName: string) {
  const [sitesRes, connsRes, consRes] = await Promise.all([
    supabase.from('sites').select('id,name,status,cities(name,countries(name))').eq('tenant_id', tenantId),
    supabase.from('energy_connections').select('id,connection_type,site_id,status').eq('tenant_id', tenantId),
    supabase.from('consumption_records').select('connection_id,consumption,unit,cost').eq('tenant_id', tenantId),
  ])
  const sites=(sitesRes.data??[]) as any[], conns=connsRes.data??[], cons=consRes.data??[]
  const siteData = sites.map(s => {
    const sConns = conns.filter(c=>c.site_id===s.id)
    const connIds = new Set(sConns.map(c=>c.id))
    const sCons = cons.filter(r=>connIds.has(r.connection_id))
    const elec = sCons.filter(r=>r.unit==='kWh').reduce((a,r)=>a+Number(r.consumption),0)
    const gas  = sCons.filter(r=>r.unit==='m3').reduce((a,r)=>a+Number(r.consumption),0)
    const cost = sCons.reduce((a,r)=>a+Number(r.cost),0)
    const co2  = ((elec*0.45+gas*2.04)/1000).toFixed(1)
    return { name:s.name, city:(s.cities as any)?.name??'', country:(s.cities as any)?.countries?.name??'', conns:sConns.length, elec, gas, cost, co2 }
  }).sort((a,b)=>b.cost-a.cost)

  openPDF('Site Analytics Report', `
<div class="section"><div class="section-title">Site Analytics — ${sites.length} Sites</div>
<table><thead><tr><th>Site</th><th>City</th><th>Country</th><th>Connections</th><th>Electricity (kWh)</th><th>Gas (m³)</th><th>Cost (AED)</th><th>CO₂ (t)</th></tr></thead><tbody>
${siteData.map(s=>`<tr><td>${s.name}</td><td>${s.city}</td><td>${s.country}</td><td style="text-align:center">${s.conns}</td><td style="text-align:right">${s.elec.toLocaleString()}</td><td style="text-align:right">${s.gas.toLocaleString()}</td><td style="text-align:right">${s.cost.toLocaleString()}</td><td style="text-align:right">${s.co2}</td></tr>`).join('')}
</tbody></table></div>
`, tenantName)
}

async function genR3_XLS(tenantId: string) {
  const [sitesRes, connsRes, consRes] = await Promise.all([
    supabase.from('sites').select('id,name,status,cities(name,countries(name))').eq('tenant_id', tenantId),
    supabase.from('energy_connections').select('id,connection_type,site_id,status').eq('tenant_id', tenantId),
    supabase.from('consumption_records').select('connection_id,consumption,unit,cost').eq('tenant_id', tenantId),
  ])
  const sites=(sitesRes.data??[]) as any[], conns=connsRes.data??[], cons=consRes.data??[]
  const rows: string[][] = [['Site','City','Country','Connections','Electricity (kWh)','Gas (m3)','Total Cost (AED)','CO2 (tCO2)','Status']]
  for (const s of sites) {
    const sConns = conns.filter(c=>c.site_id===s.id)
    const connIds = new Set(sConns.map(c=>c.id))
    const sCons = cons.filter(r=>connIds.has(r.connection_id))
    const elec = sCons.filter(r=>r.unit==='kWh').reduce((a,r)=>a+Number(r.consumption),0)
    const gas  = sCons.filter(r=>r.unit==='m3').reduce((a,r)=>a+Number(r.consumption),0)
    const cost = sCons.reduce((a,r)=>a+Number(r.cost),0)
    rows.push([s.name,(s.cities as any)?.name??'',(s.cities as any)?.countries?.name??'',String(sConns.length),elec.toFixed(0),gas.toFixed(0),cost.toFixed(0),((elec*0.45+gas*2.04)/1000).toFixed(1),s.status??'Active'])
  }
  downloadCSV('site-analytics.csv', rows)
}

async function genR4_PDF(tenantId: string, tenantName: string) {
  const { data: cons } = await supabase.from('consumption_records')
    .select('connection_id,consumption,unit,cost,currency').eq('tenant_id', tenantId)
  const { data: conns } = await supabase.from('energy_connections')
    .select('id,site_id').eq('tenant_id', tenantId)
  const { data: sitesRaw } = await supabase.from('sites')
    .select('id,cities(name,countries(name,code))').eq('tenant_id', tenantId)

  const siteCountry: Record<string, string> = {}
  for (const s of (sitesRaw ?? []) as any[]) siteCountry[s.id] = (s.cities as any)?.countries?.name ?? 'Unknown'
  const siteId: Record<string, string> = {}
  for (const c of (conns ?? [])) siteId[c.id] = c.site_id

  const countryTotals: Record<string, { elec:number; gas:number; cost:number; sites:Set<string>; conns:Set<string> }> = {}
  for (const r of (cons ?? [])) {
    const sId = siteId[r.connection_id]
    const country = sId ? (siteCountry[sId] ?? 'Unknown') : 'Unknown'
    if (!countryTotals[country]) countryTotals[country] = { elec:0, gas:0, cost:0, sites:new Set(), conns:new Set() }
    const ct = countryTotals[country]
    if (r.unit==='kWh') ct.elec+=Number(r.consumption)
    else ct.gas+=Number(r.consumption)
    ct.cost+=Number(r.cost)
    if (sId) ct.sites.add(sId)
    ct.conns.add(r.connection_id)
  }
  const rows = Object.entries(countryTotals).sort((a,b)=>b[1].cost-a[1].cost)

  openPDF('Country Analytics Report', `
<div class="section"><div class="section-title">Country Analytics</div>
<table><thead><tr><th>Country</th><th>Sites</th><th>Connections</th><th>Electricity (kWh)</th><th>Gas (m³)</th><th>Total Spend</th><th>CO₂ (t)</th></tr></thead><tbody>
${rows.map(([c,d])=>`<tr><td>${c}</td><td style="text-align:center">${d.sites.size}</td><td style="text-align:center">${d.conns.size}</td><td style="text-align:right">${d.elec.toLocaleString()}</td><td style="text-align:right">${d.gas.toLocaleString()}</td><td style="text-align:right">${d.cost.toLocaleString()}</td><td style="text-align:right">${((d.elec*0.45+d.gas*2.04)/1000).toFixed(0)}</td></tr>`).join('')}
</tbody></table></div>
`, tenantName)
}

async function genR4_XLS(tenantId: string) {
  const { data: cons } = await supabase.from('consumption_records').select('connection_id,consumption,unit,cost').eq('tenant_id', tenantId)
  const { data: conns } = await supabase.from('energy_connections').select('id,site_id').eq('tenant_id', tenantId)
  const { data: sitesRaw } = await supabase.from('sites').select('id,cities(name,countries(name))').eq('tenant_id', tenantId)
  const siteCountry: Record<string,string> = {}
  for (const s of (sitesRaw??[]) as any[]) siteCountry[s.id]=(s.cities as any)?.countries?.name??'Unknown'
  const siteId: Record<string,string> = {}
  for (const c of (conns??[])) siteId[c.id]=c.site_id
  const ct: Record<string,{elec:number;gas:number;cost:number;sites:Set<string>;conns:Set<string>}> = {}
  for (const r of (cons??[])) {
    const sId=siteId[r.connection_id], country=sId?(siteCountry[sId]??'Unknown'):'Unknown'
    if (!ct[country]) ct[country]={elec:0,gas:0,cost:0,sites:new Set(),conns:new Set()}
    if (r.unit==='kWh') ct[country].elec+=Number(r.consumption); else ct[country].gas+=Number(r.consumption)
    ct[country].cost+=Number(r.cost); if(sId) ct[country].sites.add(sId); ct[country].conns.add(r.connection_id)
  }
  const rows: string[][] = [['Country','Sites','Connections','Electricity (kWh)','Gas (m3)','Total Spend','CO2 (t)']]
  for (const [c,d] of Object.entries(ct).sort((a,b)=>b[1].cost-a[1].cost))
    rows.push([c,String(d.sites.size),String(d.conns.size),d.elec.toFixed(0),d.gas.toFixed(0),d.cost.toFixed(0),((d.elec*0.45+d.gas*2.04)/1000).toFixed(1)])
  downloadCSV('country-analytics.csv', rows)
}

async function genR5_XLS(tenantId: string) {
  const { data } = await supabase.from('consumption_records')
    .select('connection_id,period_start,consumption,unit,cost').eq('tenant_id', tenantId).order('period_start')
  const curYear = new Date().getFullYear()
  const py = curYear - 1
  const rows: string[][] = [['Connection ID','Period','Year','Electricity (kWh)','Gas (m3)','Cost']]
  for (const r of data ?? []) {
    const yr = new Date(r.period_start).getFullYear()
    if (yr !== curYear && yr !== py) continue
    rows.push([r.connection_id, r.period_start.slice(0,7), String(yr),
      r.unit==='kWh'?String(r.consumption):'0', r.unit==='m3'?String(r.consumption):'0', String(r.cost)])
  }
  downloadCSV('two-year-comparison.csv', rows)
}

async function genR5_PDF(tenantId: string, tenantName: string) {
  const { data } = await supabase.from('consumption_records')
    .select('connection_id,period_start,consumption,unit,cost').eq('tenant_id', tenantId).order('period_start')
  const curYear = new Date().getFullYear(), py = curYear - 1
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const byMonth: Record<string,{curElec:number;pyElec:number;curGas:number;pyGas:number}> = {}
  months.forEach((_,i) => { byMonth[String(i+1).padStart(2,'0')]={curElec:0,pyElec:0,curGas:0,pyGas:0} })
  for (const r of data??[]) {
    const d=new Date(r.period_start), yr=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0')
    if (!byMonth[m]) continue
    if (yr===curYear) { if(r.unit==='kWh') byMonth[m].curElec+=Number(r.consumption); else byMonth[m].curGas+=Number(r.consumption) }
    if (yr===py)      { if(r.unit==='kWh') byMonth[m].pyElec+=Number(r.consumption);  else byMonth[m].pyGas+=Number(r.consumption) }
  }
  openPDF('Two-Year Consumption Comparison', `
<div class="section"><div class="section-title">Electricity — ${py} vs ${curYear} (kWh)</div>
<table><thead><tr><th>Month</th><th style="text-align:right">${py}</th><th style="text-align:right">${curYear}</th><th style="text-align:right">Change</th></tr></thead><tbody>
${Object.entries(byMonth).map(([m,d])=>{const diff=d.curElec-d.pyElec;return`<tr><td>${months[parseInt(m)-1]}</td><td style="text-align:right">${d.pyElec.toLocaleString()}</td><td style="text-align:right">${d.curElec.toLocaleString()}</td><td style="text-align:right;color:${diff>0?'#dc2626':'#059669'}">${diff>=0?'+':''}${diff.toLocaleString()}</td></tr>`}).join('')}
</tbody></table></div>
`, tenantName)
}

async function genR9_XLS(tenantId: string) {
  const { data: cons } = await supabase.from('consumption_records')
    .select('connection_id,period_start,consumption,unit,cost').eq('tenant_id', tenantId).order('period_start')
  const { data: conns } = await supabase.from('energy_connections')
    .select('id,site_name,connection_type,ean_code').eq('tenant_id', tenantId)
  const connMap: Record<string,any> = {}
  for (const c of conns??[]) connMap[c.id]=c
  const BUDGET_RATE = 0.40
  const rows: string[][] = [['Connection','EAN Code','Site','Type','Period','Actual Cost (AED)','Budget Cost (AED)','Variance (AED)','Variance %']]
  for (const r of (cons??[]).filter(r=>r.unit==='kWh')) {
    const c=connMap[r.connection_id]; if(!c) continue
    const budget=Number(r.consumption)*BUDGET_RATE
    const actual=Number(r.cost)
    const variance=actual-budget
    rows.push([c.site_name??'',c.ean_code??'',c.site_name??'',c.connection_type??'',r.period_start.slice(0,7),actual.toFixed(2),budget.toFixed(2),variance.toFixed(2),budget>0?((variance/budget)*100).toFixed(1)+'%':'—'])
  }
  downloadCSV('budget-vs-actuals.csv', rows)
}

async function genR12_XLS(tenantId: string) {
  const { data: cons } = await supabase.from('consumption_records')
    .select('connection_id,period_start,period_end,consumption,unit,cost,currency').eq('tenant_id', tenantId).order('period_start')
  const { data: conns } = await supabase.from('energy_connections')
    .select('id,site_name,connection_type,ean_code,status').eq('tenant_id', tenantId)
  const connMap: Record<string,any> = {}
  for (const c of conns??[]) connMap[c.id]=c
  const rows: string[][] = [['Period','Site','EAN Code','Type','Status','Consumption','Unit','Cost','Currency','Avg Unit Price']]
  for (const r of cons??[]) {
    const c=connMap[r.connection_id]
    const avgPrice = Number(r.consumption)>0 ? (Number(r.cost)/Number(r.consumption)).toFixed(4) : '—'
    rows.push([r.period_start.slice(0,7),c?.site_name??'',c?.ean_code??'',c?.connection_type??'',c?.status??'',
      String(r.consumption),r.unit,String(r.cost),r.currency??'AED',avgPrice])
  }
  downloadCSV('site-data-download.csv', rows)
}

async function genR13_PDF(tenantId: string, tenantName: string) {
  const { data: cons } = await supabase.from('consumption_records')
    .select('consumption,unit,cost').eq('tenant_id', tenantId)
  const totalElec = (cons??[]).filter(r=>r.unit==='kWh').reduce((a,r)=>a+Number(r.consumption),0)
  const totalGas  = (cons??[]).filter(r=>r.unit==='m3').reduce((a,r)=>a+Number(r.consumption),0)
  const scope2 = (totalElec*0.45/1000)
  const scope1 = (totalGas*2.04/1000)
  const total  = scope1+scope2

  openPDF('Carbon Footprint Report (Annual)', `
<div class="section"><div class="section-title">Emissions Summary</div>
<div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">
  <div class="kpi"><div class="kpi-label">Scope 1 (Gas)</div><div class="kpi-value">${scope1.toFixed(0)} t</div><div class="kpi-sub">${totalGas.toLocaleString()} m³ × 2.04 kg/m³</div></div>
  <div class="kpi"><div class="kpi-label">Scope 2 (Electricity)</div><div class="kpi-value">${scope2.toFixed(0)} t</div><div class="kpi-sub">${totalElec.toLocaleString()} kWh × 0.45 kg/kWh</div></div>
  <div class="kpi"><div class="kpi-label">Total CO₂</div><div class="kpi-value">${total.toFixed(0)} t</div><div class="kpi-sub">Scope 1 + 2 combined</div></div>
</div></div>
<div class="section"><div class="section-title">Methodology</div>
<table><thead><tr><th>Source</th><th>Consumption</th><th>Emission Factor</th><th>CO₂ (tCO₂)</th><th>% of Total</th></tr></thead><tbody>
<tr><td>Natural Gas (Scope 1)</td><td>${totalGas.toLocaleString()} m³</td><td>2.04 kg CO₂/m³</td><td>${scope1.toFixed(1)}</td><td>${total>0?((scope1/total)*100).toFixed(1):'0'}%</td></tr>
<tr><td>Electricity (Scope 2)</td><td>${totalElec.toLocaleString()} kWh</td><td>0.45 kg CO₂/kWh</td><td>${scope2.toFixed(1)}</td><td>${total>0?((scope2/total)*100).toFixed(1):'0'}%</td></tr>
</tbody></table>
<p style="font-size:8.5pt;color:#6b7280;margin-top:10px">Emission factors: UAE grid average (DEWA 2023). Scope 3 emissions not included. GRI 302 / TCFD aligned.</p>
</div>
`, tenantName)
}

async function genR13_XLS(tenantId: string) {
  const { data: cons } = await supabase.from('consumption_records')
    .select('connection_id,period_start,consumption,unit').eq('tenant_id', tenantId).order('period_start')
  const rows: string[][] = [['Connection ID','Period','Source','Consumption','Unit','Emission Factor','CO2 (kg)','CO2 (t)']]
  for (const r of cons??[]) {
    const factor = r.unit==='kWh'?0.45:r.unit==='m3'?2.04:0
    const co2kg = Number(r.consumption)*factor
    rows.push([r.connection_id,r.period_start.slice(0,7),r.unit==='kWh'?'Electricity (Scope 2)':'Gas (Scope 1)',
      String(r.consumption),r.unit,String(factor),co2kg.toFixed(1),(co2kg/1000).toFixed(4)])
  }
  downloadCSV('carbon-footprint.csv', rows)
}

async function genR14_XLS(tenantId: string) {
  const { data } = await supabase.from('energy_connections')
    .select('id,ean_code,connection_type,site_name,status,capacity').eq('tenant_id', tenantId).order('site_name')
  const rows: string[][] = [['ID','EAN Code','Site','Connection Type','Capacity','Status','Product']]
  for (const c of data??[])
    rows.push([c.id,c.ean_code??'',c.site_name??'',c.connection_type??'',c.capacity??'',c.status??'','Electricity'])
  downloadCSV('supplies-energy-types.csv', rows)
}

async function genR11_XLS(tenantId: string) {
  const { data: cons } = await supabase.from('consumption_records')
    .select('connection_id,period_start,consumption,unit,cost').eq('tenant_id', tenantId)
    .eq('unit','kWh').order('period_start')
  const { data: conns } = await supabase.from('energy_connections')
    .select('id,ean_code,site_name,connection_type,capacity').eq('tenant_id', tenantId)
  const connMap: Record<string,any> = {}
  for (const c of conns??[]) connMap[c.id]=c
  const rows: string[][] = [['Period','Site','EAN Code','Connection Type','Capacity','Consumption (kWh)','Cost (AED)','Est. Max Demand (kW)']]
  for (const r of cons??[]) {
    const c=connMap[r.connection_id]; if(!c) continue
    const maxDemand = (Number(r.consumption)/720*1.5).toFixed(1)
    rows.push([r.period_start.slice(0,7),c.site_name??'',c.ean_code??'',c.connection_type??'',c.capacity??'',
      String(r.consumption),String(r.cost),maxDemand])
  }
  downloadCSV('electricity-supply-demand.csv', rows)
}

async function genR10_XLS(tenantId: string) {
  const { data: cons } = await supabase.from('consumption_records')
    .select('connection_id,period_start,consumption,unit,cost').eq('tenant_id', tenantId).order('period_start')
  const { data: conns } = await supabase.from('energy_connections')
    .select('id,ean_code,site_name,connection_type').eq('tenant_id', tenantId)
  const connMap: Record<string,any> = {}
  for (const c of conns??[]) connMap[c.id]=c
  const CONTRACT_RATE_ELEC = 0.40, CONTRACT_RATE_GAS = 3.20
  const rows: string[][] = [['Period','Site','EAN Code','Unit','Consumption','Actual Cost','Expected Cost','Variance (AED)','Variance %','Flag']]
  for (const r of cons??[]) {
    const c=connMap[r.connection_id]; if(!c) continue
    const rate = r.unit==='kWh'?CONTRACT_RATE_ELEC:CONTRACT_RATE_GAS
    const expected = Number(r.consumption)*rate
    const actual = Number(r.cost)
    const variance = actual-expected
    const variancePct = expected>0?((variance/expected)*100):0
    const flag = Math.abs(variancePct)>20?'⚠ DEVIATION':''
    rows.push([r.period_start.slice(0,7),c.site_name??'',c.ean_code??'',r.unit,
      String(r.consumption),actual.toFixed(2),expected.toFixed(2),variance.toFixed(2),variancePct.toFixed(1)+'%',flag])
  }
  downloadCSV('contract-variance.csv', rows)
}

async function genR15_PDF(tenantId: string, tenantName: string) {
  await genR4_PDF(tenantId, tenantName)  // same data, country grouping
}
async function genR15_XLS(tenantId: string) {
  await genR4_XLS(tenantId)
}

// Generic PDF for simple reports
function genGenericPDF(report: Report, tenantName: string) {
  openPDF(report.name, `
<div class="section"><div class="section-title">${report.name}</div>
<p style="color:#374151;margin-bottom:16px">${report.description}</p>
<div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">
  <div class="kpi"><div class="kpi-label">Category</div><div class="kpi-value" style="font-size:11pt">${report.category}</div></div>
  <div class="kpi"><div class="kpi-label">Format</div><div class="kpi-value" style="font-size:11pt">${report.format}</div></div>
  <div class="kpi"><div class="kpi-label">Last Run</div><div class="kpi-value" style="font-size:11pt">${report.lastRun}</div></div>
</div></div>
<div class="section"><div class="section-title">Note</div>
<p style="color:#6b7280;font-size:9.5pt;line-height:1.7">This report template is ready for configuration. Connect it to your data sources via the EnergyOS API or schedule it via the Report Library scheduler. Contact your account manager to activate full data integration for this report type.</p>
</div>
`, tenantName)
}

// ─── Main dispatch ─────────────────────────────────────────────────────────────
async function runReport(id: string, fmt: 'pdf'|'xls', tenantId: string, tenantName: string, report: Report) {
  if      (id==='r1'  && fmt==='pdf') await genR1_PDF(tenantId, tenantName)
  else if (id==='r1'  && fmt==='xls') await genR1_XLS(tenantId)
  else if (id==='r2')                 await genR2_XLS(tenantId)
  else if (id==='r3'  && fmt==='pdf') await genR3_PDF(tenantId, tenantName)
  else if (id==='r3'  && fmt==='xls') await genR3_XLS(tenantId)
  else if (id==='r4'  && fmt==='pdf') await genR4_PDF(tenantId, tenantName)
  else if (id==='r4'  && fmt==='xls') await genR4_XLS(tenantId)
  else if (id==='r5'  && fmt==='pdf') await genR5_PDF(tenantId, tenantName)
  else if (id==='r5'  && fmt==='xls') await genR5_XLS(tenantId)
  else if (id==='r9')                 await genR9_XLS(tenantId)
  else if (id==='r10')                await genR10_XLS(tenantId)
  else if (id==='r11')                await genR11_XLS(tenantId)
  else if (id==='r12')                await genR12_XLS(tenantId)
  else if (id==='r13' && fmt==='pdf') await genR13_PDF(tenantId, tenantName)
  else if (id==='r13' && fmt==='xls') await genR13_XLS(tenantId)
  else if (id==='r14')                await genR14_XLS(tenantId)
  else if (id==='r15' && fmt==='pdf') await genR15_PDF(tenantId, tenantName)
  else if (id==='r15' && fmt==='xls') await genR15_XLS(tenantId)
  else if (fmt==='pdf')               genGenericPDF(report, tenantName)
  else                                alert(`${report.name}: no XLS data source configured for this report yet.`)
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function Reports() {
  const tenantId   = useTenantId()
  const { profile } = useAuth()
  const tenantName = (profile as any)?.name ?? 'EnergyOS Portfolio'

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

  const exec = async (r: Report, fmt: 'pdf' | 'xls') => {
    setRunning(r.id + fmt)
    try { await runReport(r.id, fmt, tenantId, tenantName, r) } catch(e) { console.error(e) }
    setRunning(null)
  }

  const hasPDF = (r: Report) => r.format === 'PDF' || r.format === 'Both'
  const hasXLS = (r: Report) => r.format === 'XLS' || r.format === 'Both'

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Report Library" subtitle="Execute, download, and schedule standardised reports" />
      <div className="flex-1 overflow-y-auto p-6">

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-1 bg-bg-secondary border border-border-subtle rounded-xl p-1">
            {([
              { id:'system',    label:'System Reports', icon:Globe },
              { id:'custom',    label:'My Reports',     icon:FileText },
              { id:'templates', label:'Templates',      icon:Bot },
            ] as {id:ReportTab;label:string;icon:typeof Globe}[]).map(({id,label,icon:Icon}) => (
              <button key={id} onClick={() => setTab(id)}
                className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  tab===id ? 'bg-accent text-white shadow' : 'text-white/40 hover:text-white/70')}>
                <Icon size={13}/>{label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary flex items-center gap-2 text-xs"><Plus size={13}/> Create Report</button>
            <button className="btn-secondary flex items-center gap-2 text-xs"><RefreshCw size={13}/> Refresh</button>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-xs">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search reports…"
              className="w-full bg-bg-card border border-border-subtle rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-accent"/>
          </div>
          <select value={category} onChange={e=>setCategory(e.target.value)} className="form-select text-xs">
            {CATEGORIES.map(c=><option key={c}>{c}</option>)}
          </select>
          <span className="text-xs text-white/30">{filtered.length} report{filtered.length!==1?'s':''}</span>
        </div>

        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle">
                {['Report Name','Category','Audience','Description','Last Run','Format','Actions'].map(h=>(
                  <th key={h} className="tbl-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const isRunning = (fmt: string) => running === r.id + fmt
                const anyRunning = isRunning('pdf') || isRunning('xls')
                return (
                  <tr key={r.id} className="tbl-row">
                    <td className="tbl-td">
                      <div className="flex items-center gap-2">
                        <FileText size={13} className={clsx('flex-shrink-0', ['r1','r2','r3','r4','r12','r13'].includes(r.id) ? 'text-accent' : 'text-accent/60')}/>
                        <span className="text-white font-medium text-sm">{r.name}</span>
                        {(r.id==='r1'||r.id==='r2'||r.id==='r3'||r.id==='r4'||r.id==='r12'||r.id==='r13') && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-semibold">LIVE</span>
                        )}
                      </div>
                    </td>
                    <td className="tbl-td">
                      <span className="text-xs bg-bg-secondary border border-border-subtle px-2 py-0.5 rounded-full text-white/50">{r.category}</span>
                    </td>
                    <td className="tbl-td">
                      <span className={r.audience==='Global'?'status-active':'status-pending'}>
                        {r.audience==='Global'?'🌐 Global':'🏢 Client'}
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
                        {hasPDF(r) && (
                          <button onClick={() => exec(r,'pdf')} disabled={anyRunning}
                            className={clsx('btn-sm flex items-center gap-1 whitespace-nowrap', anyRunning?'opacity-50 cursor-wait':'')}>
                            {isRunning('pdf') ? <><RefreshCw size={10} className="animate-spin"/>…</> : <><Printer size={10}/> PDF</>}
                          </button>
                        )}
                        {hasXLS(r) && (
                          <button onClick={() => exec(r,'xls')} disabled={anyRunning}
                            className={clsx('btn-sm flex items-center gap-1 whitespace-nowrap', anyRunning?'opacity-50 cursor-wait':'')}>
                            {isRunning('xls') ? <><RefreshCw size={10} className="animate-spin"/>…</> : <><Download size={10}/> XLS</>}
                          </button>
                        )}
                        {!hasPDF(r) && !hasXLS(r) && (
                          <button onClick={() => exec(r,'pdf')} disabled={anyRunning}
                            className={clsx('btn-sm flex items-center gap-1', anyRunning?'opacity-50 cursor-wait':'')}>
                            <Play size={10}/> Run
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length===0 && (
                <tr><td colSpan={7} className="tbl-td text-center text-white/30 py-8">No reports match your filters</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5 p-4 rounded-xl border border-accent/20 bg-accent/5 flex items-start gap-3">
          <Bot size={16} className="text-accent mt-0.5 flex-shrink-0"/>
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
