import { Topbar } from '@/components/layout/Topbar'
import { useAppStore } from '@/lib/store'
import { MARKET_CONFIGS } from '@/types'
import { COST_MONTHLY, MONTHS } from '@/lib/mockData'
import { ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area } from 'recharts'
import { ChartCard } from '@/components/ChartCard'

const FORECAST_MONTHS = [...MONTHS, 'Jan*', 'Feb*', 'Mar*']

const historicData = FORECAST_MONTHS.map((m, i) => ({
  month: m,
  actual: i < 9 ? COST_MONTHLY[i] : null,
  forecast: i >= 8 ? [null, 248200, 268400, 289100][i - 8] : null,
  upper: i >= 8 ? [null, 267800, 290000, 312100][i - 8] : null,
  lower: i >= 8 ? [null, 228600, 246800, 266100][i - 8] : null,
}))

const TT_STYLE = { background: '#111520', border: '1px solid #ffffff20', borderRadius: 8, fontSize: 12 }

export default function Forecast() {
  const { market } = useAppStore()
  const cfg = MARKET_CONFIGS[market]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Cost Forecast" subtitle="90-day predictive model" />
      <div className="flex-1 overflow-y-auto p-6">

        <div className="p-3 bg-accent/5 border border-accent/20 rounded-xl text-xs text-accent-hover mb-6 flex items-center gap-2">
          📡 Forecast uses season-adjusted linear regression on 12 months of actuals. Dotted line = 90-day projection. Months marked * are forecast.
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
                {historicData.map(row => (
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
            <ComposedChart data={historicData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                formatter={(v: number | null) => v ? [`${cfg.currencySymbol} ${v.toLocaleString()}`, undefined] : ['-', undefined]} />
              <Area type="monotone" dataKey="actual" name="Actuals" stroke="#3b82f6" fill="url(#actualGrad)" strokeWidth={2} connectNulls={false} dot={{ r: 3, fill: '#3b82f6' }} />
              <Area type="monotone" dataKey="upper" name="Upper band" stroke="#f59e0b20" fill="url(#bandGrad)" strokeWidth={0} connectNulls={false} dot={false} />
              <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#f59e0b" strokeDasharray="6 3" strokeWidth={2} connectNulls={false} dot={{ r: 3, fill: '#f59e0b' }} />
              <Line type="monotone" dataKey="lower" name="Lower band" stroke="#f59e0b20" strokeWidth={0} connectNulls={false} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="grid grid-cols-3 gap-4">
          <div className="card">
            <div className="label mb-2">Projected Q4 Spend</div>
            <div className="text-xl font-semibold text-white mb-2">{cfg.currencySymbol} 98,400</div>
            <p className="text-xs text-white/40">Based on current trajectory +5.2% seasonal uplift</p>
          </div>
          <div className="card">
            <div className="label mb-2">Budget Remaining</div>
            <div className="text-xl font-semibold text-success-light mb-2">{cfg.currencySymbol} 76,200</div>
            <p className="text-xs text-white/40">Annual budget {cfg.currencySymbol} 360K — 73% utilized through M9</p>
          </div>
          <div className="card">
            <div className="label mb-2">Forecast Accuracy</div>
            <div className="text-xl font-semibold text-white mb-2">94.2%</div>
            <p className="text-xs text-white/40">MAPE vs actuals over last 6 months backtest</p>
          </div>
        </div>

      </div>
    </div>
  )
}
