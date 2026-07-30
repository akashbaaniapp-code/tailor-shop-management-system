'use client'

import { useEffect, useState } from 'react'
import Login from '@/components/Login'
import AppShell from '@/components/AppShell'
import EntitySelection from '@/components/EntitySelection'
import { api, getToken, getUser, setUser, prefetchAll } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { Skeleton } from '@/components/ui/skeleton'

// Setup data endpoints to prefetch immediately after login/entity selection.
// These power dropdowns across the app (items, tailors, customers, etc.).
// With localStorage caching, subsequent loads feel INSTANT (0ms).
const SETUP_ENDPOINTS = [
  '/api/uom',
  '/api/items',
  '/api/tailors',
  '/api/customers',
  '/api/expense-heads',
  '/api/income-heads',
  '/api/deposit-heads',
  '/api/banks',
  '/api/delivery-info',
  '/api/entities',
  '/api/sub-entities',
]

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

  // Show entity selection screen for:
  // - Non-admin users with entity-restricted permissions (mandatory — no "All" option)
  // - Admin users who have entities created (optional — admin gets "All Entities" option)
  const hasEntities = user.accessibleEntities?.length > 0 || user.accessibleSubEntities?.length > 0
  const showEntitySelection = hasEntities && !entityContextConfirmed

  if (showEntitySelection) {
    return <EntitySelection />
  }

  // AppShell is about to render — prefetch setup data in the background
  // so all dropdowns (items, tailors, customers, etc.) are instantly available
  // when the user opens forms. With localStorage caching, this is a no-op on
  // subsequent page loads (data already cached for 30 min).
  prefetchAll(SETUP_ENDPOINTS)

  return <AppShell />
}
