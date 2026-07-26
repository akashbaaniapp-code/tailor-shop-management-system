'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { api, setToken, setUser } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { BRAND } from '@/lib/brand'
import { toast } from 'sonner'

export default function Login({ onLogin }: { onLogin?: (u: any) => void }) {
  const setUserStore = useAppStore(s => s.setUser)
  const setAccessibleMenus = useAppStore(s => s.setAccessibleMenus)
  const setAccessibleEntities = useAppStore(s => s.setAccessibleEntities)
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
      if (res.user?.accessibleEntities !== undefined) {
        setAccessibleEntities(res.user.accessibleEntities || [], res.user.accessibleSubEntities || [])
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
    <div
      className="min-h-screen flex justify-center items-center p-5 relative overflow-hidden"
      style={{
        background: '#0b0d0f',
        backgroundImage: `
          radial-gradient(circle at 10% 20%, rgba(212, 223, 58, 0.08) 0%, transparent 40%),
          radial-gradient(circle at 90% 80%, rgba(159, 165, 161, 0.05) 0%, transparent 40%)
        `,
      }}
    >
      {/* Animated shapes */}
      <style>{`
        @keyframes floatAnimation {
          0% { transform: translate(0, 0) scale(1) rotate(0deg); }
          33% { transform: translate(30px, -40px) scale(1.1) rotate(120deg); }
          66% { transform: translate(-20px, 30px) scale(0.9) rotate(240deg); }
          100% { transform: translate(20px, -20px) scale(1.05) rotate(360deg); }
        }
        .floating-shape {
          position: absolute;
          border-radius: 50%;
          opacity: 0.1;
          z-index: 0;
          animation: floatAnimation 20s infinite ease-in-out alternate;
          pointer-events: none;
        }
      `}</style>

      {/* Floating animated shapes */}
      <div
        className="floating-shape"
        style={{
          width: '400px',
          height: '400px',
          background: '#d4df3a',
          top: '-100px',
          right: '-100px',
          animationDuration: '25s',
        }}
      />
      <div
        className="floating-shape"
        style={{
          width: '300px',
          height: '300px',
          background: '#9fa5a1',
          bottom: '-50px',
          left: '-50px',
          animationDuration: '30s',
          animationDelay: '2s',
        }}
      />
      <div
        className="floating-shape"
        style={{
          width: '150px',
          height: '150px',
          background: '#ffffff',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          animationDuration: '18s',
          animationDelay: '1s',
        }}
      />

      {/* Login Card */}
      <div
        className="relative z-10 text-center transition-all duration-500 hover:shadow-[0_0_40px_rgba(212,223,58,0.03)]"
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '50px 45px',
          borderRadius: '32px',
          width: '420px',
          maxWidth: '100%',
          boxShadow: '0 40px 80px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        }}
      >
        {/* Logo Section */}
        <div className="mb-9 flex justify-center">
          <img
            src={BRAND.logoPath}
            alt={BRAND.name}
            className="max-w-[180px] h-auto max-h-[70px] transition-all duration-500 hover:scale-[1.02]"
            style={{
              filter: 'drop-shadow(0 0 15px rgba(255, 255, 255, 0.05))',
            }}
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              const fallback = document.getElementById('text-logo-fallback')
              if (fallback) fallback.style.display = 'block'
            }}
          />
          <div
            id="text-logo-fallback"
            className="hidden"
            style={{
              color: '#e8eae9',
              fontSize: '28px',
              fontWeight: 700,
              letterSpacing: '1px',
              lineHeight: 1.2,
            }}
          >
            FOR THE
            <br />
            <span style={{ color: '#d4df3a' }}>FUTURE</span>
          </div>
        </div>

        <h2 style={{ color: '#ffffff', fontSize: '22px', fontWeight: 500, marginBottom: '8px' }}>
          Welcome Back
        </h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '14px', marginBottom: '35px', letterSpacing: '0.5px' }}>
          Sign in to continue to your dashboard
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username */}
          <div className="relative text-left">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              required
              autoComplete="off"
              className="w-full px-5 py-4 outline-none transition-all duration-300 rounded-2xl"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '14px',
                color: '#ffffff',
              }}
              onFocus={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.08)'
                e.target.style.borderColor = 'rgba(212, 223, 58, 0.3)'
                e.target.style.boxShadow = '0 0 20px rgba(212, 223, 58, 0.04)'
              }}
              onBlur={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.05)'
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          {/* Password */}
          <div className="relative text-left">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              autoComplete="new-password"
              className="w-full px-5 py-4 outline-none transition-all duration-300 rounded-2xl"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '14px',
                color: '#ffffff',
              }}
              onFocus={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.08)'
                e.target.style.borderColor = 'rgba(212, 223, 58, 0.3)'
                e.target.style.boxShadow = '0 0 20px rgba(212, 223, 58, 0.04)'
              }}
              onBlur={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.05)'
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          {/* Login button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-2 rounded-2xl font-semibold cursor-pointer transition-all duration-300 disabled:opacity-50"
            style={{
              background: '#d4df3a',
              color: '#0b0d0f',
              border: 'none',
              fontSize: '16px',
              letterSpacing: '1px',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = '#c4cf2a'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(212, 223, 58, 0.15)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#d4df3a'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.96)'
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Signing in...
              </span>
            ) : (
              'Log In'
            )}
          </button>
        </form>

        {/* Footer tagline */}
        <div
          className="mt-10"
          style={{
            color: 'rgba(255, 255, 255, 0.15)',
            fontSize: '12px',
            fontStyle: 'italic',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
          }}
        >
          Believe in Progress
        </div>
      </div>

      {/* Credit line */}
      <p className="absolute bottom-4 left-0 right-0 text-center text-xs" style={{ color: 'rgba(255, 255, 255, 0.15)' }}>
        Idea and developed by <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>Abdur Rahman Akash</span>
        <br />
        <span style={{ color: 'rgba(255, 255, 255, 0.1)' }}>WhatsApp: +8801534955065</span>
      </p>
    </div>
  )
}
