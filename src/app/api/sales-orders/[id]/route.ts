import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { numberToWords } from '@/lib/utils-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const { id } = await params

  const order = await db.salesOrder.findUnique({
    where: { id },
    include: {
      customer: true,
      tailor: true,
      items: { include: { item: { include: { uom: true } } } },
      deliveries: { include: { items: { include: { orderItem: { include: { item: true } } } } } },
      bills: true
    }
  })

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  const inWords = numberToWords(order.grandTotal)
  return NextResponse.json({ order, inWords })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const { id } = await params
  const body = await request.json()

  const existing = await db.salesOrder.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const {
    orderDate,
    deliveryDate,
    tailorId,
    customerId,
    salesNote,
    deliveryInfo,
    deliveryName,
    deliveryContact,
    deliveryAddress,
    items,
    discount
  } = body

  // Recalculate totals
  let subTotal = existing.subTotal
  let discountAmount = existing.discount
  let grandTotal = existing.grandTotal

  if (items && Array.isArray(items)) {
    subTotal = items.reduce((sum: number, it: any) => sum + (Number(it.total) || 0), 0)
    discountAmount = Number(discount) || 0
    grandTotal = subTotal - discountAmount
  } else if (discount !== undefined) {
    discountAmount = Number(discount) || 0
    grandTotal = subTotal - discountAmount
  }

  const dueAmount = grandTotal - existing.paidAmount

  // Update order
  await db.salesOrder.update({
    where: { id },
    data: {
      orderDate: orderDate ? new Date(orderDate) : undefined,
      deliveryDate: deliveryDate !== undefined ? (deliveryDate ? new Date(deliveryDate) : null) : undefined,
      tailorId: tailorId !== undefined ? (tailorId || null) : undefined,
      customerId: customerId || undefined,
      salesNote: salesNote !== undefined ? salesNote : undefined,
      deliveryInfo: deliveryInfo !== undefined ? deliveryInfo : undefined,
      deliveryName: deliveryName !== undefined ? deliveryName : undefined,
      deliveryContact: deliveryContact !== undefined ? deliveryContact : undefined,
      deliveryAddress: deliveryAddress !== undefined ? deliveryAddress : undefined,
      subTotal,
      discount: discountAmount,
      grandTotal,
      dueAmount
    }
  })

  // Replace items if provided
  if (items && Array.isArray(items)) {
    await db.salesOrderItem.deleteMany({ where: { orderId: id } })
    for (const it of items) {
      await db.salesOrderItem.create({
        data: {
          orderId: id,
          itemId: it.itemId,
          qty: Number(it.qty) || 0,
          uom: it.uom,
          unitPrice: Number(it.unitPrice) || 0,
          total: Number(it.total) || 0,
          deliveredQty: 0
        }
      })
    }
  }

  const updated = await db.salesOrder.findUnique({
    where: { id },
    include: {
      customer: true,
      tailor: true,
      items: { include: { item: { include: { uom: true } } } },
      deliveries: { include: { items: { include: { orderItem: { include: { item: true } } } } } },
      bills: true
    }
  })

  return NextResponse.json({ order: updated, inWords: numberToWords(updated!.grandTotal) })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const { id } = await params
  await db.salesOrder.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
