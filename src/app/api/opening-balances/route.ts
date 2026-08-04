import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { getEntityContext, buildEntityWhere } from '@/lib/entity-context'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const ctx = await getEntityContext(request)
  const entityWhere = buildEntityWhere(ctx)
  const items = await db.openingBalance.findMany({
    where: entityWhere,
    orderBy: { asOfDate: 'desc' },
    take: 100,
  })
  return NextResponse.json({ items })
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const body = await request.json()
  const { label, amount, asOfDate, note } = body
  if (!label) return NextResponse.json({ error: 'Label required' }, { status: 400 })
  const ctx = await getEntityContext(request)
  const item = await db.openingBalance.create({
    data: {
      label,
      amount: Number(amount) || 0,
      asOfDate: asOfDate ? new Date(asOfDate) : new Date(),
      note: note || null,
      entityId: ctx.entityId,
      subEntityId: ctx.subEntityId,
    },
  })
  return NextResponse.json({ item })
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const body = await request.json()
  const { id, label, amount, asOfDate, note } = body
  if (!id || !label) return NextResponse.json({ error: 'ID and label required' }, { status: 400 })
  const item = await db.openingBalance.update({
    where: { id },
    data: {
      label,
      amount: Number(amount) || 0,
      asOfDate: asOfDate ? new Date(asOfDate) : new Date(),
      note: note || null,
    },
  })
  return NextResponse.json({ item })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  await db.openingBalance.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
