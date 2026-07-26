import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { signToken, ensureSeedUser } from '@/lib/auth'

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

    const isProduction = process.env.NODE_ENV === 'production'
    const response = NextResponse.json({
      user: { id: user.id, username: user.username, name: user.name, role: user.role },
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
