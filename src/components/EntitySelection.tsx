'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, ChevronRight, CheckCircle2, Layers } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { BRAND } from '@/lib/brand'

export default function EntitySelection() {
  const { user, accessibleEntities, accessibleSubEntities, setSelectedEntityContext, setEntityContextConfirmed } = useAppStore()
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null)
  const [selectedSubEntityId, setSelectedSubEntityId] = useState<string | null>(null)

  function handleSelectEntity(entityId: string | null) {
    setSelectedEntityId(entityId)
    setSelectedSubEntityId(null) // reset sub-entity when entity changes
  }

  function handleSelectSubEntity(subEntityId: string | null) {
    setSelectedSubEntityId(subEntityId)
  }

  function handleConfirm() {
    const entity = selectedEntityId === 'all' || selectedEntityId === null
      ? null
      : accessibleEntities.find(e => e.id === selectedEntityId) || null

    const subEntity = selectedSubEntityId === 'all' || selectedSubEntityId === null
      ? null
      : accessibleSubEntities.find(s => s.id === selectedSubEntityId) || null

    setSelectedEntityContext(entity, subEntity)
    setEntityContextConfirmed(true)
  }

  // Sub-entities filtered by selected entity (if any)
  const visibleSubEntities = selectedEntityId && selectedEntityId !== 'all'
    ? accessibleSubEntities.filter(s => s.entityId === selectedEntityId)
    : accessibleSubEntities

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/40 to-slate-100 p-4">
      <Card className="w-full max-w-3xl shadow-xl border-slate-200">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center overflow-hidden border border-slate-100 mb-3">
            <img src={BRAND.logoPath} alt={BRAND.name} className="w-full h-full object-contain p-2" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            Welcome, {user?.name || user?.username}!
          </CardTitle>
          <p className="text-sm text-slate-600 mt-2">
            Select your working entity to continue. You can change this later from the header.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Entity selection */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-900">
                Select Entity {accessibleEntities.length === 0 && '(no entities assigned)'}
              </h3>
            </div>

            {accessibleEntities.length === 0 ? (
              <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded">
                You don't have any entity assigned. You can proceed with "All Entities" or contact your administrator.
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <button
                  onClick={() => handleSelectEntity('all')}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    selectedEntityId === 'all' || selectedEntityId === null
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">All Entities</p>
                      <p className="text-xs text-slate-500">Show data across all</p>
                    </div>
                    {(selectedEntityId === 'all' || selectedEntityId === null) && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                </button>

                {accessibleEntities.map(e => (
                  <button
                    key={e.id}
                    onClick={() => handleSelectEntity(e.id)}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${
                      selectedEntityId === e.id
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{e.name}</p>
                        {e.address && <p className="text-xs text-slate-500 truncate">{e.address}</p>}
                        {e.contactNumber && <p className="text-xs text-slate-500">📞 {e.contactNumber}</p>}
                      </div>
                      {selectedEntityId === e.id && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sub-entity selection (only show if there are sub-entities under selected entity) */}
          {visibleSubEntities.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-900">Select Sub-Entity (optional)</h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <button
                  onClick={() => handleSelectSubEntity('all')}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    selectedSubEntityId === 'all' || selectedSubEntityId === null
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">All Sub-Entities</p>
                      <p className="text-xs text-slate-500">Under selected entity</p>
                    </div>
                    {(selectedSubEntityId === 'all' || selectedSubEntityId === null) && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                </button>

                {visibleSubEntities.map(s => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectSubEntity(s.id)}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${
                      selectedSubEntityId === s.id
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{s.name}</p>
                        {s.entity?.name && (
                          <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[10px] mt-0.5">
                            {s.entity.name}
                          </Badge>
                        )}
                        {s.address && <p className="text-xs text-slate-500 truncate mt-1">{s.address}</p>}
                      </div>
                      {selectedSubEntityId === s.id && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selection summary */}
          <div className="bg-emerald-50 p-3 rounded-lg">
            <p className="text-xs font-medium text-emerald-900 mb-1">Your selection:</p>
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="secondary" className="bg-white text-slate-700">
                Entity: {selectedEntityId === 'all' || selectedEntityId === null
                  ? 'All'
                  : accessibleEntities.find(e => e.id === selectedEntityId)?.name || 'Unknown'}
              </Badge>
              {visibleSubEntities.length > 0 && (
                <Badge variant="secondary" className="bg-white text-slate-700">
                  Sub-Entity: {selectedSubEntityId === 'all' || selectedSubEntityId === null
                    ? 'All'
                    : visibleSubEntities.find(s => s.id === selectedSubEntityId)?.name || 'Unknown'}
                </Badge>
              )}
            </div>
          </div>

          {/* Confirm button */}
          <Button
            onClick={handleConfirm}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            size="lg"
          >
            Continue <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
