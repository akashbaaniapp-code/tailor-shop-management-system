import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { generateOrderId } from '@/lib/utils-server'

// GET deliveries - filter by orderId or list all
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response

  const { searchParams } = new URL(request.url)
  const orderId = searchParams.get('orderId') // sales order id (db id)
  const orderRefId = searchParams.get('orderRef') // sales order ID like SO-...

  let where: any = {}
  if (orderId) {
    where.orderId = orderId
  } else if (orderRefId) {
    where = { order: { orderId: orderRefId } }
  }

  const deliveries = await db.delivery.findMany({
    where,
    include: {
      order: { include: { customer: true } },
      items: { include: { orderItem: { include: { item: true } } } }
    },
    orderBy: { createdAt: 'desc' },
    take: 200
  })

  return NextResponse.json({ deliveries })
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response

  const body = await request.json()
  const { orderId, items, note, deliveryDate } = body

  if (!orderId) return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'At least one item required' }, { status: 400 })
  }

  // Verify order
  const order = await db.salesOrder.findUnique({
    where: { id: orderId },
    include: { items: true }
  })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  // Validate quantities - cannot deliver more than ordered - alreadyDelivered
  for (const it of items) {
    const orderItem = order.items.find(oi => oi.id === it.orderItemId)
    if (!orderItem) {
      return NextResponse.json({ error: 'Invalid order item' }, { status: 400 })
    }
    const remaining = orderItem.qty - orderItem.deliveredQty
    const delivering = Number(it.qty) || 0
    if (delivering <= 0) {
      return NextResponse.json({ error: 'Quantity must be greater than zero' }, { status: 400 })
    }
    if (delivering > remaining) {
      return NextResponse.json({
        error: `Cannot deliver more than remaining quantity for item. Remaining: ${remaining}`
      }, { status: 400 })
    }
  }

  // Generate delivery ID
  const today = new Date()
  const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
  const todayCount = await db.delivery.count({
    where: { deliveryId: { startsWith: `DLV-${ymd}` } }
  })
  const deliveryId = await generateOrderId('DLV', todayCount)

  // Create delivery and update deliveredQty in transaction
  const result = await db.$transaction(async (tx) => {
    const delivery = await tx.delivery.create({
      data: {
        deliveryId,
        orderId,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : new Date(),
        note: note || null,
        items: {
          create: items.map((it: any) => ({
            orderItemId: it.orderItemId,
            qty: Number(it.qty) || 0
          }))
        }
      },
      include: {
        items: { include: { orderItem: { include: { item: true } } } }
      }
    })

    // Update each sales order item's deliveredQty
    for (const it of items) {
      const oi = await tx.salesOrderItem.findUnique({ where: { id: it.orderItemId } })
      if (oi) {
        await tx.salesOrderItem.update({
          where: { id: it.orderItemId },
          data: { deliveredQty: oi.deliveredQty + (Number(it.qty) || 0) }
        })
      }
    }

    // Update order status
    const updatedItems = await tx.salesOrderItem.findMany({ where: { orderId } })
    const allFullyDelivered = updatedItems.every(i => i.deliveredQty >= i.qty)
    const anyDelivered = updatedItems.some(i => i.deliveredQty > 0)
    let newStatus = 'full_pending'
    if (allFullyDelivered) newStatus = 'full_delivered'
    else if (anyDelivered) newStatus = 'partial_pending'

    await tx.salesOrder.update({
      where: { id: orderId },
      data: { status: newStatus }
    })

    return delivery
  })

  return NextResponse.json({ delivery: result })
}
