'use client'

import { useEffect, useState } from 'react'
import Login from '@/components/Login'
import AppShell from '@/components/AppShell'
import { api, getToken, getUser } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { Skeleton } from '@/components/ui/skeleton'

export default function Home() {
  // IMPORTANT: Initial state MUST be identical on server and client to avoid
  // React hydration mismatch (error #418). We start in "loading" state and
  // resolve the actual state inside useEffect (which only runs on client).
  const [user, setLocalUser] = useState<any>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const setUserStore = useAppStore(s => s.setUser)

  useEffect(() => {
    let cancelled = false
    const token = getToken()
    const cachedUser = getUser()

    if (!token) {
      // No token — nothing to verify. Mark as checked on next microtask
      // (avoids synchronous setState in effect body lint warning).
      Promise.resolve().then(() => {
        if (!cancelled) setAuthChecked(true)
      })
      return
    }

    // We have a token — verify with backend
    if (cachedUser) setUserStore(cachedUser)

    api.me()
      .then(res => {
        if (cancelled) return
        if (res.user) {
          setLocalUser(res.user)
          setUserStore(res.user)
        } else {
          setLocalUser(null)
          setUserStore(null)
        }
      })
      .catch(() => {
        if (cancelled) return
        setLocalUser(null)
        setUserStore(null)
      })
      .finally(() => {
        if (cancelled) return
        setAuthChecked(true)
      })

    return () => { cancelled = true }
  }, [setUserStore])

  function handleUserChange(u: any) {
    setLocalUser(u)
    setUserStore(u)
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    )
  }

  if (!user) {
    return <Login onLogin={handleUserChange} />
  }

  return <AppShell />
}
