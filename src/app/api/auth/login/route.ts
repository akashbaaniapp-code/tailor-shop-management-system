import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { signToken, ensureSeedUser, getUserAccessibleMenus, getUserPermissions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Ensure admin user exists (idempotent)
    try {
      await ensureSeedUser()
    } catch (seedErr) {
      console.error('Seed user error:', seedErr)
      // Continue anyway — maybe user already exists
    }

    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { username } })
    if (!user) {
      console.warn('Login failed: user not found:', username)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
    if (user.password !== password) {
      console.warn('Login failed: password mismatch for user:', username)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = await signToken({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role
    })

    // Fetch accessible menus + entity permissions for this user
    // (non-admin users get filtered sidebar + entity selection screen)
    const accessibleMenus = await getUserAccessibleMenus(user.id)
    const permissions = await getUserPermissions(user.id)

    // Build list of entities + sub-entities the user has access to
    // (for entity selection screen after login)
    const entityIds = new Set<string>()
    const subEntityIds = new Set<string>()
    for (const p of permissions) {
      if (p.entityId) entityIds.add(p.entityId)
      if (p.subEntityId) subEntityIds.add(p.subEntityId)
    }

    // Fetch entity + sub-entity names
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
        // Sub-entities: include those directly allowed, or those under allowed entities
        accessibleSubEntities = allSubEntities.filter((s: any) =>
          subEntityIds.has(s.id) || (s.entityId && entityIds.has(s.entityId))
        )
      }
    }

    const isProduction = process.env.NODE_ENV === 'production'
    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        accessibleMenus,
        accessibleEntities,
        accessibleSubEntities,
        permissions
      },
      token
    })
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    })
    return response
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json(
      { error: 'Login failed', detail: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
