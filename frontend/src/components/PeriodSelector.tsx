import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'
import clsx from 'clsx'

// ─── Types ─────────────────────────────────────────────────────────────────────

export type PeriodPreset = 'today' | 'this_month' | 'this_quarter' | 'this_year' | 'last_12m' | 'custom'

export interface Period {
  preset:  PeriodPreset
  from:    Date
  to:      Date
  label:   string
  granularity: 'day' | 'month' | 'quarter' | 'year'
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function startOfDay(d: Date) { const r = new Date(d); r.setHours(0,0,0,0); return r }
function endOfDay(d: Date)   { const r = new Date(d); r.setHours(23,59,59,999); return r }

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function endOfMonth(d: Date)   { return new Date(d.getFullYear(), d.getMonth()+1, 0, 23, 59, 59, 999) }

function startOfQuarter(d: Date) {
  const q = Math.floor(d.getMonth() / 3)
  return new Date(d.getFullYear(), q * 3, 1)
}
function endOfQuarter(d: Date) {
  const q = Math.floor(d.getMonth() / 3)
  return new Date(d.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999)
}

function quarterLabel(d: Date) {
  return `Q${Math.floor(d.getMonth()/3)+1} ${d.getFullYear()}`
}

function fmt(d: Date) {
  return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
}

export function buildPeriod(preset: PeriodPreset, customFrom?: Date, customTo?: Date): Period {
  const now = new Date()
  switch (preset) {
    case 'today':
      return { preset, from: startOfDay(now), to: endOfDay(now), label: 'Today', granularity: 'day' }
    case 'this_month':
      return { preset, from: startOfMonth(now), to: endOfMonth(now),
        label: now.toLocaleDateString('en-GB',{month:'long',year:'numeric'}), granularity: 'month' }
    case 'this_quarter':
      return { preset, from: startOfQuarter(now), to: endOfQuarter(now),
        label: quarterLabel(now), granularity: 'quarter' }
    case 'this_year':
      return { preset, from: new Date(now.getFullYear(),0,1), to: new Date(now.getFullYear(),11,31,23,59,59,999),
        label: String(now.getFullYear()), granularity: 'year' }
    case 'last_12m': {
      const f = new Date(now); f.setFullYear(f.getFullYear()-1); f.setDate(f.getDate()+1)
      return { preset, from: startOfDay(f), to: endOfDay(now), label: 'Last 12 months', granularity: 'month' }
    }
    case 'custom':
      return {
        preset,
        from: customFrom ?? startOfMonth(now),
        to:   customTo   ?? endOfMonth(now),
        label: customFrom && customTo ? `${fmt(customFrom)} – ${fmt(customTo)}` : 'Custom range',
        granularity: 'month',
      }
  }
}

export const DEFAULT_PERIOD = buildPeriod('this_year')

// ─── Preset button strip ───────────────────────────────────────────────────────

const PRESETS: { key: PeriodPreset; label: string }[] = [
  { key: 'today',        label: 'Today'    },
  { key: 'this_month',   label: 'Month'    },
  { key: 'this_quarter', label: 'Quarter'  },
  { key: 'this_year',    label: 'Year'     },
  { key: 'last_12m',     label: '12 M'     },
  { key: 'custom',       label: 'Custom'   },
]

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const QUARTERS = ['Q1','Q2','Q3','Q4']
const YEARS = Array.from({length:10},(_,i)=> new Date().getFullYear() - i)

// ─── Main component ────────────────────────────────────────────────────────────

interface Props {
  value:    Period
  onChange: (p: Period) => void
  compact?: boolean   // if true, just show the label + chevron (no preset strip)
}

export function PeriodSelector({ value, onChange, compact = false }: Props) {
  const [open, setOpen] = useState(false)
  const [tab,  setTab]  = useState<'preset'|'month'|'quarter'|'year'|'custom'>('preset')
  const [customFrom, setCustomFrom] = useState<string>('')
  const [customTo,   setCustomTo]   = useState<string>('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function applyPreset(key: PeriodPreset) {
    onChange(buildPeriod(key))
    if (key !== 'custom') setOpen(false)
  }

  function applyCustom() {
    if (!customFrom || !customTo) return
    onChange(buildPeriod('custom', new Date(customFrom), new Date(customTo)))
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className={clsx(
          'flex items-center gap-1.5 text-xs border border-border-default rounded-lg px-2.5 py-1.5 transition-colors',
          open ? 'border-accent text-white bg-accent/10' : 'text-white/60 hover:text-white hover:border-white/30'
        )}
      >
        <Calendar size={11} />
        <span className="font-medium">{value.label}</span>
        <ChevronDown size={10} className={clsx('transition-transform', open && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-[300px] bg-bg-secondary border border-border-subtle rounded-xl shadow-2xl z-50 overflow-hidden">

          {/* Tab strip */}
          <div className="flex border-b border-border-subtle">
            {(['preset','month','quarter','year','custom'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={clsx(
                  'flex-1 text-[10px] font-semibold uppercase tracking-wider py-2 transition-colors',
                  tab === t ? 'text-accent border-b-2 border-accent' : 'text-white/30 hover:text-white/60'
                )}>
                {t === 'preset' ? 'Quick' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div className="p-3">

            {/* Quick presets */}
            {tab === 'preset' && (
              <div className="grid grid-cols-3 gap-1.5">
                {PRESETS.filter(p => p.key !== 'custom').map(p => (
                  <button key={p.key} onClick={() => applyPreset(p.key)}
                    className={clsx(
                      'text-xs py-2 rounded-lg border transition-colors font-medium',
                      value.preset === p.key
                        ? 'bg-accent border-accent text-white'
                        : 'border-border-subtle text-white/60 hover:text-white hover:border-white/30'
                    )}>
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            {/* Month picker */}
            {tab === 'month' && <MonthPicker value={value} onChange={p => { onChange(p); setOpen(false) }} />}

            {/* Quarter picker */}
            {tab === 'quarter' && <QuarterPicker value={value} onChange={p => { onChange(p); setOpen(false) }} />}

            {/* Year picker */}
            {tab === 'year' && (
              <div className="grid grid-cols-3 gap-1.5">
                {YEARS.map(y => (
                  <button key={y} onClick={() => { onChange(buildPeriod('this_year')); setOpen(false) }}
                    className={clsx(
                      'text-xs py-2 rounded-lg border font-mono transition-colors',
                      value.preset === 'this_year' && value.from.getFullYear() === y
                        ? 'bg-accent border-accent text-white'
                        : 'border-border-subtle text-white/60 hover:text-white hover:border-white/30'
                    )}>
                    {y}
                  </button>
                ))}
              </div>
            )}

            {/* Custom range */}
            {tab === 'custom' && (
              <div className="space-y-2">
                <div>
                  <div className="text-[10px] text-white/40 mb-1">From</div>
                  <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                    className="w-full bg-bg-card border border-border-subtle text-white/80 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <div className="text-[10px] text-white/40 mb-1">To</div>
                  <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                    className="w-full bg-bg-card border border-border-subtle text-white/80 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-accent" />
                </div>
                <button onClick={applyCustom} disabled={!customFrom || !customTo}
                  className="w-full bg-accent hover:bg-accent-hover text-white text-xs rounded-lg py-2 font-medium transition-colors disabled:opacity-40">
                  Apply
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}

// ─── Month picker sub-component ────────────────────────────────────────────────

function MonthPicker({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const [year, setYear] = useState(new Date().getFullYear())
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setYear(y => y-1)} className="text-white/40 hover:text-white px-2 text-sm">‹</button>
        <span className="text-xs font-semibold text-white">{year}</span>
        <button onClick={() => setYear(y => y+1)} className="text-white/40 hover:text-white px-2 text-sm">›</button>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {MONTHS.map((m, i) => {
          const from = new Date(year, i, 1)
          const to   = new Date(year, i+1, 0, 23, 59, 59, 999)
          const active = value.preset === 'this_month'
            && value.from.getFullYear() === year
            && value.from.getMonth() === i
          return (
            <button key={m}
              onClick={() => onChange({ preset:'this_month', from, to,
                label: from.toLocaleDateString('en-GB',{month:'long',year:'numeric'}),
                granularity:'month' })}
              className={clsx('text-[11px] py-1.5 rounded-lg border transition-colors',
                active ? 'bg-accent border-accent text-white'
                       : 'border-border-subtle text-white/60 hover:text-white hover:border-white/30')}>
              {m}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Quarter picker sub-component ─────────────────────────────────────────────

function QuarterPicker({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const [year, setYear] = useState(new Date().getFullYear())
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setYear(y => y-1)} className="text-white/40 hover:text-white px-2 text-sm">‹</button>
        <span className="text-xs font-semibold text-white">{year}</span>
        <button onClick={() => setYear(y => y+1)} className="text-white/40 hover:text-white px-2 text-sm">›</button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {QUARTERS.map((q, i) => {
          const from = new Date(year, i*3, 1)
          const to   = new Date(year, i*3+3, 0, 23, 59, 59, 999)
          const active = value.preset === 'this_quarter'
            && value.from.getFullYear() === year
            && Math.floor(value.from.getMonth()/3) === i
          return (
            <button key={q}
              onClick={() => onChange({ preset:'this_quarter', from, to,
                label:`${q} ${year}`, granularity:'quarter' })}
              className={clsx('text-xs py-2.5 rounded-lg border font-semibold transition-colors',
                active ? 'bg-accent border-accent text-white'
                       : 'border-border-subtle text-white/60 hover:text-white hover:border-white/30')}>
              {q}
            </button>
          )
        })}
      </div>
    </div>
  )
}
