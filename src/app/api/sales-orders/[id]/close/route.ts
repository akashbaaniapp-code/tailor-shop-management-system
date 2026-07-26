import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const { id } = await params

  const order = await db.salesOrder.findUnique({ where: { id } })
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Only allow closing if order is fully delivered (or already closed)
  if (order.status !== 'full_delivered' && order.status !== 'closed') {
    return NextResponse.json({
      error: `Order cannot be closed. Current status: ${order.status}. Order must be fully delivered first.`
    }, { status: 400 })
  }

  if (order.status === 'closed') {
    return NextResponse.json({ order, message: 'Order is already closed' })
  }

  const updated = await db.salesOrder.update({
    where: { id },
    data: { status: 'closed' },
    include: {
      customer: true,
      tailor: true,
      items: { include: { item: { include: { uom: true } } } }
    }
  })

  return NextResponse.json({ order: updated })
}
