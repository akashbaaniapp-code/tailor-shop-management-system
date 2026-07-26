'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, CheckCircle2, Layers, ChevronRight, MapPin, Phone, Globe } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { BRAND } from '@/lib/brand'

export default function EntitySelection() {
  const { user, accessibleEntities, accessibleSubEntities, setSelectedEntityContext, setEntityContextConfirmed } = useAppStore()
  // Track selection: can be 'all' (admin only), an entity, or a sub-entity
  const [selection, setSelection] = useState<{ type: 'all' | 'entity' | 'subEntity'; id?: string } | null>(null)

  const isAdmin = user?.role === 'admin'

  function handleSelectAll() {
    setSelection({ type: 'all' })
  }

  function handleSelectEntity(entityId: string) {
    setSelection({ type: 'entity', id: entityId })
  }

  function handleSelectSubEntity(subEntityId: string) {
    setSelection({ type: 'subEntity', id: subEntityId })
  }

  function handleConfirm() {
    if (!selection) return

    if (selection.type === 'all') {
      // Admin sees all data — no entity filter
      setSelectedEntityContext(null, null)
    } else if (selection.type === 'entity') {
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

  const hasEntities = accessibleEntities.length > 0
  const hasSubEntities = accessibleSubEntities.length > 0

  // If user has no entities or sub-entities assigned, just confirm and continue
  if (!hasEntities && !hasSubEntities) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/40 to-slate-100 p-4">
        <Card className="w-full max-w-md shadow-xl border-slate-200">
          <CardContent className="p-8 text-center">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-slate-900">No Entity Access</h2>
            <p className="text-sm text-slate-600 mt-2">
              You don't have any entity or sub-entity assigned. Please contact your administrator to get access.
            </p>
            <Button
              onClick={() => {
                setSelectedEntityContext(null, null)
                setEntityContextConfirmed(true)
              }}
              variant="outline"
              className="mt-4"
            >
              Continue without entity
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/40 to-slate-100 p-4">
      <Card className="w-full max-w-4xl shadow-xl border-slate-200">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center overflow-hidden border border-slate-100 mb-3">
            <img src={BRAND.logoPath} alt={BRAND.name} className="w-full h-full object-contain p-2" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            Welcome, {user?.name || user?.username}!
          </CardTitle>
          <p className="text-sm text-slate-600 mt-2">
            {isAdmin
              ? 'Select an entity to work in, or choose "All Entities" to see everything.'
              : 'Click on an entity or sub-entity below to enter and start working.'
            }
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* All Entities option — admin only */}
          {isAdmin && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-slate-900">Overview (Admin)</h3>
              </div>
              <button
                onClick={handleSelectAll}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  selection?.type === 'all'
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Globe className={`w-6 h-6 ${selection?.type === 'all' ? 'text-blue-600' : 'text-slate-400'}`} />
                    <div>
                      <p className="text-sm font-bold text-slate-900">All Entities</p>
                      <p className="text-xs text-slate-500">View data across all entities (admin overview)</p>
                    </div>
                  </div>
                  {selection?.type === 'all' && (
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  )}
                </div>
              </button>
            </div>
          )}

          {/* Entities */}
          {hasEntities && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-900">Entities</h3>
                <span className="text-xs text-slate-500">({accessibleEntities.length})</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {accessibleEntities.map(e => {
                  const isSelected = selection?.type === 'entity' && selection.id === e.id
                  return (
                    <button
                      key={e.id}
                      onClick={() => handleSelectEntity(e.id)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 shadow-md'
                          : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-900 truncate">{e.name}</p>
                          {e.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{e.description}</p>}
                          {e.address && (
                            <p className="text-xs text-slate-600 mt-1.5 flex items-start gap-1">
                              <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                              <span className="line-clamp-2">{e.address}</span>
                            </p>
                          )}
                          {e.contactNumber && (
                            <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {e.contactNumber}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Sub-Entities */}
          {hasSubEntities && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-900">Sub-Entities</h3>
                <span className="text-xs text-slate-500">({accessibleSubEntities.length})</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {accessibleSubEntities.map(s => {
                  const isSelected = selection?.type === 'subEntity' && selection.id === s.id
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleSelectSubEntity(s.id)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 shadow-md'
                          : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-900 truncate">{s.name}</p>
                          {s.entity?.name && (
                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[10px] mt-1">
                              {s.entity.name}
                            </Badge>
                          )}
                          {s.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{s.description}</p>}
                          {s.address && (
                            <p className="text-xs text-slate-600 mt-1.5 flex items-start gap-1">
                              <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                              <span className="line-clamp-2">{s.address}</span>
                            </p>
                          )}
                          {s.contactNumber && (
                            <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {s.contactNumber}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Selection summary + Continue */}
          <div className={`p-3 rounded-lg ${selection?.type === 'all' ? 'bg-blue-50' : 'bg-emerald-50'}`}>
            <p className={`text-xs font-medium mb-1 ${selection?.type === 'all' ? 'text-blue-900' : 'text-emerald-900'}`}>
              Your selection:
            </p>
            {selection ? (
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary" className={`${
                  selection.type === 'all'
                    ? 'bg-white text-blue-700'
                    : 'bg-white text-slate-700'
                }`}>
                  {selection.type === 'all'
                    ? 'All Entities (Admin Overview)'
                    : selection.type === 'entity'
                    ? `Entity: ${accessibleEntities.find(e => e.id === selection.id)?.name || 'Unknown'}`
                    : `Sub-Entity: ${accessibleSubEntities.find(s => s.id === selection.id)?.name || 'Unknown'}`
                  }
                </Badge>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">
                {isAdmin
                  ? 'Choose "All Entities" for overview, or click a specific entity to work in.'
                  : 'Please click on an entity or sub-entity above to select it.'
                }
              </p>
            )}
          </div>

          <Button
            onClick={handleConfirm}
            disabled={!selection}
            className={`w-full disabled:opacity-50 disabled:cursor-not-allowed ${
              selection?.type === 'all'
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
            size="lg"
          >
            Continue <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
