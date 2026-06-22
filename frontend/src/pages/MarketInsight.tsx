import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useAppStore } from '@/lib/store'
import { MARKET_CONFIGS , getMarketConfig } from '@/types'
import { ChartCard } from '@/components/ChartCard'
import { TrendingUp, TrendingDown, Minus, Zap, Flame, Droplets } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from 'recharts'
import clsx from 'clsx'

const TT = { background: '#111520', border: '1px solid #ffffff20', borderRadius: 8, fontSize: 12 }

// Mock electricity spot price data (AED/kWh) – 12 months
const ELEC_PRICES = [0.439, 0.441, 0.436, 0.448, 0.452, 0.461, 0.475, 0.468, 0.454, 0.447, 0.443, 0.440]
const GAS_PRICES  = [0.285, 0.288, 0.282, 0.291, 0.295, 0.299, 0.306, 0.301, 0.296, 0.290, 0.287, 0.284]
const MONTHS      = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const priceData = MONTHS.map((m, i) => ({
  month: m,
  electricity: ELEC_PRICES[i],
  gas: GAS_PRICES[i],
  forecast_elec: i >= 9 ? Number((ELEC_PRICES[i] * (1 + (i - 9) * 0.008)).toFixed(3)) : null,
}))

// Tariff comparison table
const UTILITIES = [
  { name: 'DEWA',     region: 'Dubai',       elec: 0.440, dist: 0.055, cap: 12.00, muni: 10.00, green: true  },
  { name: 'ADWEA',    region: 'Abu Dhabi',   elec: 0.410, dist: 0.048, cap: 11.50, muni: 10.00, green: false },
  { name: 'SEWA',     region: 'Sharjah',     elec: 0.425, dist: 0.052, cap: 11.80, muni: 10.00, green: false },
  { name: 'FEWA',     region: 'N. Emirates', elec: 0.435, dist: 0.058, cap: 12.20, muni: 10.00, green: false },
  { name: 'RAKIA',    region: 'RAK',         elec: 0.420, dist: 0.050, cap: 11.60, muni: 10.00, green: true  },
]

// Market news
const NEWS = [
  {
    date: 'Jun 2026',
    category: 'Regulation',
    color: '#3b82f6',
    title: 'UAE Mandatory Smart Meter Rollout Extended to Q4 2026',
    body: 'DEWA and SEWA announced a joint extension of the smart meter installation deadline for commercial properties above 500 kW contracted capacity, giving operators until December 2026 to comply.',
  },
  {
    date: 'May 2026',
    category: 'Pricing',
    color: '#f59e0b',
    title: 'Summer Electricity Tariff Surcharge Active Jun–Sep',
    body: 'A seasonal peak surcharge of +0.018 AED/kWh applies to commercial consumption above 10,000 kWh/month during June–September 2026, consistent with prior-year summer uplift.',
  },
  {
    date: 'May 2026',
    category: 'ESG',
    color: '#10b981',
    title: 'UAE Net Zero 2050: Green Building Retrofit Incentives',
    body: 'New government subsidy programme offers up to AED 120,000 in grants for commercial properties achieving LEED Silver or higher certification through energy efficiency retrofits.',
  },
  {
    date: 'Apr 2026',
    category: 'Gas',
    color: '#f97316',
    title: 'Natural Gas Price Stability Through H1 2026',
    body: 'ADNOC Gas confirmed contracted commercial rates remain unchanged at 0.285–0.295 AED/m³ through June 2026, with mid-year review anticipated to follow global LNG spot trends.',
  },
]

type Utility = typeof UTILITIES[0]

