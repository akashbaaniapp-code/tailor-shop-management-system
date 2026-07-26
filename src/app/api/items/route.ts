import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { requireAdmin } from '@/lib/entity-context'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const items = await db.item.findMany({
    include: { uom: true },
    orderBy: { name: 'asc' }
  })
  return NextResponse.json({ items })
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin.response) return admin.response
  const body = await request.json()
  const { name, uomId, unitPrice } = body
  if (!name || !uomId) {
    return NextResponse.json({ error: 'Name and UoM required' }, { status: 400 })
  }
  const item = await db.item.create({
    data: {
      name,
      uomId,
      unitPrice: parseFloat(unitPrice) || 0
    },
    include: { uom: true }
  })
  return NextResponse.json({ item })
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin.response) return admin.response
  const body = await request.json()
  const { id, name, uomId, unitPrice } = body
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  const item = await db.item.update({
    where: { id },
    data: {
      name: name ?? undefined,
      uomId: uomId ?? undefined,
      unitPrice: unitPrice !== undefined ? parseFloat(unitPrice) : undefined
    },
    include: { uom: true }
  })
  return NextResponse.json({ item })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  await db.item.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
