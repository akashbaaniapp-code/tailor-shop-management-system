import { NextRequest, NextResponse } from 'next/server'
import { getSession, ensureSeedUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  await ensureSeedUser()
  const user = await getSession(request)
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 })
  }
  return NextResponse.json({ user })
}
