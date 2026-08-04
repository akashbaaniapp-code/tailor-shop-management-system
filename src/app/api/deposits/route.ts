import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { getEntityContext, buildEntityWhere } from '@/lib/entity-context'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const ctx = await getEntityContext(request)
  const entityWhere = buildEntityWhere(ctx)
  const items = await db.deposit.findMany({
    where: entityWhere,
    orderBy: { depositDate: 'desc' },
    take: 500,
    include: { bank: true, head: true }
  })
  return NextResponse.json({ items })
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const body = await request.json()
  const { title, amount, depositDate, bankId, depositHeadId, note } = body
  if (!title || !amount) return NextResponse.json({ error: 'Title and amount required' }, { status: 400 })
  const ctx = await getEntityContext(request)
  const item = await db.deposit.create({
    data: {
      title,
      amount: Number(amount),
      depositDate: depositDate ? new Date(depositDate) : new Date(),
      bankId: bankId || null,
      depositHeadId: depositHeadId || null,
      note: note || null,
      entityId: ctx.entityId,
      subEntityId: ctx.subEntityId
    }
  })
  return NextResponse.json({ item })
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const body = await request.json()
  const { id, title, amount, depositDate, bankId, depositHeadId, note } = body
  if (!id || !title || !amount) return NextResponse.json({ error: 'ID, title and amount required' }, { status: 400 })
  const item = await db.deposit.update({
    where: { id },
    data: {
      title,
      amount: Number(amount),
      depositDate: depositDate ? new Date(depositDate) : new Date(),
      bankId: bankId || null,
      depositHeadId: depositHeadId || null,
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
  await db.deposit.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
