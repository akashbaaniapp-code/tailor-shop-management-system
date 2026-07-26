import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

/**
 * Entity context — extracted from request headers sent by the client.
 * The client sends X-Entity-Id and X-Sub-Entity-Id headers based on the
 * entity the user selected after login.
 *
 * For admin users (mother company), entity context may be null — they see all data.
 * For non-admin users, entity context is required — they only see their entity's data.
 */
export interface EntityContext {
  entityId: string | null
  subEntityId: string | null
}

export async function getEntityContext(request: NextRequest): Promise<EntityContext> {
  const entityId = request.headers.get('x-entity-id') || null
  const subEntityId = request.headers.get('x-sub-entity-id') || null
  return { entityId, subEntityId }
}

/**
 * Build a WHERE clause fragment for filtering transactions by entity context.
 * Returns { sql, args } that can be appended to a query.
 *
 * Logic:
 * - If subEntityId is set: filter by subEntityId (most specific)
 * - Else if entityId is set: filter by entityId (and subEntityId IS NULL, to get entity-level data)
 * - Else: no filter (admin sees all, or legacy data without entity)
 *
 * For admin with no entity context: returns empty (sees everything).
 */
export function buildEntityFilter(ctx: EntityContext, alias?: string): { sql: string; args: any[] } {
  const prefix = alias ? `${alias}.` : ''
  const conditions: string[] = []
  const args: any[] = []

  if (ctx.subEntityId) {
    conditions.push(`${prefix}"subEntityId" = ?`)
    args.push(ctx.subEntityId)
  } else if (ctx.entityId) {
    // Entity-level: match entityId AND subEntityId is NULL
    // (so we don't accidentally include sub-entity data)
    conditions.push(`(${prefix}"entityId" = ? OR ${prefix}"entityId" IS NULL)`)
    args.push(ctx.entityId)
  }

  if (conditions.length === 0) {
    return { sql: '', args: [] }
  }

  return { sql: conditions.join(' AND '), args }
}

/**
 * Build a Prisma-style "where" object for entity filtering.
 * Used with our custom db wrapper's findMany({ where }) method.
 */
export function buildEntityWhere(ctx: EntityContext): any {
  if (ctx.subEntityId) {
    return { subEntityId: ctx.subEntityId }
  }
  if (ctx.entityId) {
    // Entity-level: match this entityId, including rows where subEntityId is null
    return { OR: [{ entityId: ctx.entityId }, { entityId: null, subEntityId: null }] }
  }
  return {} // no filter
}

/**
 * Check if the current user is admin. Master data creation is admin-only.
 */
export async function requireAdmin(request: NextRequest) {
  const auth = (await import('@/lib/auth')).requireAuth
  const result = await auth(request)
  if (result.response) return { user: null, response: result.response }
  if (result.user?.role !== 'admin') {
    const { NextResponse } = await import('next/server')
    return {
      user: null,
      response: NextResponse.json({
        error: 'Admin access required. Master data can only be created by administrators at the mother company level.'
      }, { status: 403 })
    }
  }
  return { user: result.user, response: null }
}
