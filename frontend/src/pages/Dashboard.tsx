import { Topbar } from '@/components/layout/Topbar'
import { StatCard } from '@/components/dashboard/StatCard'
import { UAEMap } from '@/components/dashboard/UAEMap'
import { useAppStore } from '@/lib/store'
import { MARKET_CONFIGS } from '@/types'
import { MOCK_SITES, MOCK_CONNECTIONS, CONSUMPTION_MONTHLY, COST_MONTHLY, MONTHS } from '@/lib/mockData'
import { useNavigate } from 'react-router-dom'
import { Zap, DollarSign, Activity, PieChart } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend
} from 'recharts'

const chartData = MONTHS.map((m, i) => ({
  month: m,
  electricity: Math.round(CONSUMPTION_MONTHLY.electricity[i] / 100),
  gas: CONSUMPTION_MONTHLY.gas[i],
}))

export default function Dashboard() {
  const { market } = useAppStore()
  const cfg = MARKET_CONFIGS[market]
  const navigate = useNavigate()

  const totalKwh = CONSUMPTION_MONTHLY.electricity.reduce((a, b) => a + b, 0)
  const totalCost = COST_MONTHLY[COST_MONTHLY.length - 1]
  const activeConns = MOCK_CONNECTIONS.filter(c => c.status === 'Active').length

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Portfolio Dashboard" subtitle="Real-time energy portfolio monitoring" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Consumption (YTD)" value={`${(totalKwh/1000).toFixed(0)}K kWh`} trend="↑ 4.2%" trendUp={true} trendLabel="vs last year" icon={<Zap />} accent="blue" />
          <StatCard label="Total Spend (MTD)" value={`${cfg.currencySymbol} ${totalCost.toLocaleString()}`} trend="↓ 1.8%" trendUp={false} trendLabel="vs last month" icon={<DollarSign />} accent="green" />
          <StatCard label="Active Connections" value={`${activeConns} / ${MOCK_CONNECTIONS.length}`} trendLabel="3 pending installation" icon={<Activity />} accent="amber" />
          <StatCard label="Budget Utilization" value="73%" trend="↑ 2.1%" trendUp={true} trendLabel={`${cfg.currencySymbol} 76K remaining`} icon={<PieChart />} accent="purple" />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">Monthly Consumption</h2>
              <button onClick={() => navigate('/analytics')} className="text-xs text-accent-hover hover:underline">View analytics →</button>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="month" tick={{ fill: '#5a6385', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#5a6385', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#111520', border: '1px solid #ffffff20', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#e8eaf2' }} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#5a6385' }} />
                <Bar dataKey="electricity" name="Electricity (×100 kWh)" fill="#3b82f6" opacity={0.8} radius={[3,3,0,0]} />
                <Bar dataKey="gas" name="Gas (m³)" fill="#f59e0b" opacity={0.8} radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">Portfolio Map</h2>
              <button onClick={() => navigate('/sites')} className="text-xs text-accent-hover hover:underline">All sites →</button>
            </div>
            <UAEMap sites={MOCK_SITES} />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Recent Connections</h2>
            <button onClick={() => navigate('/connections')} className="text-xs text-accent-hover hover:underline">View all →</button>
          </div>
          <table className="w-full">
            <thead>
              <tr>
                {['Site','EAN / Meter ID','Type','Capacity','Status','Last Reading','Cost (MTD)',''].map(h => (
                  <th key={h} className="tbl-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_CONNECTIONS.slice(0,5).map(c => (
                <tr key={c.id} className="tbl-row">
                  <td className="tbl-td text-white font-medium">{c.site_name}</td>
                  <td className="tbl-td ean">{c.ean_code}</td>
                  <td className="tbl-td"><span className={c.connection_type==='Electricity'?'type-elec':'type-gas'}>{c.connection_type==='Electricity'?'⚡':'🔥'} {c.connection_type}</span></td>
                  <td className="tbl-td">{c.capacity}</td>
                  <td className="tbl-td"><span className={`status-${c.status.toLowerCase()}`}>{c.status}</span></td>
                  <td className="tbl-td text-white/30 text-xs">2 min ago</td>
                  <td className="tbl-td font-medium text-white/80">AED 24,180</td>
                  <td className="tbl-td"><button className="btn-sm">View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
