'use client'

import { useState } from 'react'
import { Building2, CheckCircle2, Layers, ChevronRight, MapPin, Phone, LogOut } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { api, clearToken } from '@/lib/api'
import { BRAND } from '@/lib/brand'
import { toast } from 'sonner'

export default function EntitySelection() {
  const { user, accessibleEntities, accessibleSubEntities, setSelectedEntityContext, setEntityContextConfirmed, setUser, setAccessibleMenus, setAccessibleEntities } = useAppStore()
  const [selection, setSelection] = useState<{ type: 'entity' | 'subEntity'; id: string } | null>(null)

  function handleSelectEntity(entityId: string) { setSelection({ type: 'entity', id: entityId }) }
  function handleSelectSubEntity(subEntityId: string) { setSelection({ type: 'subEntity', id: subEntityId }) }

  function handleConfirm() {
    if (!selection) return
    if (selection.type === 'entity') {
      const entity = accessibleEntities.find(e => e.id === selection.id) || null
      setSelectedEntityContext(entity, null)
    } else {
      const subEntity = accessibleSubEntities.find(s => s.id === selection.id) || null
      const parentEntity = subEntity?.entityId
        ? accessibleEntities.find(e => e.id === subEntity.entityId) || null
        : null
      setSelectedEntityContext(parentEntity, subEntity)
    }
    setEntityContextConfirmed(true)
  }

  async function handleLogout() {
    try {
      await api.logout()
    } catch {}
    clearToken()
    setUser(null)
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('tsms_entity_context')
      sessionStorage.removeItem('tsms_sidebar_collapsed')
    }
    setAccessibleMenus(['*'])
    setAccessibleEntities([], [])
    setSelectedEntityContext(null, null)
    setEntityContextConfirmed(false)
    toast.success('Logged out')
  }

  const hasEntities = accessibleEntities.length > 0
  const hasSubEntities = accessibleSubEntities.length > 0

  if (!hasEntities && !hasSubEntities) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ background: '#0b0d0f' }}>
        <button
          onClick={handleLogout}
          title="Logout"
          className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid #2a2d33',
            color: 'rgba(255,255,255,0.6)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ff6b6b'; e.currentTarget.style.color = '#ff6b6b'; e.currentTarget.style.background = 'rgba(255,107,107,0.05)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2d33'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
        <div className="max-w-md w-full p-8 text-center rounded-3xl" style={{ background: '#14161a', border: '1px solid #2a2d33' }}>
          <Building2 className="w-12 h-12 mx-auto mb-3" style={{ color: '#333' }} />
          <h2 className="text-lg font-bold" style={{ color: '#e8eae9' }}>No Entity Access</h2>
          <p className="text-sm mt-2" style={{ color: '#666' }}>
            You don't have any entity or sub-entity assigned. Please contact your administrator.
          </p>
          <button
            onClick={() => { setSelectedEntityContext(null, null); setEntityContextConfirmed(true) }}
            className="mt-4 px-6 py-2.5 rounded-xl font-medium transition-all duration-300"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #2a2d33', color: '#aaa' }}
          >
            Continue without entity
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex justify-center items-center p-4 relative" style={{ background: '#0b0d0f' }}>
      {/* Logout button — top-right corner */}
      <button
        onClick={handleLogout}
        title="Logout"
        className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid #2a2d33',
          color: 'rgba(255,255,255,0.6)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ff6b6b'; e.currentTarget.style.color = '#ff6b6b'; e.currentTarget.style.background = 'rgba(255,107,107,0.05)' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2d33'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
      >
        <LogOut className="w-4 h-4" />
        <span>Logout</span>
      </button>

      <div
        className="max-w-[800px] w-full rounded-3xl p-10 relative"
        style={{ background: '#14161a', border: '1px solid #2a2d33', boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="rounded-2xl p-2.5" style={{ background: '#fff', boxShadow: '0 4px 15px rgba(255,255,255,0.05)' }}>
            <img src={BRAND.logoPath} alt={BRAND.name} className="max-w-[80px] h-auto" />
          </div>
        </div>

        {/* Welcome */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold" style={{ color: '#6c7a89' }}>
            Welcome, {user?.name || user?.username}!
          </h1>
          <p className="text-sm mt-2" style={{ color: '#666' }}>
            Click on an entity or sub-entity below to enter and start working.
          </p>
        </div>

        {/* Entities */}
        {hasEntities && (
          <>
            <div className="flex items-center gap-2 mt-6 mb-4">
              <Building2 className="w-3.5 h-3.5" style={{ color: '#6c7a89' }} />
              <span className="text-sm font-medium" style={{ color: '#6c7a89' }}>Entities</span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#2a2d33', color: '#888' }}>({accessibleEntities.length})</span>
            </div>
            <div className="space-y-4">
              {accessibleEntities.map(e => {
                const isSelected = selection?.type === 'entity' && selection.id === e.id
                return (
                  <button
                    key={e.id}
                    onClick={() => handleSelectEntity(e.id)}
                    className="w-full p-5 rounded-2xl flex items-center gap-5 transition-all duration-300"
                    style={{
                      background: isSelected ? '#1f2227' : '#1a1c1e',
                      border: isSelected ? '1px solid #d4df3a' : '1px solid #2a2d33',
                      transform: isSelected ? 'translateY(-2px)' : 'none',
                      boxShadow: isSelected ? '0 5px 20px rgba(212,223,58,0.05)' : 'none',
                    }}
                    onMouseEnter={(e2) => { if (!isSelected) { e2.currentTarget.style.borderColor = '#d4df3a'; e2.currentTarget.style.background = '#1f2227'; e2.currentTarget.style.transform = 'translateY(-2px)' } }}
                    onMouseLeave={(e2) => { if (!isSelected) { e2.currentTarget.style.borderColor = '#2a2d33'; e2.currentTarget.style.background = '#1a1c1e'; e2.currentTarget.style.transform = 'none' } }}
                  >
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#0b0d0f' }}>
                      <Building2 className="w-5 h-5" style={{ color: isSelected ? '#d4df3a' : '#888' }} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-base font-semibold" style={{ color: '#fff' }}>{e.name}</p>
                      {e.description && <p className="text-xs mt-0.5" style={{ color: '#888' }}>{e.description}</p>}
                      <div className="mt-2 space-y-1 text-xs" style={{ color: '#666' }}>
                        {e.address && <p className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {e.address}</p>}
                        {e.contactNumber && <p className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {e.contactNumber}</p>}
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: '#d4df3a' }} />}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* Sub-Entities */}
        {hasSubEntities && (
          <>
            <div className="flex items-center gap-2 mt-6 mb-4">
              <Layers className="w-3.5 h-3.5" style={{ color: '#6c7a89' }} />
              <span className="text-sm font-medium" style={{ color: '#6c7a89' }}>Sub-Entities</span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#2a2d33', color: '#888' }}>({accessibleSubEntities.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accessibleSubEntities.map(s => {
                const isSelected = selection?.type === 'subEntity' && selection.id === s.id
                return (
                  <button
                    key={s.id}
                    onClick={() => handleSelectSubEntity(s.id)}
                    className="w-full p-5 rounded-2xl flex flex-col items-start gap-2 transition-all duration-300 text-left"
                    style={{
                      background: isSelected ? '#1f2227' : '#1a1c1e',
                      border: isSelected ? '1px solid #d4df3a' : '1px solid #2a2d33',
                      transform: isSelected ? 'translateY(-2px)' : 'none',
                      boxShadow: isSelected ? '0 5px 20px rgba(212,223,58,0.05)' : 'none',
                    }}
                    onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = '#d4df3a'; e.currentTarget.style.background = '#1f2227'; e.currentTarget.style.transform = 'translateY(-2px)' } }}
                    onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = '#2a2d33'; e.currentTarget.style.background = '#1a1c1e'; e.currentTarget.style.transform = 'none' } }}
                  >
                    <div className="w-full flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold" style={{ color: '#fff' }}>{s.name}</p>
                        {s.entity?.name && (
                          <p className="text-xs mt-0.5" style={{ color: '#888' }}>{s.entity.name}</p>
                        )}
                        {s.description && <p className="text-xs mt-1" style={{ color: '#888' }}>{s.description}</p>}
                        <div className="mt-2 space-y-1 text-xs" style={{ color: '#666' }}>
                          {s.address && <p className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {s.address}</p>}
                          {s.contactNumber && <p className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {s.contactNumber}</p>}
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: '#d4df3a' }} />}
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* Selection summary */}
        <div className="mt-8 p-4 rounded-xl" style={{ background: 'rgba(29,185,84,0.05)', border: '1px solid rgba(29,185,84,0.1)' }}>
          <p className="text-xs font-semibold" style={{ color: '#aaa' }}>Your selection:</p>
          {selection ? (
            <p className="text-sm mt-1" style={{ color: '#1db954' }}>
              {selection.type === 'entity'
                ? `Entity: ${accessibleEntities.find(e => e.id === selection.id)?.name || 'Unknown'}`
                : `Sub-Entity: ${accessibleSubEntities.find(s => s.id === selection.id)?.name || 'Unknown'}`}
            </p>
          ) : (
            <p className="text-sm italic mt-1" style={{ color: '#666' }}>
              Please click on an entity or sub-entity above to select it.
            </p>
          )}
        </div>

        {/* Continue button */}
        <button
          onClick={handleConfirm}
          disabled={!selection}
          className="w-full py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2.5 transition-all duration-300 mt-5 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: '#1db954', color: '#fff', border: 'none' }}
          onMouseEnter={(e) => { if (selection) { e.currentTarget.style.background = '#1aa34a'; e.currentTarget.style.boxShadow = '0 5px 20px rgba(29,185,84,0.3)' } }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#1db954'; e.currentTarget.style.boxShadow = 'none' }}
        >
          Continue <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
