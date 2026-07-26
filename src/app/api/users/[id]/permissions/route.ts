import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

function parseIds(val: any): string[] {
  if (!val) return []
  if (Array.isArray(val)) return val
  try { return JSON.parse(val) } catch { return [] }
}

// Get all permissions for a user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response

  // Only admin or the user themselves can view permissions
  if (auth.user?.role !== 'admin' && auth.user?.id !== (await params).id) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { id } = await params
  const permissions = await db.userPermission.findMany({
    where: { userId: id }
  })

  // Parse JSON fields for each permission
  const parsed = permissions.map((p: any) => ({
    ...p,
    menuAccess: parseIds(p.menuAccess),
    entityIds: parseIds(p.entityIds),
    subEntityIds: parseIds(p.subEntityIds),
    canView: !!p.canView,
    canCreate: !!p.canCreate,
    canEdit: !!p.canEdit,
    canDelete: !!p.canDelete
  }))

  return NextResponse.json({ permissions: parsed })
}

// Save (replace) all permissions for a user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  if (auth.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const { permissions } = body

  if (!Array.isArray(permissions)) {
    return NextResponse.json({ error: 'permissions array required' }, { status: 400 })
  }

  // Delete existing permissions for this user
  await db.userPermission.deleteMany({ where: { userId: id } })

  // Insert new permissions
  for (const p of permissions) {
    await db.userPermission.create({
      data: {
        userId: id,
        entityId: null, // legacy single-entity field, kept for backward compat
        subEntityId: null,
        entityIds: JSON.stringify(p.entityIds || []),
        subEntityIds: JSON.stringify(p.subEntityIds || []),
        menuAccess: JSON.stringify(p.menuAccess || []),
        canView: p.canView ? 1 : 0,
        canCreate: p.canCreate ? 1 : 0,
        canEdit: p.canEdit ? 1 : 0,
        canDelete: p.canDelete ? 1 : 0
      }
    })
  }

  return NextResponse.json({ success: true, count: permissions.length })
}

// Delete all permissions for a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  if (auth.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { id } = await params
  await db.userPermission.deleteMany({ where: { userId: id } })
  return NextResponse.json({ success: true })
}
