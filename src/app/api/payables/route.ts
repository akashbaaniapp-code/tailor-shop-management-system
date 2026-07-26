import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { generateOrderId } from '@/lib/utils-server'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const items = await db.payable.findMany({
    include: { payments: true },
    orderBy: { createdAt: 'desc' }
  })
  return NextResponse.json({ items })
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const body = await request.json()
  const { partyName, description, amount, dueDate } = body
  if (!partyName || !amount) return NextResponse.json({ error: 'Party name and amount required' }, { status: 400 })

  const today = new Date()
  const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
  const todayCount = await db.payable.count({
    where: { payableId: { startsWith: `PAY-${ymd}` } }
  })
  const payableId = await generateOrderId('PAY', todayCount)

  const item = await db.payable.create({
    data: {
      payableId,
      partyName,
      description: description || null,
      amount: Number(amount),
      paidAmount: 0,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: 'pending'
    },
    include: { payments: true }
  })
  return NextResponse.json({ item })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  await db.payable.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
