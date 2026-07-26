import { NextRequest, NextResponse } from 'next/server'
import { getSession, ensureSeedUser, getUserAccessibleMenus } from '@/lib/auth'

export async function GET(request: NextRequest) {
  await ensureSeedUser()
  const user = await getSession(request)
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 })
  }

  // Fetch accessible menus for sidebar filtering
  const accessibleMenus = await getUserAccessibleMenus(user.id)

  return NextResponse.json({ user: { ...user, accessibleMenus } })
}
