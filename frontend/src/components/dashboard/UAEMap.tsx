import { useState } from 'react'
import type { Site } from '@/types'

interface MapProps {
  sites: Site[]
}

interface Tooltip {
  x: number
  y: number
  site: Site
}

// Simple equirectangular projection for UAE bounding box
// UAE approx: lon 51.5–56.4, lat 22.6–26.1
const LON_MIN = 51.0, LON_MAX = 56.8
const LAT_MIN = 22.2, LAT_MAX = 26.5
const W = 500, H = 280

function project(lat: number, lon: number): [number, number] {
  const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * W
  const y = H - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * H
  return [x, y]
}

const STATUS_COLOR: Record<string, string> = {
  Active: '#3b82f6',
  Pending: '#f59e0b',
  Inactive: '#ef4444',
}

export function UAEMap({ sites }: MapProps) {
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)

  return (
    <div className="relative w-full h-64 bg-bg-tertiary rounded-xl overflow-hidden">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-full"
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Background */}
        <rect width={W} height={H} fill="#0d1322" />

        {/* Grid lines */}
        {[1,2,3,4].map(i => (
          <line key={`h${i}`} x1={0} y1={H*i/5} x2={W} y2={H*i/5} stroke="#ffffff05" strokeWidth={1} />
        ))}
        {[1,2,3,4].map(i => (
          <line key={`v${i}`} x1={W*i/5} y1={0} x2={W*i/5} y2={H} stroke="#ffffff05" strokeWidth={1} />
        ))}

        {/* UAE rough coastline shape */}
        <path
          d="M60,240 L90,230 L130,238 L170,225 L200,232 L230,218 L260,228 L290,210 L320,220 L355,205 L385,215 L410,200 L440,208 L460,195 L470,210 L470,265 L60,265 Z"
          fill="#1a2540" stroke="#2a3a5e" strokeWidth={0.8} opacity={0.7}
        />

        {/* City labels */}
        {[
          { name: 'Abu Dhabi', lat: 24.2, lon: 54.37 },
          { name: 'Dubai', lat: 25.05, lon: 55.18 },
          { name: 'Sharjah', lat: 25.25, lon: 55.38 },
          { name: 'RAK', lat: 25.6, lon: 55.9 },
        ].map(({ name, lat, lon }) => {
          const [x, y] = project(lat, lon)
          return (
            <text key={name} x={x} y={y} fill="#ffffff25" fontSize={9}
              textAnchor="middle" fontFamily="DM Sans, sans-serif">{name}</text>
          )
        })}

        {/* Site dots */}
        {sites.map(site => {
          const [x, y] = project(site.latitude, site.longitude)
          const color = STATUS_COLOR[site.status] || '#3b82f6'
          return (
            <g
              key={site.id}
              className="cursor-pointer"
              onMouseEnter={(e) => {
                const rect = (e.currentTarget.closest('svg') as SVGElement).getBoundingClientRect()
                setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, site })
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              <circle cx={x} cy={y} r={14} fill={color} opacity={0.08} />
              <circle cx={x} cy={y} r={8} fill={color} opacity={0.2} />
              <circle cx={x} cy={y} r={5} fill={color} opacity={0.85} />
              <circle cx={x} cy={y} r={2} fill="#fff" opacity={0.9} />
            </g>
          )
        })}

        {/* Legend */}
        {[['Active','#3b82f6'],['Pending','#f59e0b'],['Inactive','#ef4444']].map(([label, color], i) => (
          <g key={label} transform={`translate(${12 + i * 80}, ${H - 14})`}>
            <circle r={4} fill={color} opacity={0.85} />
            <text x={8} y={4} fill="#9ca3c0" fontSize={8.5} fontFamily="DM Sans, sans-serif">{label}</text>
          </g>
        ))}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-10 bg-bg-secondary border border-border-default rounded-lg px-3 py-2 pointer-events-none text-xs min-w-[150px]"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <div className="font-semibold text-white mb-1">{tooltip.site.name}</div>
          <div className="text-white/50">{tooltip.site.city} · {tooltip.site.connections_count} connections</div>
          <div className="mt-1">
            <span className={`status-${tooltip.site.status.toLowerCase()}`}>{tooltip.site.status}</span>
          </div>
        </div>
      )}
    </div>
  )
}
