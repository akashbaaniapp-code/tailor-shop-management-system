import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { requireAdmin, getEntityContext, buildEntityWhere } from '@/lib/entity-context'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const ctx = await getEntityContext(request)
  const entityWhere = buildEntityWhere(ctx)
  const items = await db.deliveryInfo.findMany({
    where: entityWhere, orderBy: { label: 'asc' } })
  return NextResponse.json({ items })
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin.response) return admin.response
  const body = await request.json()
  const { label, note } = body
  if (!label || !note) return NextResponse.json({ error: 'Label and note required' }, { status: 400 })
  const ctx = await getEntityContext(request)
    const item = await db.deliveryInfo.create({ data: { label, note, entityId: ctx.entityId, subEntityId: ctx.subEntityId } })
  return NextResponse.json({ item })
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin.response) return admin.response
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  await db.deliveryInfo.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
