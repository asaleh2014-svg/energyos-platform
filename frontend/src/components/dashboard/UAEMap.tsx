import { useEffect, useRef } from 'react'
import type { Site } from '@/types'
import 'leaflet/dist/leaflet.css'

interface MapProps {
  sites: Site[]
}

const STATUS_COLOR: Record<string, string> = {
  Active:   '#3b82f6',
  Pending:  '#f59e0b',
  Inactive: '#ef4444',
}

export function UAEMap({ sites }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    // Dynamically import Leaflet to avoid SSR issues
    import('leaflet').then(L => {
      // Guard against HMR re-init
      if ((containerRef.current as any)._leaflet_id) return
      const map = L.map(containerRef.current!, {
        center: [24.8, 54.5],
        zoom: 7,
        zoomControl: true,
        attributionControl: false,
      })

      // Dark CartoDB tiles — matches the dark theme
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map)

      // Attribution (small, bottom right)
      L.control.attribution({ prefix: false })
        .addAttribution('© <a href="https://carto.com" target="_blank">CARTO</a> · © <a href="https://www.openstreetmap.org/copyright" target="_blank">OSM</a>')
        .addTo(map)

      // Add site markers
      sites.forEach(site => {
        if (!site.latitude || !site.longitude) return

        const color = STATUS_COLOR[site.status] ?? '#3b82f6'

        const icon = L.divIcon({
          className: '',
          html: `
            <div style="
              width:14px; height:14px;
              background:${color};
              border:2px solid rgba(255,255,255,0.6);
              border-radius:50%;
              box-shadow:0 0 0 4px ${color}33;
              cursor:pointer;
            "></div>
          `,
          iconSize:   [14, 14],
          iconAnchor: [7, 7],
        })

        const marker = L.marker([site.latitude, site.longitude], { icon }).addTo(map)

        marker.bindPopup(`
          <div style="font-family:DM Sans,sans-serif;min-width:160px">
            <div style="font-weight:600;font-size:13px;margin-bottom:4px">${site.name}</div>
            <div style="font-size:11px;color:#94a3b8">${site.city} · ${site.country}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px">${site.connections_count} connections</div>
            <div style="margin-top:6px">
              <span style="
                font-size:10px;font-weight:600;padding:2px 8px;border-radius:999px;
                background:${color}22;color:${color};
              ">${site.status}</span>
            </div>
          </div>
        `, { closeButton: false })
      })

      mapRef.current = map
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Add/update markers when sites change
  useEffect(() => {
    if (!mapRef.current || !sites.length) return
    // Map is already initialised with sites in the first effect
  }, [sites])

  return (
    <div className="relative w-full h-64 rounded-xl overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}
