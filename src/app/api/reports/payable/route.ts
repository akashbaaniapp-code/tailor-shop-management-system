import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response

  const payables = await db.payable.findMany({
    include: { payments: true },
    orderBy: { createdAt: 'desc' }
  })

  const rows = payables.map(p => ({
    payableId: p.payableId,
    partyName: p.partyName,
    description: p.description,
    amount: p.amount,
    paidAmount: p.paidAmount,
    dueAmount: p.amount - p.paidAmount,
    dueDate: p.dueDate,
    status: p.status,
    createdAt: p.createdAt
  }))

  const totalAmount = payables.reduce((s, p) => s + p.amount, 0)
  const totalPaid = payables.reduce((s, p) => s + p.paidAmount, 0)
  const totalDue = totalAmount - totalPaid

  return NextResponse.json({
    rows,
    totalAmount,
    totalPaid,
    totalDue,
    count: payables.length
  })
}
