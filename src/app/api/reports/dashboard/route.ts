import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { getMonthName } from '@/lib/utils-server'
import { _getClient } from '@/lib/db'

// Cache for 60 seconds on Vercel edge / function layer
export const revalidate = 60

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response

  const client = _getClient()
  const now = new Date()
  // Last 12 months range
  const yearAgoStart = new Date(now.getFullYear(), now.getMonth() - 11, 1)
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

  // ONE query for all monthly sales + orders for the last 12 months
  // GROUP BY year-month
  const monthlyOrdersRes = await client.execute({
    sql: `SELECT
            strftime('%Y-%m', orderDate) as ym,
            COUNT(*) as cnt,
            COALESCE(SUM(grandTotal), 0) as sales
          FROM "SalesOrder"
          WHERE orderDate >= ?
          GROUP BY ym
          ORDER BY ym`,
    args: [yearAgoStart.toISOString()]
  })

  // ONE query for all monthly collections for the last 12 months
  const monthlyBillsRes = await client.execute({
    sql: `SELECT
            strftime('%Y-%m', collectDate) as ym,
            COALESCE(SUM(amount), 0) as collected
          FROM "BillCollection"
          WHERE collectDate >= ?
          GROUP BY ym
          ORDER BY ym`,
    args: [yearAgoStart.toISOString()]
  })

  // Build month lookup maps
  const salesByMonth: Record<string, { sales: number; orders: number }> = {}
  for (const row of monthlyOrdersRes.rows as any[]) {
    salesByMonth[row.ym] = { sales: Number(row.sales) || 0, orders: Number(row.cnt) || 0 }
  }
  const collectedByMonth: Record<string, number> = {}
  for (const row of monthlyBillsRes.rows as any[]) {
    collectedByMonth[row.ym] = Number(row.collected) || 0
  }

  // Build the monthly data array (last 12 months)
  const monthlyData: { month: string; sales: number; orders: number; collected: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const ym = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`
    const data = salesByMonth[ym] || { sales: 0, orders: 0 }
    monthlyData.push({
      month: `${getMonthName(start.getMonth())} ${String(start.getFullYear()).slice(-2)}`,
      sales: data.sales,
      orders: data.orders,
      collected: collectedByMonth[ym] || 0
    })
  }

  // ONE query for ALL summary totals using subqueries (avoids 6 round trips)
  const summaryRes = await client.execute({
    sql: `SELECT
            (SELECT COUNT(*) FROM "SalesOrder") as totalOrders,
            (SELECT COALESCE(SUM(grandTotal), 0) FROM "SalesOrder") as totalSales,
            (SELECT COALESCE(SUM(amount), 0) FROM "BillCollection") as totalCollected,
            (SELECT COALESCE(SUM(dueAmount), 0) FROM "SalesOrder") as totalDue,
            (SELECT COUNT(*) FROM "Customer") as totalCustomers,
            (SELECT COUNT(*) FROM "Tailor") as totalTailors,
            (SELECT COUNT(*) FROM "SalesOrder" WHERE status = 'full_pending') as pending,
            (SELECT COUNT(*) FROM "SalesOrder" WHERE status = 'partial_pending') as partial,
            (SELECT COUNT(*) FROM "SalesOrder" WHERE status = 'full_delivered') as delivered,
            (SELECT COALESCE(SUM(grandTotal), 0) FROM "SalesOrder" WHERE orderDate >= ?) as thisMonthSales,
            (SELECT COALESCE(SUM(grandTotal), 0) FROM "SalesOrder" WHERE orderDate >= ? AND orderDate <= ?) as prevMonthSales`,
    args: [
      thisMonthStart.toISOString(),
      prevMonthStart.toISOString(),
      prevMonthEnd.toISOString()
    ]
  })

  const summaryRow = summaryRes.rows[0] as any
  const thisMonthSales = Number(summaryRow.thisMonthSales) || 0
  const prevMonthSales = Number(summaryRow.prevMonthSales) || 0
  const growthPercentage = prevMonthSales > 0
    ? ((thisMonthSales - prevMonthSales) / prevMonthSales) * 100
    : thisMonthSales > 0 ? 100 : 0

  const response = NextResponse.json({
    monthlyData,
    summary: {
      totalOrders: Number(summaryRow.totalOrders) || 0,
      totalSales: Number(summaryRow.totalSales) || 0,
      totalCollected: Number(summaryRow.totalCollected) || 0,
      totalDue: Number(summaryRow.totalDue) || 0,
      totalCustomers: Number(summaryRow.totalCustomers) || 0,
      totalTailors: Number(summaryRow.totalTailors) || 0,
      thisMonthSales,
      prevMonthSales,
      growthPercentage
    },
    statusBreakdown: {
      pending: Number(summaryRow.pending) || 0,
      partial: Number(summaryRow.partial) || 0,
      delivered: Number(summaryRow.delivered) || 0
    }
  })

  // Cache on browser/proxy for 30 seconds (reduces repeated dashboard hits)
  response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60')
  return response
}
