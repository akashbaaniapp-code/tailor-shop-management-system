import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { generateOrderId } from '@/lib/utils-server'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response

  const { searchParams } = new URL(request.url)
  const orderId = searchParams.get('orderId')

  let where: any = {}
  if (orderId) where.orderId = orderId

  const bills = await db.billCollection.findMany({
    where,
    include: { order: { include: { customer: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200
  })

  return NextResponse.json({ bills })
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response

  const body = await request.json()
  const { orderId, amount, collectDate, method, note } = body

  if (!orderId || !amount) {
    return NextResponse.json({ error: 'Order ID and amount required' }, { status: 400 })
  }

  const order = await db.salesOrder.findUnique({ where: { id: orderId } })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const amt = Number(amount)
  if (amt > order.dueAmount + 0.01) {
    return NextResponse.json({
      error: `Amount exceeds due. Due: ${order.dueAmount}`
    }, { status: 400 })
  }

  // Generate bill ID
  const today = new Date()
  const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
  const todayCount = await db.billCollection.count({
    where: { billId: { startsWith: `BILL-${ymd}` } }
  })
  const billId = await generateOrderId('BILL', todayCount)

  const result = await db.$transaction(async (tx) => {
    const bill = await tx.billCollection.create({
      data: {
        billId,
        orderId,
        amount: amt,
        collectDate: collectDate ? new Date(collectDate) : new Date(),
        method: method || 'cash',
        note: note || null
      }
    })

    const newPaid = order.paidAmount + amt
    const newDue = order.grandTotal - newPaid
    let paymentStatus = 'unpaid'
    if (newDue <= 0.01) paymentStatus = 'paid'
    else if (newPaid > 0) paymentStatus = 'partial'

    await tx.salesOrder.update({
      where: { id: orderId },
      data: {
        paidAmount: newPaid,
        dueAmount: newDue,
        paymentStatus
      }
    })

    return bill
  })

  return NextResponse.json({ bill: result })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const bill = await db.billCollection.findUnique({ where: { id } })
  if (!bill) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.$transaction(async (tx) => {
    await tx.billCollection.delete({ where: { id } })
    const order = await tx.salesOrder.findUnique({ where: { id: bill.orderId } })
    if (order) {
      const newPaid = order.paidAmount - bill.amount
      const newDue = order.grandTotal - newPaid
      let paymentStatus = 'unpaid'
      if (newDue <= 0.01) paymentStatus = 'paid'
      else if (newPaid > 0) paymentStatus = 'partial'
      await tx.salesOrder.update({
        where: { id: bill.orderId },
        data: { paidAmount: newPaid, dueAmount: newDue, paymentStatus }
      })
    }
  })

  return NextResponse.json({ success: true })
}
