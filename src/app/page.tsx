'use client'

import { useEffect, useState } from 'react'
import Login from '@/components/Login'
import AppShell from '@/components/AppShell'
import { api, getToken, getUser } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { Skeleton } from '@/components/ui/skeleton'

function getInitialUser() {
  if (typeof window === 'undefined') return null
  return getUser()
}

function getInitialAuthChecked() {
  if (typeof window === 'undefined') return false
  // No token? Nothing to verify, mark checked.
  return !getToken()
}

export default function Home() {
  const [user, setLocalUser] = useState(getInitialUser)
  const [authChecked, setAuthChecked] = useState(getInitialAuthChecked)
  const setUserStore = useAppStore(s => s.setUser)

  useEffect(() => {
    const token = getToken()
    const cachedUser = getUser()
    if (!token) return
    // We have a token — verify with backend
    if (cachedUser) setUserStore(cachedUser)
    let cancelled = false
    api.me().then(res => {
      if (cancelled) return
      if (res.user) {
        setLocalUser(res.user)
        setUserStore(res.user)
      } else {
        setLocalUser(null)
        setUserStore(null)
      }
    }).catch(() => {
      if (cancelled) return
      setLocalUser(null)
      setUserStore(null)
    }).finally(() => {
      if (cancelled) return
      setAuthChecked(true)
    })
    return () => { cancelled = true }
  }, [setUserStore])

  function handleUserChange(u: any) {
    setLocalUser(u)
    setUserStore(u)
  }

  // Sync store user with local user
  useEffect(() => {
    if (user) setUserStore(user)
  }, [user, setUserStore])

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
