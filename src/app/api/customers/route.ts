import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')
  const where = search ? {
    OR: [
      { name: { contains: search } },
      { phone: { contains: search } }
    ]
  } : {}
  const items = await db.customer.findMany({
    where,
    orderBy: { name: 'asc' }
  })
  return NextResponse.json({ items })
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const body = await request.json()
  const { name, phone, address } = body
  if (!name || !phone) {
    return NextResponse.json({ error: 'Name and phone required' }, { status: 400 })
  }
  // Duplicate check by phone
  const existing = await db.customer.findUnique({ where: { phone } })
  if (existing) {
    return NextResponse.json({ error: 'Customer with this contact number already exists', existing }, { status: 400 })
  }
  const item = await db.customer.create({ data: { name, phone, address } })
  return NextResponse.json({ item })
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const body = await request.json()
  const { id, name, phone, address } = body
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  if (phone) {
    const existing = await db.customer.findFirst({
      where: { phone, NOT: { id } }
    })
    if (existing) {
      return NextResponse.json({ error: 'Phone number already used by another customer' }, { status: 400 })
    }
  }
  const item = await db.customer.update({
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
  await db.customer.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
