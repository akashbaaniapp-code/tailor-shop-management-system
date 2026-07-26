import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { requireAdmin } from '@/lib/entity-context'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const items = await db.uoM.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json({ items })
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin.response) return admin.response
  const body = await request.json()
  const { name } = body
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  try {
    const item = await db.uoM.create({ data: { name } })
    return NextResponse.json({ item })
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'UoM name already exists' }, { status: 400 })
    }
    throw err
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin.response) return admin.response
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  await db.uoM.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
