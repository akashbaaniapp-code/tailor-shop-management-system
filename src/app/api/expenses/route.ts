import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  let where: any = {}
  if (from || to) {
    where.expenseDate = {}
    if (from) where.expenseDate.gte = new Date(from)
    if (to) where.expenseDate.lte = new Date(to)
  }

  const items = await db.expense.findMany({
    where,
    orderBy: { expenseDate: 'desc' },
    take: 500
  })
  return NextResponse.json({ items })
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const body = await request.json()
  const { title, category, amount, expenseDate, note } = body
  if (!title || !amount) return NextResponse.json({ error: 'Title and amount required' }, { status: 400 })
  const item = await db.expense.create({
    data: {
      title,
      category: category || 'general',
      amount: Number(amount),
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      note: note || null
    }
  })
  return NextResponse.json({ item })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  await db.expense.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
