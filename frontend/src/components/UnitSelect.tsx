interface UnitSelectProps {
  value: 'kWh' | 'MWh'
  onChange: (u: 'kWh' | 'MWh') => void
  className?: string
}

export function UnitSelect({ value, onChange, className = '' }: UnitSelectProps) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as 'kWh' | 'MWh')}
      className={`bg-bg-card border border-border-subtle text-white/60 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-accent cursor-pointer hover:border-border-default transition-colors ${className}`}
    >
      <option value="kWh">kWh</option>
      <option value="MWh">MWh</option>
    </select>
  )
}
