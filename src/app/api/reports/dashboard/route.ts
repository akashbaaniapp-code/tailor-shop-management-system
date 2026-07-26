import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { getMonthName } from '@/lib/utils-server'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response

  // Monthly growth for last 12 months
  const now = new Date()
  const monthlyData: { month: string; sales: number; orders: number; collected: number }[] = []

  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)

    const orders = await db.salesOrder.findMany({
      where: {
        orderDate: { gte: start, lte: end }
      }
    })

    const bills = await db.billCollection.findMany({
      where: {
        collectDate: { gte: start, lte: end }
      }
    })

    const sales = orders.reduce((sum, o) => sum + o.grandTotal, 0)
    const collected = bills.reduce((sum, b) => sum + b.amount, 0)

    monthlyData.push({
      month: `${getMonthName(start.getMonth())} ${String(start.getFullYear()).slice(-2)}`,
      sales,
      orders: orders.length,
      collected
    })
  }

  // Summary totals
  const totalOrders = await db.salesOrder.count()
  const totalSales = await db.salesOrder.aggregate({ _sum: { grandTotal: true } })
  const totalCollected = await db.billCollection.aggregate({ _sum: { amount: true } })
  const totalDue = await db.salesOrder.aggregate({ _sum: { dueAmount: true } })
  const totalCustomers = await db.customer.count()
  const totalTailors = await db.tailor.count()

  // Status breakdown
  const pendingOrders = await db.salesOrder.count({ where: { status: 'full_pending' } })
  const partialOrders = await db.salesOrder.count({ where: { status: 'partial_pending' } })
  const deliveredOrders = await db.salesOrder.count({ where: { status: 'full_delivered' } })

  // This month summary
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonthOrders = await db.salesOrder.findMany({
    where: { orderDate: { gte: monthStart } }
  })
  const thisMonthSales = thisMonthOrders.reduce((sum, o) => sum + o.grandTotal, 0)

  // Previous month for growth calculation
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
  const prevMonthOrders = await db.salesOrder.findMany({
    where: { orderDate: { gte: prevMonthStart, lte: prevMonthEnd } }
  })
  const prevMonthSales = prevMonthOrders.reduce((sum, o) => sum + o.grandTotal, 0)

  const growthPercentage = prevMonthSales > 0
    ? ((thisMonthSales - prevMonthSales) / prevMonthSales) * 100
    : thisMonthSales > 0 ? 100 : 0

  return NextResponse.json({
    monthlyData,
    summary: {
      totalOrders,
      totalSales: totalSales._sum.grandTotal || 0,
      totalCollected: totalCollected._sum.amount || 0,
      totalDue: totalDue._sum.dueAmount || 0,
      totalCustomers,
      totalTailors,
      thisMonthSales,
      prevMonthSales,
      growthPercentage
    },
    statusBreakdown: {
      pending: pendingOrders,
      partial: partialOrders,
      delivered: deliveredOrders
    }
  })
}
