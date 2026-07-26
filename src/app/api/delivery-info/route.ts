import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const items = await db.deliveryInfo.findMany({ orderBy: { label: 'asc' } })
  return NextResponse.json({ items })
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const body = await request.json()
  const { label, note } = body
  if (!label || !note) return NextResponse.json({ error: 'Label and note required' }, { status: 400 })
  const item = await db.deliveryInfo.create({ data: { label, note } })
  return NextResponse.json({ item })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  await db.deliveryInfo.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
