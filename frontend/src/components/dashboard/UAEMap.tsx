import { useEffect, useRef } from 'react'
import type { Site } from '@/types'
import 'leaflet/dist/leaflet.css'

interface Building {
  id: string
  name: string
  site_id: string
  area_m2?: number | null
}

interface MapProps {
  sites: Site[]
  buildings?: Building[]
  onBuildingClick?: (buildingId: string) => void
}

const STATUS_COLOR: Record<string, string> = {
  Active:   '#3b82f6',
  Pending:  '#f59e0b',
  Inactive: '#ef4444',
}

// Offsets in degrees to spread buildings around their site point
const BUILDING_OFFSETS = [
  [0, 0], [0.0012, 0], [-0.0012, 0], [0, 0.0015], [0, -0.0015],
  [0.0009, 0.0009], [-0.0009, 0.0009], [0.0009, -0.0009], [-0.0009, -0.0009],
  [0.0015, 0.0006], [-0.0015, 0.0006],
]

export function UAEMap({ sites, buildings = [], onBuildingClick }: MapProps) {
  const containerRef    = useRef<HTMLDivElement>(null)
  const mapRef          = useRef<any>(null)
  const buildingLayersRef = useRef<any[]>([])
  const defaultViewRef  = useRef<{ center: [number, number]; zoom: number }>({
    center: [24.8, 54.5], zoom: 7,
  })

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    import('leaflet').then(L => {
      if ((containerRef.current as any)._leaflet_id) return

      const map = L.map(containerRef.current!, {
        center: defaultViewRef.current.center,
        zoom: defaultViewRef.current.zoom,
        zoomControl: true,
        attributionControl: false,
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map)

      L.control.attribution({ prefix: false })
        .addAttribution('© <a href="https://carto.com" target="_blank">CARTO</a> · © <a href="https://www.openstreetmap.org/copyright" target="_blank">OSM</a>')
        .addTo(map)

      // Back-to-overview custom control
      const BackControl = L.Control.extend({
        options: { position: 'topright' },
        onAdd() {
          const btn = L.DomUtil.create('button', '')
          btn.innerHTML = '← Overview'
          btn.title = 'Back to portfolio view'
          btn.style.cssText = [
            'background:#1a2535', 'color:#94a3b8', 'border:1px solid #2d4058',
            'border-radius:6px', 'padding:4px 10px', 'font-size:11px',
            'cursor:pointer', 'display:none', 'font-family:DM Sans,sans-serif',
          ].join(';')
          btn.id = 'uaemap-back-btn'
          L.DomEvent.on(btn, 'click', () => {
            map.flyTo(defaultViewRef.current.center, defaultViewRef.current.zoom, { duration: 0.8 })
            buildingLayersRef.current.forEach(l => l.remove())
            buildingLayersRef.current = []
            btn.style.display = 'none'
          })
          return btn
        },
      })
      new BackControl().addTo(map)

      // Site markers
      sites.forEach(site => {
        if (!site.latitude || !site.longitude) return
        const color = STATUS_COLOR[site.status] ?? '#3b82f6'
        const siteBldgs = buildings.filter(b => b.site_id === site.id)

        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width:14px;height:14px;background:${color};
            border:2px solid rgba(255,255,255,0.6);border-radius:50%;
            box-shadow:0 0 0 4px ${color}33;cursor:pointer;
          "></div>`,
          iconSize: [14, 14], iconAnchor: [7, 7],
        })

        const marker = L.marker([site.latitude, site.longitude], { icon }).addTo(map)

        marker.on('click', () => {
          // Zoom into site
          map.flyTo([site.latitude!, site.longitude!], 15, { duration: 0.9 })

          // Remove old building markers
          buildingLayersRef.current.forEach(l => l.remove())
          buildingLayersRef.current = []

          // Show back button
          const btn = document.getElementById('uaemap-back-btn')
          if (btn) btn.style.display = 'block'

          // Add building markers after zoom settles
          setTimeout(() => {
            siteBldgs.forEach((bldg, idx) => {
              const [dlat, dlng] = BUILDING_OFFSETS[idx % BUILDING_OFFSETS.length]
              const blat = site.latitude! + dlat
              const blng = site.longitude! + dlng

              const bIcon = L.divIcon({
                className: '',
                html: `<div style="
                  width:10px;height:10px;background:#10b981;
                  border:2px solid rgba(255,255,255,0.8);border-radius:3px;
                  box-shadow:0 0 0 3px #10b98133;cursor:pointer;
                "></div>`,
                iconSize: [10, 10], iconAnchor: [5, 5],
              })

              const bMarker = L.marker([blat, blng], { icon: bIcon }).addTo(map)

              const popupHtml = `
                <div style="font-family:DM Sans,sans-serif;min-width:160px">
                  <div style="font-weight:600;font-size:13px;margin-bottom:3px">${bldg.name}</div>
                  ${bldg.area_m2 ? `<div style="font-size:11px;color:#94a3b8;margin-bottom:6px">${bldg.area_m2.toLocaleString()} m²</div>` : ''}
                  <button id="goto-bldg-${bldg.id}" style="
                    background:#3b82f6;color:white;border:none;border-radius:5px;
                    padding:4px 10px;font-size:11px;cursor:pointer;font-family:DM Sans,sans-serif;
                  ">View Building →</button>
                </div>
              `
              const popup = L.popup({ closeButton: false, offset: [0, -6] }).setContent(popupHtml)
              bMarker.bindPopup(popup)

              bMarker.on('popupopen', () => {
                const btn = document.getElementById(`goto-bldg-${bldg.id}`)
                if (btn && onBuildingClick) {
                  btn.onclick = () => onBuildingClick(bldg.id)
                }
              })

              buildingLayersRef.current.push(bMarker)
            })

            // If no buildings, show site popup
            if (siteBldgs.length === 0) {
              marker.openPopup()
            }
          }, 900)
        })

        marker.bindPopup(`
          <div style="font-family:DM Sans,sans-serif;min-width:160px">
            <div style="font-weight:600;font-size:13px;margin-bottom:4px">${site.name}</div>
            <div style="font-size:11px;color:#94a3b8">${site.city} · ${site.country}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px">${site.connections_count} connections · ${siteBldgs.length} buildings</div>
            <div style="margin-top:6px">
              <span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:999px;background:${color}22;color:${color}">${site.status}</span>
            </div>
            <div style="font-size:10px;color:#64748b;margin-top:6px">Click marker to zoom in →</div>
          </div>
        `, { closeButton: false })
      })

      mapRef.current = map
    })

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [])

  return (
    <div className="relative w-full h-64 rounded-xl overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}
