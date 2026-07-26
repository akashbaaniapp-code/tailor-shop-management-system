'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, ShoppingCart, Wallet, Users, AlertCircle } from 'lucide-react'
import { api, formatCurrency, prefetchAll } from '@/lib/api'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar
} from 'recharts'

interface DashboardData {
  monthlyData: { month: string; sales: number; orders: number; collected: number }[]
  summary: {
    totalOrders: number
    totalSales: number
    totalCollected: number
    totalDue: number
    totalCustomers: number
    totalTailors: number
    thisMonthSales: number
    prevMonthSales: number
    growthPercentage: number
  }
  statusBreakdown: { pending: number; partial: number; delivered: number }
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.dashboard().then(d => {
      setData(d)
      setLoading(false)
      // Prefetch next likely pages in background (stale-while-revalidate)
      // User on dashboard will likely go to Sales Orders or Delivery next
      setTimeout(() => {
        prefetchAll([
          '/api/sales-orders',
          '/api/customers',
          '/api/items',
          '/api/tailors'
        ])
      }, 1000) // 1s delay so dashboard renders first
    }).catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  if (!data) {
    return <div className="text-center text-slate-500 py-12">Failed to load dashboard</div>
  }

  const { summary, monthlyData, statusBreakdown } = data
  const growthPositive = summary.growthPercentage >= 0

  const statusData = [
    { name: 'Full Pending', value: statusBreakdown.pending, fill: '#f59e0b' },
    { name: 'Partial', value: statusBreakdown.partial, fill: '#3b82f6' },
    { name: 'Delivered', value: statusBreakdown.delivered, fill: '#10b981' }
  ]

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Sales"
          value={formatCurrency(summary.totalSales)}
          icon={<ShoppingCart className="w-5 h-5" />}
          accent="emerald"
        />
        <StatCard
          title="Total Collected"
          value={formatCurrency(summary.totalCollected)}
          icon={<Wallet className="w-5 h-5" />}
          accent="blue"
        />
        <StatCard
          title="Total Due"
          value={formatCurrency(summary.totalDue)}
          icon={<AlertCircle className="w-5 h-5" />}
          accent="amber"
        />
        <StatCard
          title="Customers"
          value={String(summary.totalCustomers)}
          icon={<Users className="w-5 h-5" />}
          accent="slate"
        />
      </div>

      {/* Growth indicator */}
      <Card className="border-slate-200">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">This Month Sales</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(summary.thisMonthSales)}</p>
              <p className="text-xs text-slate-500 mt-1">Previous: {formatCurrency(summary.prevMonthSales)}</p>
            </div>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${growthPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {growthPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              <div>
                <p className="text-xs">Growth vs last month</p>
                <p className="text-lg font-bold">{growthPositive ? '+' : ''}{summary.growthPercentage.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly growth chart */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Monthly Growth (Last 12 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                formatter={(v: any) => formatCurrency(Number(v))}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="sales"
                name="Sales"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#colorSales)"
              />
              <Area
                type="monotone"
                dataKey="collected"
                name="Collected"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#colorCollected)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Orders count + status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Monthly Order Count</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="orders" name="Orders" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Order Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 pt-2">
              <StatusBar label="Full Pending" value={statusBreakdown.pending} total={summary.totalOrders} color="bg-amber-500" />
              <StatusBar label="Partial Pending" value={statusBreakdown.partial} total={summary.totalOrders} color="bg-blue-500" />
              <StatusBar label="Full Delivered" value={statusBreakdown.delivered} total={summary.totalOrders} color="bg-emerald-500" />
              <div className="pt-4 border-t border-slate-100">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Total Orders</span>
                  <span className="font-semibold text-slate-900">{summary.totalOrders}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-slate-600">Total Tailors</span>
                  <span className="font-semibold text-slate-900">{summary.totalTailors}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, accent }: { title: string; value: string; icon: React.ReactNode; accent: 'emerald' | 'blue' | 'amber' | 'slate' }) {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    slate: 'bg-slate-100 text-slate-600'
  }
  return (
    <Card className="border-slate-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{value}</p>
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[accent]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-700">{label}</span>
        <span className="font-medium text-slate-900">{value}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
