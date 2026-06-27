import { useState } from 'react'

/**
 * Provides click-to-toggle legend behaviour for Recharts charts.
 * Pass `onClick={onLegendClick}` to <Legend> and `hide={isHidden('key')}` to each <Bar>/<Line>.
 */
export function useLegendToggle() {
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  const onLegendClick = (e: any) => {
    const key: string = e?.dataKey ?? e?.value ?? ''
    if (!key) return
    setHidden(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const isHidden = (key: string) => hidden.has(key)

  return { onLegendClick, isHidden }
}
