import { useState, useEffect } from 'react'
import { X, ChevronDown, ChevronRight, Plus, Leaf, RotateCcw } from 'lucide-react'
import clsx from 'clsx'
import type { FullConnection } from '@/lib/connectionsData'
import {
  PRODUCTS, STATUSES, SUPPLIERS, GRID_OPERATORS, MEAS_COMPANIES,
  CONN_TYPES, DEPARTMENTS, BUILDINGS, MARKET_SEGS, MONITORINGS,
  CHARACTERISTICS, USAGE_CATS, TAX_CLUSTERS, CLIENTS,
} from '@/lib/connectionsData'
import {
  type EnergyMix, resolveConnectionMix, MIX_LABELS, MIX_COLORS,
  mixEmissionFactor, cityMix,
} from '@/lib/energyMix'

// ─── Form field components ─────────────────────────────────────────────────────

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.5 min-h-[28px]">
      <label className="w-[148px] min-w-[148px] text-[10px] text-white/35 pt-1.5 leading-tight">{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  )
}

const inputCls = 'w-full bg-bg-card border border-border-subtle text-white/80 text-[11px] rounded-lg px-2.5 py-1 focus:outline-none focus:border-accent placeholder-white/20 transition-colors'
const selectCls = 'w-full bg-bg-card border border-border-subtle text-white/80 text-[11px] rounded-lg px-2.5 py-1 focus:outline-none focus:border-accent transition-colors cursor-pointer'

function TInput({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input type={type} className={inputCls} placeholder={placeholder}
      value={value} onChange={e => onChange(e.target.value)} />
  )
}

