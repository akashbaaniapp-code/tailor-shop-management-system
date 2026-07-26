'use client'

import { useEffect, useState } from 'react'
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

// Dark theme colors
const DARK = {
  bg: '#0b0d0f',
  cardBg: 'rgba(255, 255, 255, 0.03)',
  cardBorder: 'rgba(255, 255, 255, 0.06)',
  cardHover: 'rgba(255, 255, 255, 0.06)',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.4)',
  textMuted: 'rgba(255, 255, 255, 0.15)',
  accentLime: '#d4df3a',
  accentLimeBg: 'rgba(212, 223, 58, 0.08)',
  blue: '#3498db',
  blueBg: 'rgba(52, 152, 219, 0.1)',
  amber: '#f39c12',
  amberBg: 'rgba(243, 156, 18, 0.1)',
  green: '#2ecc71',
  gridLine: 'rgba(255, 255, 255, 0.05)',
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.dashboard().then(d => {
      setData(d)
      setLoading(false)
      setTimeout(() => {
        prefetchAll([
          '/api/sales-orders',
          '/api/customers',
          '/api/items',
          '/api/tailors'
        ])
      }, 1000)
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
    return <div className="text-center py-12" style={{ color: DARK.textSecondary }}>Failed to load dashboard</div>
  }

  const { summary, monthlyData, statusBreakdown } = data
  const growthPositive = summary.growthPercentage >= 0

  return (
    <div className="space-y-6">
      {/* Top 4 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total Sales" value={formatCurrency(summary.totalSales)} icon={<ShoppingCart className="w-4 h-4" />} color={DARK.accentLime} bg={DARK.accentLimeBg} />
        <StatCard title="Total Collected" value={formatCurrency(summary.totalCollected)} icon={<Wallet className="w-4 h-4" />} color={DARK.blue} bg={DARK.blueBg} />
        <StatCard title="Total Due" value={formatCurrency(summary.totalDue)} icon={<AlertCircle className="w-4 h-4" />} color={DARK.amber} bg={DARK.amberBg} />
        <StatCard title="Customers" value={String(summary.totalCustomers)} icon={<Users className="w-4 h-4" />} color="#ffffff" bg="rgba(255,255,255,0.05)" />
      </div>

      {/* Large Card: This Month Sales + Growth */}
      <div
        className="rounded-2xl p-6 transition-all duration-300 hover:bg-[rgba(255,255,255,0.06)]"
        style={{ background: DARK.cardBg, backdropFilter: 'blur(10px)', border: `1px solid ${DARK.cardBorder}` }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
          <div>
            <p className="text-sm font-medium" style={{ color: DARK.textPrimary }}>This Month Sales</p>
            <p className="text-xs mt-1" style={{ color: DARK.textSecondary }}>Previous: {formatCurrency(summary.prevMonthSales)}</p>
          </div>
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
            style={{ background: 'rgba(212, 223, 58, 0.1)', color: DARK.accentLime }}
          >
            {growthPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            Growth vs last month <strong className="ml-1">{growthPositive ? '+' : ''}{summary.growthPercentage.toFixed(1)}%</strong>
          </div>
        </div>
        <p className="text-3xl font-bold" style={{ color: DARK.textPrimary }}>{formatCurrency(summary.thisMonthSales)}</p>
      </div>

      {/* Chart Section (Monthly Growth) */}
      <div
        className="rounded-2xl p-6"
        style={{ background: DARK.cardBg, backdropFilter: 'blur(10px)', border: `1px solid ${DARK.cardBorder}` }}
      >
        <p className="text-base font-medium mb-5" style={{ color: DARK.textPrimary }}>Monthly Growth (Last 12 Months)</p>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={monthlyData}>
            <defs>
              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={DARK.green} stopOpacity={0.25}/>
                <stop offset="95%" stopColor={DARK.green} stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={DARK.blue} stopOpacity={0.25}/>
                <stop offset="95%" stopColor={DARK.blue} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={DARK.gridLine} />
            <XAxis dataKey="month" stroke="rgba(255,255,255,0.2)" fontSize={11} />
            <YAxis stroke="rgba(255,255,255,0.2)" fontSize={11} />
            <Tooltip
              contentStyle={{ background: '#1a1d20', border: `1px solid ${DARK.cardBorder}`, borderRadius: 8, fontSize: 12, color: '#fff' }}
              labelStyle={{ color: '#fff' }}
              formatter={(v: any) => formatCurrency(Number(v))}
            />
            <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.5)' }} />
            <Area type="monotone" dataKey="sales" name="Sales" stroke={DARK.green} strokeWidth={2} fill="url(#colorSales)" />
            <Area type="monotone" dataKey="collected" name="Collected" stroke={DARK.blue} strokeWidth={2} fill="url(#colorCollected)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Cards (Order Count & Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Monthly Order Count */}
        <div
          className="rounded-2xl p-6"
          style={{ background: DARK.cardBg, backdropFilter: 'blur(10px)', border: `1px solid ${DARK.cardBorder}` }}
        >
          <p className="text-sm font-medium mb-5" style={{ color: DARK.textPrimary }}>Monthly Order Count</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={DARK.gridLine} />
              <XAxis dataKey="month" stroke="rgba(255,255,255,0.2)" fontSize={10} />
              <YAxis stroke="rgba(255,255,255,0.2)" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#1a1d20', border: `1px solid ${DARK.cardBorder}`, borderRadius: 8, fontSize: 12, color: '#fff' }}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              />
              <Bar dataKey="orders" name="Orders" fill={DARK.accentLime} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Order Status Breakdown */}
        <div
          className="rounded-2xl p-6"
          style={{ background: DARK.cardBg, backdropFilter: 'blur(10px)', border: `1px solid ${DARK.cardBorder}` }}
        >
          <p className="text-sm font-medium mb-5" style={{ color: DARK.textPrimary }}>Order Status Breakdown</p>
          <div className="space-y-3">
            <StatusBar label="Full Pending" value={statusBreakdown.pending} total={summary.totalOrders} color={DARK.amber} />
            <StatusBar label="Partial Pending" value={statusBreakdown.partial} total={summary.totalOrders} color={DARK.blue} />
            <StatusBar label="Full Delivered" value={statusBreakdown.delivered} total={summary.totalOrders} color={DARK.green} />
          </div>
          <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${DARK.cardBorder}` }}>
            <div className="flex justify-between text-sm">
              <span style={{ color: DARK.textSecondary }}>Total Orders</span>
              <span className="font-semibold" style={{ color: DARK.textPrimary }}>{summary.totalOrders}</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span style={{ color: DARK.textSecondary }}>Total Tailors</span>
              <span className="font-semibold" style={{ color: DARK.textPrimary }}>{summary.totalTailors}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color, bg }: { title: string; value: string; icon: React.ReactNode; color: string; bg: string }) {
  return (
    <div
      className="rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5"
      style={{
        background: DARK.cardBg,
        backdropFilter: 'blur(10px)',
        border: `1px solid ${DARK.cardBorder}`,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = DARK.cardHover }}
      onMouseLeave={(e) => { e.currentTarget.style.background = DARK.cardBg }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs mb-2" style={{ color: DARK.textSecondary }}>{title}</p>
          <p className="text-2xl font-bold" style={{ color: DARK.textPrimary }}>{value}</p>
        </div>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: bg, color }}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}

function StatusBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span style={{ color: DARK.textSecondary }}>{label}</span>
        <span className="font-medium" style={{ color: DARK.textPrimary }}>{value}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}
