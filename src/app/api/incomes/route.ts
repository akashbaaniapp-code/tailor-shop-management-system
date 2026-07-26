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
    where.incomeDate = {}
    if (from) where.incomeDate.gte = new Date(from)
    if (to) where.incomeDate.lte = new Date(to)
  }

  const items = await db.income.findMany({
    where,
    orderBy: { incomeDate: 'desc' },
    take: 500
  })
  return NextResponse.json({ items })
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const body = await request.json()
  const { title, category, amount, incomeDate, note } = body
  if (!title || !amount) return NextResponse.json({ error: 'Title and amount required' }, { status: 400 })
  const item = await db.income.create({
    data: {
      title,
      category: category || 'general',
      amount: Number(amount),
      incomeDate: incomeDate ? new Date(incomeDate) : new Date(),
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
  await db.income.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
