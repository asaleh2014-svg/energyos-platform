import { useState } from 'react'
import type { Site } from '@/types'
import clsx from 'clsx'

interface MapProps {
  sites: Site[]
}

interface TooltipState {
  site: Site
  x: number
  y: number
}

// Approximate lat/lng to SVG coords for UAE viewport
function project(lat: number, lng: number): [number, number] {
  const minLat = 22.5, maxLat = 26.5
  const minLng = 51.5, maxLng = 56.5
  const W = 520, H = 280
  const x = ((lng - minLng) / (maxLng - minLng)) * W
  const y = H - ((lat - minLat) / (maxLat - minLat)) * H
  return [x, y]
}

const STATUS_COLOR: Record<string, string> = {
  Active: '#3b82f6',
  Pending: '#f59e0b',
  Inactive: '#ef4444',
}

export function PortfolioMap({ sites }: MapProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  return (
    <div className="relative w-full h-full bg-[#0d1322] rounded-lg overflow-hidden">
      <svg viewBox="0 0 520 280" className="w-full h-full">
        {/* Background grid */}
        {[1,2,3,4,5].map(i => (
          <line key={`h${i}`} x1="0" y1={i*46} x2="520" y2={i*46} stroke="#ffffff04" strokeWidth="1"/>
        ))}
        {[1,2,3,4,5,6,7].map(i => (
          <line key={`v${i}`} x1={i*74} y1="0" x2={i*74} y2="280" stroke="#ffffff04" strokeWidth="1"/>
        ))}

        {/* UAE landmass - simplified outline */}
        <path
          d="M60,230 L80,225 L110,220 L140,215 L160,210 L180,205 L200,198 L215,192 L230,185
             L248,178 L265,172 L282,168 L298,162 L318,156 L338,150 L358,145 L378,140
             L398,136 L418,132 L440,128 L460,125 L480,122
             L480,260 L60,260 Z"
          fill="#1a2540" stroke="#2a3a5e" strokeWidth="0.8" opacity="0.9"
        />
        {/* Gulf coastline top */}
        <path
          d="M60,180 Q100,170 140,165 Q180,160 220,155 Q260,150 300,148 Q340,146 380,144"
          fill="none" stroke="#3b82f615" strokeWidth="1.5"
        />

        {/* Region labels */}
        <text x="160" y="200" fill="#ffffff20" fontSize="9" fontFamily="DM Sans,sans-serif" textAnchor="middle">Abu Dhabi</text>
        <text x="280" y="175" fill="#ffffff20" fontSize="9" fontFamily="DM Sans,sans-serif" textAnchor="middle">Dubai</text>
        <text x="340" y="162" fill="#ffffff20" fontSize="9" fontFamily="DM Sans,sans-serif" textAnchor="middle">Sharjah</text>
        <text x="420" y="148" fill="#ffffff20" fontSize="9" fontFamily="DM Sans,sans-serif" textAnchor="middle">RAK</text>

        {/* Site dots */}
        {sites.map((site) => {
          const [x, y] = project(site.latitude, site.longitude)
          const color = STATUS_COLOR[site.status] || '#3b82f6'
          return (
            <g
              key={site.id}
              className="cursor-pointer"
              onMouseEnter={(e) => {
                const rect = (e.currentTarget.closest('svg') as SVGElement).getBoundingClientRect()
                setTooltip({ site, x: x / 520 * rect.width, y: y / 280 * rect.height })
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              <circle cx={x} cy={y} r="14" fill={color} opacity="0.08" />
              <circle cx={x} cy={y} r="7" fill={color} opacity="0.75" />
              <circle cx={x} cy={y} r="3" fill="white" opacity="0.9" />
            </g>
          )
        })}

        {/* Legend */}
        <circle cx="20" cy="268" r="4" fill="#3b82f6" opacity="0.8"/>
        <text x="28" y="272" fill="#9ca3c0" fontSize="8" fontFamily="DM Sans,sans-serif">Active</text>
        <circle cx="72" cy="268" r="4" fill="#f59e0b" opacity="0.8"/>
        <text x="80" y="272" fill="#9ca3c0" fontSize="8" fontFamily="DM Sans,sans-serif">Pending</text>
        <circle cx="124" cy="268" r="4" fill="#ef4444" opacity="0.8"/>
        <text x="132" y="272" fill="#9ca3c0" fontSize="8" fontFamily="DM Sans,sans-serif">Inactive</text>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-10 bg-bg-secondary border border-border-default rounded-lg p-3 pointer-events-none min-w-[160px] shadow-xl"
          style={{ left: tooltip.x + 12, top: Math.max(0, tooltip.y - 20) }}
        >
          <div className="text-sm font-semibold text-white mb-1">{tooltip.site.name}</div>
          <div className="text-xs text-white/40">{tooltip.site.city}, {tooltip.site.country}</div>
          <div className="text-xs text-white/40 mt-1">{tooltip.site.connections_count} connections</div>
          <span className={clsx(
            'inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full font-medium',
            tooltip.site.status === 'Active' ? 'bg-success/20 text-success-light' :
            tooltip.site.status === 'Pending' ? 'bg-warning/20 text-warning-light' :
            'bg-danger/20 text-danger-light'
          )}>
            {tooltip.site.status}
          </span>
        </div>
      )}
    </div>
  )
}
