import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { numberToWords, generateOrderId } from '@/lib/utils-server'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')
  const status = searchParams.get('status')

  const where: any = {}
  if (search) {
    where.OR = [
      { orderId: { contains: search } },
      { customer: { name: { contains: search } } },
      { customer: { phone: { contains: search } } }
    ]
  }
  if (status && status !== 'all') {
    where.status = status
  }

  const orders = await db.salesOrder.findMany({
    where,
    include: {
      customer: true,
      tailor: true,
      items: { include: { item: { include: { uom: true } } } }
    },
    orderBy: { createdAt: 'desc' },
    take: 200
  })

  return NextResponse.json({ orders })
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response

  const body = await request.json()
  const {
    orderDate,
    deliveryDate,
    tailorId,
    customerId,
    salesNote,
    deliveryInfo,
    items,
    discount
  } = body

  if (!customerId || !orderDate) {
    return NextResponse.json({ error: 'Customer and order date required' }, { status: 400 })
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'At least one item required' }, { status: 400 })
  }

  // Generate auto order ID
  const today = new Date()
  const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
  const todayCount = await db.salesOrder.count({
    where: {
      orderId: { startsWith: `SO-${ymd}` }
    }
  })
  const orderId = await generateOrderId('SO', todayCount)

  // Calculate totals
  const subTotal = items.reduce((sum: number, it: any) => sum + (Number(it.total) || 0), 0)
  const discountAmount = Number(discount) || 0
  const grandTotal = subTotal - discountAmount

  // Create sales order with items in transaction
  const order = await db.salesOrder.create({
    data: {
      orderId,
      orderDate: new Date(orderDate),
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
      tailorId: tailorId || null,
      customerId,
      salesNote: salesNote || null,
      deliveryInfo: deliveryInfo || null,
      subTotal,
      discount: discountAmount,
      grandTotal,
      dueAmount: grandTotal,
      status: 'full_pending',
      paymentStatus: 'unpaid',
      items: {
        create: items.map((it: any) => ({
          itemId: it.itemId,
          qty: Number(it.qty) || 0,
          uom: it.uom,
          unitPrice: Number(it.unitPrice) || 0,
          total: Number(it.total) || 0,
          deliveredQty: 0
        }))
      }
    },
    include: {
      customer: true,
      tailor: true,
      items: { include: { item: { include: { uom: true } } } }
    }
  })

  const inWords = numberToWords(grandTotal)

  return NextResponse.json({ order, inWords })
}
