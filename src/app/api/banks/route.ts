import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { getEntityContext, buildEntityWhere } from '@/lib/entity-context'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const ctx = await getEntityContext(request)
  const entityWhere = buildEntityWhere(ctx)
  const items = await db.bank.findMany({ where: entityWhere, orderBy: { bankName: 'asc' } })
  return NextResponse.json({ items })
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const body = await request.json()
  const { bankName, bankTitle, accountNumber, branch, description } = body
  if (!bankName) return NextResponse.json({ error: 'Bank name required' }, { status: 400 })
  const ctx = await getEntityContext(request)
  const item = await db.bank.create({
    data: { bankName, bankTitle, accountNumber, branch, description, entityId: ctx.entityId, subEntityId: ctx.subEntityId }
  })
  return NextResponse.json({ item })
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const body = await request.json()
  const { id, bankName, bankTitle, accountNumber, branch, description } = body
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  const item = await db.bank.update({
    where: { id },
    data: { bankName, bankTitle, accountNumber, branch, description }
  })
  return NextResponse.json({ item })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  await db.bank.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
