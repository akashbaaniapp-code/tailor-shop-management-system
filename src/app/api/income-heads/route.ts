import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { requireAdmin, getEntityContext, buildEntityWhere } from '@/lib/entity-context'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const ctx = await getEntityContext(request)
  const entityWhere = buildEntityWhere(ctx)
  const items = await db.incomeHead.findMany({
    where: entityWhere, orderBy: { name: 'asc' } })
  return NextResponse.json({ items })
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin.response) return admin.response
  const body = await request.json()
  const { name, description } = body
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  try {
    const ctx = await getEntityContext(request)
    const item = await db.incomeHead.create({ data: { name, description, entityId: ctx.entityId, subEntityId: ctx.subEntityId } })
    return NextResponse.json({ item })
  } catch (err: any) {
    if (err?.message?.includes('UNIQUE') || err?.message?.includes('unique')) {
      return NextResponse.json({ error: 'Income head name already exists' }, { status: 400 })
    }
    throw err
  }
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin.response) return admin.response
  const body = await request.json()
  const { id, name, description } = body
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  const item = await db.incomeHead.update({
    where: { id },
    data: { name, description }
  })
  return NextResponse.json({ item })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  await db.incomeHead.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
