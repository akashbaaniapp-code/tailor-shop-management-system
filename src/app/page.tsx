'use client'

import { useEffect, useState } from 'react'
import Login from '@/components/Login'
import AppShell from '@/components/AppShell'
import EntitySelection from '@/components/EntitySelection'
import { api, getToken, getUser, setUser } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { Skeleton } from '@/components/ui/skeleton'

export default function Home() {
  // Subscribe to user from store — this re-renders when logout sets it to null
  const user = useAppStore(s => s.user)
  const setUserStore = useAppStore(s => s.setUser)
  const setAccessibleMenus = useAppStore(s => s.setAccessibleMenus)
  const setAccessibleEntities = useAppStore(s => s.setAccessibleEntities)
  const entityContextConfirmed = useAppStore(s => s.entityContextConfirmed)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    let cancelled = false
    const token = getToken()

    if (!token) {
      Promise.resolve().then(() => {
        if (!cancelled) setAuthChecked(true)
      })
      return
    }

    // We have a token — verify with backend
    // (Don't pre-set cachedUser so accessibleMenus isn't stale)
    api.me()
      .then(res => {
        if (cancelled) return
        if (res.user) {
          setUserStore(res.user)
          setUser(res.user) // persist to localStorage
          // Set accessible menus + entities for sidebar filtering + entity selection
          if (res.user.accessibleMenus) {
            setAccessibleMenus(res.user.accessibleMenus)
          }
          if (res.user.accessibleEntities !== undefined) {
            setAccessibleEntities(res.user.accessibleEntities, res.user.accessibleSubEntities || [])
          }
        } else {
          setUserStore(null)
        }
      })
      .catch(() => {
        if (cancelled) return
        setUserStore(null)
      })
      .finally(() => {
        if (cancelled) return
        setAuthChecked(true)
      })

    return () => { cancelled = true }
  }, [setUserStore, setAccessibleMenus, setAccessibleEntities])

  function handleLogin(u: any) {
    setUserStore(u)
    setUser(u) // persist to localStorage
    if (u?.accessibleMenus) {
      setAccessibleMenus(u.accessibleMenus)
    } else {
      setAccessibleMenus(['*'])
    }
    if (u?.accessibleEntities !== undefined) {
      setAccessibleEntities(u.accessibleEntities || [], u.accessibleSubEntities || [])
    }
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    )
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  // If user is non-admin AND has entity-restricted permissions,
  // show entity selection screen before allowing access to app.
  // Admin role OR users with no entity permissions skip this.
  const hasEntityRestrictions =
    user.role !== 'admin' &&
    (user.accessibleEntities?.length > 0 || user.accessibleSubEntities?.length > 0)

  if (hasEntityRestrictions && !entityContextConfirmed) {
    return <EntitySelection />
  }

  return <AppShell />
}