function TSelect({ value, onChange, options, placeholder = 'Select…' }: {
  value: string; onChange: (v: string) => void; options: readonly string[]; placeholder?: string
}) {
  return (
    <select className={selectCls} value={value} onChange={e => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function TCheckbox({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input type="checkbox" className="accent-accent w-3.5 h-3.5"
        checked={value} onChange={e => onChange(e.target.checked)} />
      <span className="text-[11px] text-white/60">{label}</span>
    </label>
  )
}

// ─── Collapsible section ───────────────────────────────────────────────────────

function Section({ title, defaultOpen = true, children }: {
  title: string; defaultOpen?: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-border-subtle">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition-colors"
      >
        <span className="text-xs font-semibold text-accent-hover uppercase tracking-widest">{title}</span>
        {open
          ? <ChevronDown size={13} className="text-white/40" />
          : <ChevronRight size={13} className="text-white/40" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

// ─── Empty form state ──────────────────────────────────────────────────────────

type FormData = Omit<FullConnection, 'id' | 'latitude' | 'longitude'> & {
  mix_override: EnergyMix | null
}

const EMPTY: FormData = {
  product: 'Electricity', client: '', department: '', name: '', ean_code: '',
  address: '', street: '', house_number: '', addition: '', postcode: '', city: '',
  cost_center: '', status: 'Active', supplier: '', grid_operator: '', measurement_company: '',
  connection_type: '', building: '', market_segment: '', monitoring: '', characteristic: '',
  usage_category: '', usage_type: '', tax_cluster: '', object_code: '', allocation_type: '',
  responsible: '', requested_by: '', contact_person: '', invoice_address: '',
  active_since: '', contract: '', energy_label: '', market_seg_code: '', telemetry: '',
  connection_value: '', profile_category: '', connection_start: '', vacancy: false,
  active_on: '', supplier_contract: '', usage_low: 0, usage_normal: 0, target_usage: 0,
  monitoring_type: '', monitoring_start: '', data_available: '', tax_cluster_label: '',
  rubricering: '', costs: '', gps: '', meter_number: '', meter_install: '',
  reading_normal: 0, reading_low: 0, reading_date: '', remarks: '',
  mix_override: null,
}

// ─── Main component ────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
  onSave: (conn: FullConnection) => void
}

export default function AddConnectionPanel({ onClose, onSave }: Props) {
  const [form, setForm] = useState<FormData>(EMPTY)

  const f = <K extends keyof FormData>(key: K) => (val: FormData[K]) =>
    setForm(prev => ({ ...prev, [key]: val }))

  // Auto-resolve mix when city changes and no manual override
  const resolved = resolveConnectionMix({
    connectionMixOverride: form.mix_override,
    city: form.city || undefined,
  })
  const activeMix = resolved.mix

  // When city is filled in and no override exists, sync city mix into preview
  useEffect(() => {
    if (!form.mix_override && form.city) {
      // no-op: resolved is computed above reactively
    }
  }, [form.city, form.mix_override])

  const emissionFactor = mixEmissionFactor(activeMix)
  const annualCO2 = ((form.usage_normal + form.usage_low) * emissionFactor / 1000).toFixed(1)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const { mix_override, ...rest } = form
    const newConn: FullConnection = {
      ...rest,
      id: `conn-${Date.now()}`,
      latitude: 25.2048,
      longitude: 55.2708,
    }
    onSave(newConn)
  }

  const PRODUCT_COLOR: Record<string, string> = {
    Electricity: '#10b981', Gas: '#f59e0b', Water: '#3b82f6',
  }
  const color = PRODUCT_COLOR[form.product] ?? '#6b7280'

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <form
        onSubmit={handleSubmit}
        className="relative z-10 flex flex-col w-full max-w-[700px] bg-bg-secondary shadow-2xl border-l border-border-subtle"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #0d3d4a 0%, #0a2a33 100%)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: `${color}25`, border: `1px solid ${color}40` }}>
              <Plus size={17} style={{ color }} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Add Connection</h2>
              <p className="text-[11px] text-white/40">Fill in all relevant fields to register a new connection</p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          <Section title="Client">
            <Row label="Client">
              <TSelect value={form.client} onChange={f('client')} options={CLIENTS} />
            </Row>
            <Row label="Department">
              <TSelect value={form.department} onChange={f('department')} options={DEPARTMENTS} />
            </Row>
            <Row label="Name on account">
              <TInput value={form.name} onChange={f('name')} placeholder="Connection display name" />
            </Row>
            <Row label="Invoice address">
              <TInput value={form.invoice_address} onChange={f('invoice_address')} placeholder="e.g. PO Box 12, Dubai" />
            </Row>
            <Row label="Responsible">
              <TInput value={form.responsible} onChange={f('responsible')} placeholder="Name" />
            </Row>
            <Row label="Requested by">
              <TInput value={form.requested_by} onChange={f('requested_by')} placeholder="Name" />
            </Row>
            <Row label="Contact person">
              <TInput value={form.contact_person} onChange={f('contact_person')} placeholder="Name" />
            </Row>
          </Section>

          <Section title="Connection">
            <Row label="Product">
              <TSelect value={form.product} onChange={v => f('product')(v as FormData['product'])} options={PRODUCTS} />
            </Row>
            <Row label="EAN code">
              <TInput value={form.ean_code} onChange={f('ean_code')} placeholder="e.g. 971-4-BBY-882100" />
            </Row>
            <Row label="Object code">
              <TInput value={form.object_code} onChange={f('object_code')} placeholder="e.g. 000966-001" />
            </Row>
            <Row label="Allocation type">
              <TInput value={form.allocation_type} onChange={f('allocation_type')} placeholder="e.g. Primary" />
            </Row>
            <Row label="Characteristic">
              <TSelect value={form.characteristic} onChange={f('characteristic')} options={CHARACTERISTICS} />
            </Row>
            <Row label="Connection type">
              <TSelect value={form.connection_type} onChange={f('connection_type')} options={CONN_TYPES} />
            </Row>
            <Row label="Connection value">
              <TInput value={form.connection_value} onChange={f('connection_value')} placeholder="e.g. 3x250A" />
            </Row>
            <Row label="Profile category">
              <TInput value={form.profile_category} onChange={f('profile_category')} placeholder="e.g. E2B" />
            </Row>
            <Row label="Status">
              <TSelect value={form.status} onChange={v => f('status')(v as FormData['status'])} options={STATUSES} />
            </Row>
          </Section>

          <Section title="Address & Location">
            <Row label="Street">
              <TInput value={form.street} onChange={f('street')} placeholder="Street name" />
            </Row>
            <Row label="House number">
              <TInput value={form.house_number} onChange={f('house_number')} placeholder="Number" />
            </Row>
            <Row label="Addition">
              <TInput value={form.addition} onChange={f('addition')} placeholder="Addition / unit" />
            </Row>
            <Row label="Postcode">
              <TInput value={form.postcode} onChange={f('postcode')} placeholder="Postcode" />
            </Row>
            <Row label="City">
              <TInput value={form.city} onChange={f('city')} placeholder="City" />
            </Row>
            <Row label="GPS">
              <TInput value={form.gps} onChange={f('gps')} placeholder="e.g. 25.1865, 55.2632" />
            </Row>
          </Section>

          <Section title="Building" defaultOpen={false}>
            <Row label="Building">
              <TSelect value={form.building} onChange={f('building')} options={BUILDINGS} />
            </Row>
            <Row label="Energy label">
              <TSelect value={form.energy_label} onChange={f('energy_label')}
                options={['A++','A+','A','B','C','D','E','F','G']} />
            </Row>
          </Section>

          <Section title="Characteristics" defaultOpen={false}>
            <Row label="Usage category">
              <TSelect value={form.usage_category} onChange={f('usage_category')} options={USAGE_CATS} />
            </Row>
            <Row label="Usage type">
              <TInput value={form.usage_type} onChange={f('usage_type')} placeholder="e.g. Standard" />
            </Row>
            <Row label="Market segment code">
              <TInput value={form.market_seg_code} onChange={f('market_seg_code')} placeholder="e.g. KV" />
            </Row>
            <Row label="Monitoring">
              <TSelect value={form.monitoring} onChange={f('monitoring')} options={MONITORINGS} />
            </Row>
            <Row label="Market segment">
              <TSelect value={form.market_segment} onChange={f('market_segment')} options={MARKET_SEGS} />
            </Row>
          </Section>

          <Section title="Grid Management" defaultOpen={false}>
            <Row label="Grid operator">
              <TSelect value={form.grid_operator} onChange={f('grid_operator')} options={GRID_OPERATORS} />
            </Row>
            <Row label="Telemetry">
              <TSelect value={form.telemetry} onChange={f('telemetry')} options={['Yes','No']} />
            </Row>
            <Row label="Connection start">
              <TInput value={form.connection_start} onChange={f('connection_start')} placeholder="dd-mm-yyyy" type="text" />
            </Row>
          </Section>

          <Section title="Supplier" defaultOpen={false}>
            <Row label="Supplier">
              <TSelect value={form.supplier} onChange={f('supplier')} options={SUPPLIERS} />
            </Row>
            <Row label="Supplier contract">
              <TInput value={form.supplier_contract} onChange={f('supplier_contract')} placeholder="Contract name/ref" />
            </Row>
            <Row label="Contract">
              <TInput value={form.contract} onChange={f('contract')} placeholder="Contract ref" />
            </Row>
            <Row label="Active since">
              <TInput value={form.active_since} onChange={f('active_since')} placeholder="dd-mm-yyyy" />
            </Row>
            <Row label="Active on">
              <TInput value={form.active_on} onChange={f('active_on')} placeholder="dd-mm-yyyy" />
            </Row>
            <Row label="Vacancy">
              <TCheckbox value={form.vacancy} onChange={f('vacancy')} label="Mark as vacancy" />
            </Row>
          </Section>

          <Section title="Consumption" defaultOpen={false}>
            <Row label="Usage low (kWh/yr)">
              <TInput value={form.usage_low === 0 ? '' : String(form.usage_low)} onChange={v => f('usage_low')(Number(v) || 0)} placeholder="0" type="number" />
            </Row>
            <Row label="Usage normal (kWh/yr)">
              <TInput value={form.usage_normal === 0 ? '' : String(form.usage_normal)} onChange={v => f('usage_normal')(Number(v) || 0)} placeholder="0" type="number" />
            </Row>
            <Row label="Target usage (kWh/yr)">
              <TInput value={form.target_usage === 0 ? '' : String(form.target_usage)} onChange={v => f('target_usage')(Number(v) || 0)} placeholder="0" type="number" />
            </Row>
          </Section>

          <Section title="Monitoring" defaultOpen={false}>
            <Row label="Measurement company">
              <TSelect value={form.measurement_company} onChange={f('measurement_company')} options={MEAS_COMPANIES} />
            </Row>
            <Row label="Monitoring type">
              <TInput value={form.monitoring_type} onChange={f('monitoring_type')} placeholder="e.g. Detail consumption" />
            </Row>
            <Row label="Monitoring start">
              <TInput value={form.monitoring_start} onChange={f('monitoring_start')} placeholder="dd-mm-yyyy" />
            </Row>
            <Row label="Available data">
              <TInput value={form.data_available} onChange={f('data_available')} placeholder="Description" />
            </Row>
          </Section>

          <Section title="Meter" defaultOpen={false}>
            <Row label="Meter number">
              <TInput value={form.meter_number} onChange={f('meter_number')} placeholder="e.g. E0079000036100001" />
            </Row>
            <Row label="Installation date">
              <TInput value={form.meter_install} onChange={f('meter_install')} placeholder="dd-mm-yyyy" />
            </Row>
            <Row label="Reading normal">
              <TInput value={form.reading_normal === 0 ? '' : String(form.reading_normal)} onChange={v => f('reading_normal')(Number(v) || 0)} placeholder="0" type="number" />
            </Row>
            <Row label="Reading low">
              <TInput value={form.reading_low === 0 ? '' : String(form.reading_low)} onChange={v => f('reading_low')(Number(v) || 0)} placeholder="0" type="number" />
            </Row>
            <Row label="Reading date">
              <TInput value={form.reading_date} onChange={f('reading_date')} placeholder="dd-mm-yyyy" />
            </Row>
          </Section>

          <Section title="Financial" defaultOpen={false}>
            <Row label="Tax cluster">
              <TSelect value={form.tax_cluster} onChange={f('tax_cluster')} options={TAX_CLUSTERS} />
            </Row>
            <Row label="Tax cluster label">
              <TInput value={form.tax_cluster_label} onChange={f('tax_cluster_label')} placeholder="e.g. Commercial (VAT 5%)" />
            </Row>
            <Row label="Cost center">
              <TInput value={form.cost_center} onChange={f('cost_center')} placeholder="e.g. 5801009-38001" />
            </Row>
            <Row label="Rubricering">
              <TInput value={form.rubricering} onChange={f('rubricering')} placeholder="e.g. 263749 Office - Debtor" />
            </Row>
            <Row label="Costs">
              <TInput value={form.costs} onChange={f('costs')} placeholder="e.g. Own contract" />
            </Row>
          </Section>

          <Section title="Energy Mix & CO₂" defaultOpen={false}>
            {/* Resolved source banner */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                <Leaf size={10} className="text-green-400" />
                <span>Source: <span className="text-accent-hover">{resolved.label}</span></span>
              </div>
              {form.mix_override && (
                <button type="button"
                  onClick={() => f('mix_override')(null)}
                  className="flex items-center gap-1 text-[10px] text-white/40 hover:text-accent-hover transition-colors">
                  <RotateCcw size={9} /> Reset to default
                </button>
              )}
            </div>

            {/* Mix sliders */}
            {(Object.keys(MIX_LABELS) as (keyof EnergyMix)[]).map(key => {
              const val = activeMix[key]
              const isOverride = !!form.mix_override
              return (
                <div key={key} className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-white/50">{MIX_LABELS[key]}</span>
                    <span className="text-[10px] font-mono text-white/70">{val}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${val}%`, background: MIX_COLORS[key] }} />
                    </div>
                    <input type="range" min={0} max={100} value={val}
                      onChange={e => {
                        const newMix = { ...(form.mix_override ?? activeMix), [key]: Number(e.target.value) }
                        f('mix_override')(newMix)
                      }}
                      className="w-20 accent-accent cursor-pointer"
                    />
                  </div>
                  {!isOverride && (
                    <div className="text-[9px] text-white/20 mt-0.5">Click slider to override</div>
                  )}
                </div>
              )
            })}

            {/* CO2 preview */}
            <div className="mt-4 bg-bg-card rounded-xl p-3 border border-border-subtle">
              <div className="text-[10px] text-white/40 mb-2 uppercase tracking-widest">CO₂ Estimate</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] text-white/35 mb-0.5">Emission factor</div>
                  <div className="text-sm font-bold text-white">
                    {(emissionFactor * 1000).toFixed(0)}
                    <span className="text-[10px] font-normal text-white/40 ml-1">gCO₂/kWh</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-white/35 mb-0.5">Est. annual CO₂</div>
                  <div className="text-sm font-bold text-green-400">
                    {form.usage_normal + form.usage_low > 0 ? annualCO2 : '—'}
                    <span className="text-[10px] font-normal text-white/40 ml-1">tCO₂/yr</span>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          <Section title="Comments" defaultOpen={false}>
            <textarea
              className={clsx(inputCls, 'resize-none h-24')}
              placeholder="Any remarks about this connection…"
              value={form.remarks}
              onChange={e => f('remarks')(e.target.value)}
            />
          </Section>

          <div className="h-4" />
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border-subtle bg-bg-primary/40 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-white/60 hover:text-white border border-border-default rounded-lg transition-colors">
            Cancel
          </button>
          <button type="submit"
            className="px-5 py-2 text-sm bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors flex items-center gap-2">
            <Plus size={14} /> Save Connection
          </button>
        </div>
      </form>
    </div>
  )
}
