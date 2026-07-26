import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'tailor-shop-secret-key-2024'

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

export async function ensureSeedUser() {
  const count = await db.user.count()
  if (count === 0) {
    await db.user.create({
      data: {
        username: 'admin',
        password: 'admin123',
        name: 'Administrator',
        role: 'admin'
      }
    })
  }
}
