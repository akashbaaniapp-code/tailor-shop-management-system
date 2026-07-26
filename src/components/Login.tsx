'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { api, setToken, setUser } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { BRAND } from '@/lib/brand'
import { toast } from 'sonner'

export default function Login({ onLogin }: { onLogin?: (u: any) => void }) {
  const setUserStore = useAppStore(s => s.setUser)
  const setAccessibleMenus = useAppStore(s => s.setAccessibleMenus)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username || !password) {
      toast.error('Username and password required')
      return
    }
    setLoading(true)
    try {
      const res = await api.login(username, password)
      setToken(res.token)
      setUser(res.user)
      setUserStore(res.user)
      if (res.user?.accessibleMenus) {
        setAccessibleMenus(res.user.accessibleMenus)
      } else {
        setAccessibleMenus(['*'])
      }
      onLogin?.(res.user)
      toast.success('Login successful')
    } catch (err: any) {
      toast.error(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/40 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-slate-200">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-28 h-28 rounded-2xl bg-white shadow-lg flex items-center justify-center overflow-hidden border border-slate-100">
            <img
              src={BRAND.logoPath}
              alt={BRAND.name}
              className="w-full h-full object-contain p-2"
            />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-slate-900 tracking-tight">
              {BRAND.name}
            </CardTitle>
            <p className="text-xs font-medium text-emerald-700 mt-1 uppercase tracking-wider">
              {BRAND.tagline}
            </p>
            <CardDescription className="text-slate-600 mt-2">
              Sign in to manage your sales, deliveries & reports
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="new-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Credit line */}
      <p className="text-xs text-slate-500 mt-6 text-center px-4">
        Idea and developed by <span className="font-semibold text-slate-700">Abdur Rahman Akash</span>
        <br />
        <span className="text-slate-400">WhatsApp: +8801534955065</span>
      </p>
    </div>
  )
}
