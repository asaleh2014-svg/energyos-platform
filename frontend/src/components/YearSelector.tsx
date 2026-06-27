import clsx from 'clsx'

interface Props {
  years: string[]
  selected: Set<string>
  onToggle: (y: string) => void
  onAll: () => void
}

export function YearSelector({ years, selected, onToggle, onAll }: Props) {
  if (years.length < 2) return null
  const allSelected = years.every(y => selected.has(y))

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[10px] text-white/30 uppercase tracking-widest mr-0.5">Years</span>
      {years.map(y => (
        <button
          key={y}
          onClick={() => onToggle(y)}
          className={clsx(
            'px-2 py-0.5 rounded text-[11px] font-mono font-medium border transition-all',
            selected.has(y)
              ? 'bg-accent/20 border-accent/50 text-accent-hover'
              : 'bg-transparent border-border-subtle text-white/25 hover:text-white/50',
          )}
        >
          {y}
        </button>
      ))}
      {!allSelected && (
        <button onClick={onAll} className="text-[10px] text-white/30 hover:text-white/60 underline ml-1">
          All
        </button>
      )}
    </div>
  )
}
