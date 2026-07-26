import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'tailor-shop-dev-secret-key-2024-change-in-production'

export interface SessionUser {
  id: string
  username: string
  name?: string | null
  role: string
}

export async function signToken(user: SessionUser): Promise<string> {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionUser
  } catch {
    return null
  }
}

export async function getSession(request: NextRequest): Promise<SessionUser | null> {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    return verifyToken(token)
  }
  // Try cookie
  const token = request.cookies.get('token')?.value
  if (token) {
    return verifyToken(token)
  }
  return null
}

export async function requireAuth(request: NextRequest) {
  const user = await getSession(request)
  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
  return { user, response: null }
}

/**
 * Check if a user has permission to perform an action on a menu.
 * Admins always have full access. Other users are checked against
 * their UserPermission records.
 *
 * @param userId - User ID
 * @param menuKey - Menu key (e.g. 'sales-orders', 'delivery', 'expense-entry')
 * @param action - 'view' | 'create' | 'edit' | 'delete'
 */
export async function checkPermission(
  userId: string,
  menuKey: string,
  action: 'view' | 'create' | 'edit' | 'delete'
): Promise<boolean> {
  // Look up user
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) return false

  // Admins have full access
  if (user.role === 'admin') return true

  // Find any permission row where menuAccess includes this menuKey
  const permissions = await db.userPermission.findMany({
    where: { userId }
  })

  for (const p of permissions as any[]) {
    let menuAccess: string[] = []
    try {
      menuAccess = p.menuAccess ? JSON.parse(p.menuAccess) : []
    } catch {
      menuAccess = []
    }
    if (!menuAccess.includes(menuKey)) continue

    // Check the action bit
    if (action === 'view' && p.canView) return true
    if (action === 'create' && p.canCreate) return true
    if (action === 'edit' && p.canEdit) return true
    if (action === 'delete' && p.canDelete) return true
  }

  return false
}

/**
 * Get all menu keys the user has view access to.
 * Used by /api/auth/me to send permissions to the client for sidebar filtering.
 */
export async function getUserAccessibleMenus(userId: string): Promise<string[]> {
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) return []
  if (user.role === 'admin') return ['*'] // wildcard = all menus

  const permissions = await db.userPermission.findMany({
    where: { userId }
  })

  const menus = new Set<string>()
  for (const p of permissions as any[]) {
    if (!p.canView) continue
    let menuAccess: string[] = []
    try {
      menuAccess = p.menuAccess ? JSON.parse(p.menuAccess) : []
    } catch {
      menuAccess = []
    }
    menuAccess.forEach(m => menus.add(m))
  }
  return Array.from(menus)
}

/**
 * Get all permission rows for a user (parsed, with menuAccess as array
 * and canView/canCreate/canEdit/canDelete as booleans).
 * Used by /api/auth/login to send to the client for entity selection screen.
 */
export async function getUserPermissions(userId: string): Promise<any[]> {
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) return []
  if (user.role === 'admin') return [] // admin has no restrictions

  const permissions = await db.userPermission.findMany({
    where: { userId }
  })

  return permissions.map((p: any) => ({
    ...p,
    menuAccess: p.menuAccess ? (() => {
      try { return JSON.parse(p.menuAccess) } catch { return [] }
    })() : [],
    canView: !!p.canView,
    canCreate: !!p.canCreate,
    canEdit: !!p.canEdit,
    canDelete: !!p.canDelete
  }))
}

export async function ensureSeedUser() {
  // Check if admin user already exists
  const existing = await db.user.findUnique({ where: { username: 'admin' } })
  if (existing) return

  // Try to create — if race condition causes conflict, ignore
  try {
    await db.user.create({
      data: {
        username: 'admin',
        password: 'admin123',
        name: 'Administrator',
        role: 'admin'
      }
    })
  } catch (err) {
    // Unique constraint violation means another request created it first - fine
    console.log('Seed user creation skipped (likely already exists):', err instanceof Error ? err.message : err)
  }
}
