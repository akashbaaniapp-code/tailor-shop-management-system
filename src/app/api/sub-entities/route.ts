import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const { searchParams } = new URL(request.url)
  const entityId = searchParams.get('entityId')

  const where: any = entityId ? { entityId } : {}
  const items = await db.subEntity.findMany({
    where,
    include: { entity: true },
    orderBy: { name: 'asc' }
  })
  return NextResponse.json({ items })
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const body = await request.json()
  const { name, entityId, description, address, contactNumber } = body
  if (!name || !entityId) {
    return NextResponse.json({ error: 'Name and entity required' }, { status: 400 })
  }
  const item = await db.subEntity.create({
    data: { name, entityId, description, address, contactNumber },
    include: { entity: true }
  })
  return NextResponse.json({ item })
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const body = await request.json()
  const { id, name, entityId, description, address, contactNumber } = body
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  const item = await db.subEntity.update({
    where: { id },
    data: { name, entityId, description, address, contactNumber },
    include: { entity: true }
  })
  return NextResponse.json({ item })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  await db.subEntity.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
