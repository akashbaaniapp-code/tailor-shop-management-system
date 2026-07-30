import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { requireAdmin, getEntityContext, buildEntityWhere } from '@/lib/entity-context'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const ctx = await getEntityContext(request)
  const entityWhere = buildEntityWhere(ctx)
  const items = await db.tailor.findMany({
    where: entityWhere, orderBy: { name: 'asc' } })
  return NextResponse.json({ items })
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin.response) return admin.response
  const body = await request.json()
  const { name, phone, address } = body
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  const ctx = await getEntityContext(request)
    const item = await db.tailor.create({ data: { name, phone, address, entityId: ctx.entityId, subEntityId: ctx.subEntityId } })
  return NextResponse.json({ item })
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin.response) return admin.response
  const body = await request.json()
  const { id, name, phone, address } = body
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  const item = await db.tailor.update({
    where: { id },
    data: { name, phone, address }
  })
  return NextResponse.json({ item })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  await db.tailor.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
