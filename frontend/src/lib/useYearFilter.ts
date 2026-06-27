import { useState, useEffect, useMemo } from 'react'

/** Extract a 4-digit year from various date label formats */
function extractYear(s: string): string {
  if (/^\d{4}$/.test(s)) return s
  if (/^\d{4}-\d{2}/.test(s)) return s.slice(0, 4)
  const long = s.match(/\b(20\d{2})\b/)
  if (long) return long[1]
  const short = s.match(/'(\d{2})$/)
  if (short) return `20${short[1]}`
  return ''
}

export function useYearFilter<T>(
  data: T[],
  /** Function that returns the date string from an item — defaults to (r as any).month */
  keyFn?: (r: T) => string,
) {
  const getKey = keyFn ?? ((r: T) => (r as any).month as string)

  const years = useMemo(
    () => [...new Set(data.map(r => extractYear(getKey(r))).filter(Boolean))].sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.map(r => getKey(r)).join(',')],
  )

  const [selected, setSelected] = useState<Set<string>>(new Set(years))

  useEffect(() => {
    setSelected(prev => {
      const next = new Set(prev)
      years.forEach(y => next.add(y))
      return next
    })
  }, [years.join(',')])

  const toggle = (y: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      next.has(y) ? next.delete(y) : next.add(y)
      return next
    })

  const selectAll  = () => setSelected(new Set(years))
  const selectNone = () => setSelected(new Set())

  const filtered = useMemo(
    () => data.filter(r => {
      const y = extractYear(getKey(r))
      return !y || selected.has(y)
    }),
    [data, selected],
  )

  return { years, selected, toggle, selectAll, selectNone, filtered }
}
