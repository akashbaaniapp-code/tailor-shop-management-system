import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// Get current user from auth
async function getCurrentUser(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return null
  return auth.user
}

// Check if user is admin
async function requireAdmin(request: NextRequest) {
  const user = await getCurrentUser(request)
  if (!user) {
    return { user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  if (user.role !== 'admin') {
    return { user: null, response: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) }
  }
  return { user, response: null }
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin.response) return admin.response
  const items = await db.user.findMany({ orderBy: { createdAt: 'desc' } })
  // Don't return passwords
  const safeItems = items.map((u: any) => ({ ...u, password: undefined }))
  return NextResponse.json({ items: safeItems })
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin.response) return admin.response
  const body = await request.json()
  const { username, password, name, role } = body

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
  }

  // Valid roles
  const validRoles = ['admin', 'manager', 'staff']
  const userRole = validRoles.includes(role) ? role : 'staff'

  // Check if username already exists
  const existing = await db.user.findUnique({ where: { username } })
  if (existing) {
    return NextResponse.json({ error: 'Username already exists' }, { status: 400 })
  }

  const item = await db.user.create({
    data: { username, password, name, role: userRole }
  })
  return NextResponse.json({ item: { ...item, password: undefined } })
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin.response) return admin.response
  const body = await request.json()
  const { id, username, password, name, role } = body

  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  // Check username uniqueness (excluding current user)
  if (username) {
    const existing = await db.user.findFirst({ where: { username, NOT: { id } } })
    if (existing) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 400 })
    }
  }

  const validRoles = ['admin', 'manager', 'staff']
  const data: any = {}
  if (username !== undefined) data.username = username
  if (password !== undefined && password) data.password = password
  if (name !== undefined) data.name = name
  if (role !== undefined && validRoles.includes(role)) data.role = role

  const item = await db.user.update({ where: { id }, data })
  return NextResponse.json({ item: { ...item, password: undefined } })
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin.response) return admin.response
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  // Prevent self-deletion
  if (admin.user && admin.user.id === id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  await db.user.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
