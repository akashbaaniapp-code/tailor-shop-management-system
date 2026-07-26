import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { signToken, ensureSeedUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    await ensureSeedUser()
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { username } })
    if (!user || user.password !== password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = await signToken({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role
    })

    const response = NextResponse.json({
      user: { id: user.id, username: user.username, name: user.name, role: user.role },
      token
    })
    response.cookies.set('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    })
    return response
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
