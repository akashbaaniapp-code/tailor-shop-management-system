import { NextRequest, NextResponse } from 'next/server'
import { getSession, ensureSeedUser, getUserAccessibleMenus, getUserPermissions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  await ensureSeedUser()
  const user = await getSession(request)
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 })
  }

  // Fetch accessible menus + entity permissions for this user
  const accessibleMenus = await getUserAccessibleMenus(user.id)
  const permissions = await getUserPermissions(user.id)

  // Build list of entities + sub-entities the user has access to (multi-select)
  const entityIds = new Set<string>()
  const subEntityIds = new Set<string>()
  for (const p of permissions) {
    if (Array.isArray(p.entityIds)) {
      p.entityIds.forEach((id: string) => entityIds.add(id))
    }
    if (Array.isArray(p.subEntityIds)) {
      p.subEntityIds.forEach((id: string) => subEntityIds.add(id))
    }
    if (p.entityId) entityIds.add(p.entityId)
    if (p.subEntityId) subEntityIds.add(p.subEntityId)
  }

  let accessibleEntities: any[] = []
  let accessibleSubEntities: any[] = []
  if (entityIds.size > 0 || subEntityIds.size > 0 || user.role === 'admin') {
    const [allEntities, allSubEntities] = await Promise.all([
      db.entity.findMany({ orderBy: { name: 'asc' } }),
      db.subEntity.findMany({ include: { entity: true }, orderBy: { name: 'asc' } })
    ])
    if (user.role === 'admin') {
      accessibleEntities = allEntities
      accessibleSubEntities = allSubEntities
    } else {
      accessibleEntities = allEntities.filter((e: any) => entityIds.has(e.id))
      accessibleSubEntities = allSubEntities.filter((s: any) =>
        subEntityIds.has(s.id) || (s.entityId && entityIds.has(s.entityId))
      )
    }
  }

  return NextResponse.json({
    user: {
      ...user,
      accessibleMenus,
      accessibleEntities,
      accessibleSubEntities,
      permissions
    }
  })
}
