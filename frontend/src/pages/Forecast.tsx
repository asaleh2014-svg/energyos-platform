import { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useAppStore } from '@/lib/store'
import { MARKET_CONFIGS } from '@/types'
import { useTenantId } from '@/lib/auth'
import { fetchConsumption } from '@/lib/dbQueries'
import { ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area } from 'recharts'
import { ChartCard } from '@/components/ChartCard'
import { Loader2 } from 'lucide-react'

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const TT_STYLE = { background: '#111520', border: '1px solid #ffffff20', borderRadius: 8, fontSize: 12 }

interface ForecastRow {
  month: string
  actual: number | null
  forecast: number | null
  upper: number | null
  lower: number | null
}

// Simple linear regression: returns { slope, intercept }
function linearRegression(points: number[]): { slope: number; intercept: number } {
  const n = points.length
  if (n === 0) return { slope: 0, intercept: 0 }
  const xs = points.map((_, i) => i)
  const sumX  = xs.reduce((a, b) => a + b, 0)
  const sumY  = points.reduce((a, b) => a + b, 0)
  const sumXY = xs.reduce((a, x, i) => a + x * points[i], 0)
  const sumXX = xs.reduce((a, x) => a + x * x, 0)
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}

export default function Forecast() {
  const { market } = useAppStore()
  const cfg = MARKET_CONFIGS[market]
  const tenantId = useTenantId()
  const [loading, setLoading] = useState(true)
  const [forecastData, setForecastData] = useState<ForecastRow[]>([])
  const [projQ, setProjQ]       = useState(0)
  const [budgetRem, setBudgetRem] = useState(0)
  const [mape, setMape]           = useState(0)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const records = await fetchConsumption(tenantId)

      // Aggregate cost by month
      const costByMonth: Record<string, number> = {}
      for (const r of records) {
        const key = r.period_start?.slice(0, 7)
        if (!key) continue
        costByMonth[key] = (costByMonth[key] ?? 0) + Number(r.cost ?? 0)
      }

      const sortedMonths = Object.keys(costByMonth).sort()
      const costs        = sortedMonths.map(m => costByMonth[m])

      if (costs.length === 0) {
        setForecastData([])
        setLoading(false)
        return
      }

      // Build labels for actual months
      const actualRows: ForecastRow[] = sortedMonths.map((m, i) => ({
        month:    new Date(m + '-01').toLocaleString('default', { month:'short', year:'2-digit' }),
        actual:   Math.round(costs[i]),
        forecast: i === costs.length - 1 ? Math.round(costs[i]) : null, // bridge at last point
        upper:    null,
        lower:    null,
      }))

      // Linear regression on last 13 months (or all if fewer)
      const window = costs.slice(-13)
      const { slope, intercept } = linearRegression(window)
      const baseIdx = costs.length - 1

      // Forecast 6 months forward
      const FORECAST_COUNT = 6
      const VARIANCE = 0.08 // ±8% band
      const forecastRows: ForecastRow[] = Array.from({ length: FORECAST_COUNT }, (_, fi) => {
        const x    = window.length + fi
        const pred = Math.max(0, intercept + slope * x)
        const lastActualDate = new Date(sortedMonths[sortedMonths.length - 1] + '-01')
        lastActualDate.setMonth(lastActualDate.getMonth() + fi + 1)
        const label = lastActualDate.toLocaleString('default', { month:'short', year:'2-digit' })
        return {
          month:    label + '*',
          actual:   null,
          forecast: Math.round(pred),
          upper:    Math.round(pred * (1 + VARIANCE)),
          lower:    Math.round(pred * (1 - VARIANCE)),
        }
      })

      const rows = [...actualRows, ...forecastRows]
      setForecastData(rows)

      // KPI: projected next quarter spend
      const nextQ = forecastRows.slice(0, 3).reduce((a, r) => a + (r.forecast ?? 0), 0)
      setProjQ(nextQ)

      // Budget remaining: assume annual budget = 12 * avg monthly actual
      const avgMonthly = costs.reduce((a, b) => a + b, 0) / costs.length
      const annualBudget = avgMonthly * 12
      const ytdSpend    = costs.reduce((a, b) => a + b, 0)
      setBudgetRem(Math.max(0, annualBudget - ytdSpend))

      // Simple MAPE: backtest last 3 months
      if (costs.length >= 4) {
        const testWindow = costs.slice(0, -3)
        const { slope: ts, intercept: ti } = linearRegression(testWindow)
        const mapeVals = costs.slice(-3).map((actual, i) => {
          const pred = ti + ts * (testWindow.length + i)
          return Math.abs((actual - pred) / actual)
        })
        setMape(100 - mapeVals.reduce((a, b) => a + b, 0) / mapeVals.length * 100)
      } else {
        setMape(0)
      }

      setLoading(false)
    }
    load()
  }, [tenantId])

  if (loading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Topbar title="Cost Forecast" subtitle="90-day predictive model" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-white/30" />
        </div>
      </div>
    )
  }

  if (forecastData.length === 0) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Topbar title="Cost Forecast" subtitle="90-day predictive model" />
        <div className="flex-1 flex items-center justify-center flex-col gap-3 text-white/40">
          <div className="text-4xl">📊</div>
          <p className="text-sm">No consumption data yet — import records via Analytics to see forecasts.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Cost Forecast" subtitle="90-day predictive model" />
      <div className="flex-1 overflow-y-auto p-6">

        <div className="p-3 bg-accent/5 border border-accent/20 rounded-xl text-xs text-accent-hover mb-6 flex items-center gap-2">
          📡 Forecast uses linear regression on {forecastData.filter(r => r.actual !== null).length} months of actuals. Months marked * are forecast.
        </div>

        <ChartCard
          title="Cost Forecast — 90 Day Horizon"
          className="mb-6"
          action={
            <div className="flex items-center gap-4 text-xs text-white/40">
              <span className="flex items-center gap-1.5"><span className="inline-block w-5 border-t-2 border-accent"></span>Actuals</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-5 border-t-2 border-dashed border-warning"></span>Forecast</span>
            </div>
          }
          table={
            <table className="w-full">
              <thead><tr>
                <th className="tbl-th">Month</th>
                <th className="tbl-th">Actual ({cfg.currencySymbol})</th>
                <th className="tbl-th">Forecast ({cfg.currencySymbol})</th>
                <th className="tbl-th">Lower Band</th>
                <th className="tbl-th">Upper Band</th>
              </tr></thead>
              <tbody>
                {forecastData.map(row => (
                  <tr key={row.month} className="tbl-row">
                    <td className="tbl-td text-white/70">{row.month}</td>
                    <td className="tbl-td text-blue-300 font-mono">{row.actual != null ? row.actual.toLocaleString() : '—'}</td>
                    <td className="tbl-td text-amber-300 font-mono">{row.forecast != null ? row.forecast.toLocaleString() : '—'}</td>
                    <td className="tbl-td text-white/40 font-mono">{row.lower != null ? row.lower.toLocaleString() : '—'}</td>
                    <td className="tbl-td text-white/40 font-mono">{row.upper != null ? row.upper.toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={forecastData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="month" tick={{ fill: '#5a6385', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#5a6385', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => `${cfg.currencySymbol}${(v / 1000).toFixed(0)}K`} />
              <Tooltip contentStyle={TT_STYLE} labelStyle={{ color: '#e8eaf2' }}
                formatter={(v) => v ? [`${cfg.currencySymbol} ${Number(v).toLocaleString()}`, undefined] : ['-', undefined]} />
              <Area type="monotone" dataKey="actual" name="Actuals" stroke="#3b82f6" fill="url(#actualGrad)" strokeWidth={2} connectNulls={false} dot={{ r: 3, fill: '#3b82f6' }} />
              <Area type="monotone" dataKey="upper" name="Upper band" stroke="#f59e0b20" fill="url(#bandGrad)" strokeWidth={0} connectNulls={false} dot={false} />
              <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#f59e0b" strokeDasharray="6 3" strokeWidth={2} connectNulls={false} dot={{ r: 3, fill: '#f59e0b' }} />
              <Line type="monotone" dataKey="lower" name="Lower band" stroke="#f59e0b20" strokeWidth={0} connectNulls={false} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="grid grid-cols-3 gap-4">
          <div className="card">
            <div className="label mb-2">Projected Next Quarter</div>
            <div className="text-xl font-semibold text-white mb-2">{cfg.currencySymbol} {projQ.toLocaleString()}</div>
            <p className="text-xs text-white/40">Based on linear trend from actuals</p>
          </div>
          <div className="card">
            <div className="label mb-2">Estimated Budget Remaining</div>
            <div className="text-xl font-semibold text-success-light mb-2">{cfg.currencySymbol} {budgetRem.toLocaleString()}</div>
            <p className="text-xs text-white/40">Annual budget estimate based on avg monthly spend</p>
          </div>
          <div className="card">
            <div className="label mb-2">Forecast Accuracy</div>
            <div className="text-xl font-semibold text-white mb-2">{mape > 0 ? `${mape.toFixed(1)}%` : '—'}</div>
            <p className="text-xs text-white/40">{mape > 0 ? 'MAPE backtest vs last 3 months' : 'Not enough data for backtest'}</p>
          </div>
        </div>

      </div>
    </div>
  )
}
