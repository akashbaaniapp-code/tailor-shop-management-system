import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response

  // Receivable = orders with due > 0
  const orders = await db.salesOrder.findMany({
    where: { dueAmount: { gt: 0 } },
    include: { customer: true, bills: true },
    orderBy: { orderDate: 'desc' }
  })

  const rows = orders.map(o => ({
    orderId: o.orderId,
    orderDate: o.orderDate,
    customerName: o.customer.name,
    customerPhone: o.customer.phone,
    grandTotal: o.grandTotal,
    paidAmount: o.paidAmount,
    dueAmount: o.dueAmount,
    paymentStatus: o.paymentStatus
  }))

  const totalDue = orders.reduce((sum, o) => sum + o.dueAmount, 0)

  return NextResponse.json({
    rows,
    totalDue,
    count: orders.length
  })
}