export default function MarketInsight() {
  const { market } = useAppStore()
  const cfg = getMarketConfig(market)
  const [activeUtil, setActiveUtil] = useState<Utility | null>(null)

  const currentElec = ELEC_PRICES[ELEC_PRICES.length - 1]
  const prevElec    = ELEC_PRICES[ELEC_PRICES.length - 2]
  const currentGas  = GAS_PRICES[GAS_PRICES.length - 1]
  const prevGas     = GAS_PRICES[GAS_PRICES.length - 2]
  const elecChange  = ((currentElec - prevElec) / prevElec * 100)
  const gasChange   = ((currentGas  - prevGas)  / prevGas  * 100)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Market Insight" subtitle="Energy pricing intelligence · UAE market" />
      <div className="flex-1 overflow-y-auto p-6">

        {/* ── KPI banner ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <PriceCard
            label="Electricity (DEWA)"
            value={`${cfg.currencySymbol} ${currentElec.toFixed(3)}`}
            unit="/kWh"
            change={elecChange}
            icon={<Zap size={14} className="text-blue-400" />}
          />
          <PriceCard
            label="Natural Gas"
            value={`${cfg.currencySymbol} ${currentGas.toFixed(3)}`}
            unit="/m³"
            change={gasChange}
            icon={<Flame size={14} className="text-amber-400" />}
          />
          <PriceCard
            label="Water (DEWA)"
            value={`${cfg.currencySymbol} 0.0089`}
            unit="/litre"
            change={0}
            icon={<Droplets size={14} className="text-cyan-400" />}
          />
          <div className="card">
            <div className="label mb-1">Summer Surcharge</div>
            <div className="text-xl font-semibold text-warning-light">+0.018 {cfg.currencySymbol}</div>
            <div className="text-xs text-white/40 mt-1">Active Jun–Sep · commercial &gt;10 MWh/mo</div>
          </div>
        </div>

        {/* ── Price trend chart ─────────────────────────────────────────────── */}
        <ChartCard
          title="Electricity & Gas Price Trend — 12 Month"
          subtitle="AED per kWh (electricity) · AED per m³ (gas) · dotted = Q4 forecast"
          className="mb-4"
          table={
            <table className="w-full">
              <thead><tr>
                <th className="tbl-th">Month</th>
                <th className="tbl-th">Electricity (AED/kWh)</th>
                <th className="tbl-th">Gas (AED/m³)</th>
              </tr></thead>
              <tbody>
                {priceData.map(r => (
                  <tr key={r.month} className="tbl-row">
                    <td className="tbl-td text-white/70">{r.month}</td>
                    <td className="tbl-td text-blue-300 font-mono">{r.electricity.toFixed(3)}</td>
                    <td className="tbl-td text-amber-300 font-mono">{r.gas.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={priceData} margin={{ top: 5, right: 20, left: -5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="month" tick={{ fill: '#5a6385', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="elec" tick={{ fill: '#5a6385', fontSize: 10 }} axisLine={false} tickLine={false}
                domain={[0.38, 0.52]} tickFormatter={v => v.toFixed(2)} />
              <YAxis yAxisId="gas" orientation="right" tick={{ fill: '#5a6385', fontSize: 10 }}
                axisLine={false} tickLine={false} domain={[0.25, 0.34]} tickFormatter={v => v.toFixed(2)} />
              <Tooltip contentStyle={TT}
                formatter={(v: number, name: string) => [
                  `AED ${v.toFixed(3)}`,
                  name === 'electricity' ? '⚡ Electricity' : name === 'gas' ? '🔥 Gas' : '⚡ Elec Forecast',
                ]} />
              <ReferenceLine yAxisId="elec" y={currentElec} stroke="#3b82f620" strokeDasharray="4 4" />
              <Line yAxisId="elec" type="monotone" dataKey="electricity" name="electricity"
                stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3, fill: '#3b82f6' }} connectNulls={false} />
              <Line yAxisId="elec" type="monotone" dataKey="forecast_elec" name="forecast_elec"
                stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3, fill: '#3b82f6' }} connectNulls={false} />
              <Line yAxisId="gas" type="monotone" dataKey="gas" name="gas"
                stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3, fill: '#f59e0b' }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* ── Tariff comparison ──────────────────────────────────────────── */}
          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-border-subtle">
              <h2 className="section-title">UAE Utility Tariff Comparison 2026</h2>
              <p className="text-xs text-white/30 mt-0.5">Click a row to expand details</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  {['Utility', 'Region', 'Elec (AED/kWh)', 'Dist / Net', 'Cap Charge', 'Green'].map(h => (
                    <th key={h} className="tbl-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {UTILITIES.map(u => (
                  <tr key={u.name}
                    onClick={() => setActiveUtil(activeUtil?.name === u.name ? null : u)}
                    className={clsx('tbl-row cursor-pointer', activeUtil?.name === u.name && 'bg-accent/10')}>
                    <td className="tbl-td text-white font-semibold">{u.name}</td>
                    <td className="tbl-td text-white/60">{u.region}</td>
                    <td className="tbl-td text-blue-300 font-mono">{u.elec.toFixed(3)}</td>
                    <td className="tbl-td text-white/50 font-mono">{u.dist.toFixed(3)}</td>
                    <td className="tbl-td text-white/50 font-mono">{u.cap.toFixed(2)}</td>
                    <td className="tbl-td">{u.green ? <span className="status-active">✓ Green</span> : <span className="text-white/30 text-xs">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {activeUtil && (
              <div className="px-5 py-3 bg-bg-secondary border-t border-border-subtle text-xs space-y-1">
                <p className="text-white/50 font-medium">{activeUtil.name} — {activeUtil.region} Tariff Detail</p>
                <p className="text-white/40">Electricity commodity: {cfg.currencySymbol} {activeUtil.elec.toFixed(3)}/kWh</p>
                <p className="text-white/40">Distribution / Network: {cfg.currencySymbol} {activeUtil.dist.toFixed(3)}/kWh</p>
                <p className="text-white/40">Capacity charge: {cfg.currencySymbol} {activeUtil.cap.toFixed(2)}/kVA/month</p>
                <p className="text-white/40">Municipality tax: {activeUtil.muni.toFixed(0)}% of commodity</p>
                <p className="text-white/40">VAT: 5% (federal)</p>
                {activeUtil.green && <p className="text-success-light">✓ Renewable energy certificates available</p>}
              </div>
            )}
          </div>

          {/* ── Market news ──────────────────────────────────────────────── */}
          <div className="card">
            <h2 className="section-title mb-4">Market Commentary</h2>
            <div className="space-y-4">
              {NEWS.map((n, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center gap-1 pt-0.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: n.color }} />
                    {i < NEWS.length - 1 && <div className="w-px flex-1 min-h-[24px]" style={{ background: n.color + '30' }} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: n.color }}>{n.category}</span>
                      <span className="text-[10px] text-white/25">{n.date}</span>
                    </div>
                    <p className="text-xs font-medium text-white/80 mb-0.5">{n.title}</p>
                    <p className="text-[11px] text-white/40 leading-relaxed">{n.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function PriceCard({ label, value, unit, change, icon }: {
  label: string; value: string; unit: string; change: number; icon: React.ReactNode
}) {
  const up    = change > 0.05
  const down  = change < -0.05
  const color = up ? 'text-danger-light' : down ? 'text-success-light' : 'text-white/40'
  const Icon  = up ? TrendingUp : down ? TrendingDown : Minus
  return (
    <div className="card">
      <div className="label mb-1 flex items-center gap-1.5">{icon} {label}</div>
      <div className="text-xl font-semibold text-white">
        {value} <span className="text-sm font-normal text-white/30">{unit}</span>
      </div>
      <div className={clsx('text-xs mt-1 flex items-center gap-1', color)}>
        <Icon size={10} />
        {Math.abs(change) < 0.05 ? 'Unchanged' : `${change > 0 ? '+' : ''}${change.toFixed(2)}% MoM`}
      </div>
    </div>
  )
}
