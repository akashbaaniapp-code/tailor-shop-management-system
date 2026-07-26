import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response

  const body = await request.json()
  const { payableId, amount, payDate, note } = body

  if (!payableId || !amount) {
    return NextResponse.json({ error: 'Payable ID and amount required' }, { status: 400 })
  }

  const payable = await db.payable.findUnique({
    where: { id: payableId },
    include: { payments: true }
  })
  if (!payable) return NextResponse.json({ error: 'Payable not found' }, { status: 404 })

  const amt = Number(amount)
  const remaining = payable.amount - payable.paidAmount
  if (amt > remaining + 0.01) {
    return NextResponse.json({ error: `Amount exceeds remaining. Remaining: ${remaining}` }, { status: 400 })
  }

  const result = await db.$transaction(async (tx) => {
    const payment = await tx.payablePayment.create({
      data: {
        payableId,
        amount: amt,
        payDate: payDate ? new Date(payDate) : new Date(),
        note: note || null
      }
    })

    const newPaid = payable.paidAmount + amt
    let status = 'pending'
    if (newPaid >= payable.amount - 0.01) status = 'paid'
    else if (newPaid > 0) status = 'partial'

    await tx.payable.update({
      where: { id: payableId },
      data: { paidAmount: newPaid, status }
    })

    return payment
  })

  return NextResponse.json({ payment: result })
}
