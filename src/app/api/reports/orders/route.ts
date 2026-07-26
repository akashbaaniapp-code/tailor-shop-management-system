import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const status = searchParams.get('status')

  let where: any = {}
  if (from || to) {
    where.orderDate = {}
    if (from) where.orderDate.gte = new Date(from)
    if (to) where.orderDate.lte = new Date(to)
  }
  if (status && status !== 'all') {
    where.status = status
  }

  const orders = await db.salesOrder.findMany({
    where,
    include: {
      customer: true,
      tailor: true,
      items: true,
      bills: true,
      deliveries: { include: { items: true } }
    },
    orderBy: { orderDate: 'desc' },
    take: 500
  })

  const rows = orders.map(o => {
    const totalDeliveredQty = o.items.reduce((s, i) => s + i.deliveredQty, 0)
    const totalOrderedQty = o.items.reduce((s, i) => s + i.qty, 0)
    return {
      orderId: o.orderId,
      orderDate: o.orderDate,
      deliveryDate: o.deliveryDate,
      customerName: o.customer.name,
      customerPhone: o.customer.phone,
      tailorName: o.tailor?.name || '',
      itemCount: o.items.length,
      totalOrderedQty,
      totalDeliveredQty,
      grandTotal: o.grandTotal,
      paidAmount: o.paidAmount,
      dueAmount: o.dueAmount,
      status: o.status,
      paymentStatus: o.paymentStatus
    }
  })

  const totalSales = orders.reduce((s, o) => s + o.grandTotal, 0)
  const totalCollected = orders.reduce((s, o) => s + o.paidAmount, 0)
  const totalDue = orders.reduce((s, o) => s + o.dueAmount, 0)

  return NextResponse.json({
    rows,
    totalSales,
    totalCollected,
    totalDue,
    count: orders.length
  })
}
