/** Nominatim geocoding — free, no API key, max 1 req/s */

const cache = new Map<string, { lat: number; lng: number } | null>()

export async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  if (cache.has(query)) return cache.get(query)!
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`
    const res = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'EnergyOS/1.0' } })
    const data = await res.json()
    const result = data[0] ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null
    cache.set(query, result)
    return result
  } catch {
    return null
  }
}

/** Geocode a list of items that have null lat/lng, persist to DB, return updated list.
 *  `table` = Supabase table name, `queryFn` = builds search string from item.
 *  Uses 1-per-second rate limit to respect Nominatim ToS. */
export async function geocodeMissing<T extends { id: string; latitude: number | null; longitude: number | null }>(
  items: T[],
  queryFn: (item: T) => string,
  patchFn: (id: string, lat: number, lng: number) => Promise<void>,
): Promise<T[]> {
  const result = [...items]
  for (let i = 0; i < result.length; i++) {
    const item = result[i]
    if (item.latitude != null && item.longitude != null) continue
    const coords = await geocode(queryFn(item))
    if (coords) {
      result[i] = { ...item, latitude: coords.lat, longitude: coords.lng }
      await patchFn(item.id, coords.lat, coords.lng)
    }
    if (i < result.length - 1) await new Promise(r => setTimeout(r, 1100))
  }
  return result
}
