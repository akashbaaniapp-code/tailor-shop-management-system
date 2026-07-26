import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// TEMPORARY DEBUG ENDPOINT - safe to remove after troubleshooting
export async function GET() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL_set: !!process.env.DATABASE_URL,
      DATABASE_URL_prefix: process.env.DATABASE_URL?.substring(0, 30),
      DATABASE_AUTH_TOKEN_set: !!process.env.DATABASE_AUTH_TOKEN,
      JWT_SECRET_set: !!process.env.JWT_SECRET,
    }
  }

  // Test DB connection
  try {
    const userCount = await db.user.count()
    diagnostics.db = { ok: true, userCount }

    const adminUser = await db.user.findUnique({ where: { username: 'admin' } })
    diagnostics.adminUserExists = !!adminUser
    if (adminUser) {
      diagnostics.adminUser = {
        id: adminUser.id,
        username: adminUser.username,
        name: adminUser.name,
        role: adminUser.role,
        passwordLength: adminUser.password.length
      }
    }
  } catch (err) {
    diagnostics.db = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack?.split('\n').slice(0, 5).join('\n') : null
    }
  }

  return NextResponse.json(diagnostics)
}
