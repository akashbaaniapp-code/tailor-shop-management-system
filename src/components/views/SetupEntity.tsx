'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Trash2, Edit, Layers, ChevronRight, ChevronDown } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface Entity {
  id: string
  name: string
  description?: string | null
  subEntities?: SubEntity[]
}

interface SubEntity {
  id: string
  name: string
  description?: string | null
  entityId: string
  entity?: { id: string; name: string } | null
}

export default function SetupEntity() {
  const [entities, setEntities] = useState<Entity[]>([])
  const [allSubEntities, setAllSubEntities] = useState<SubEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Entity form
  const [showEntityForm, setShowEntityForm] = useState(false)
  const [editEntity, setEditEntity] = useState<Entity | null>(null)
  const [entityName, setEntityName] = useState('')
  const [entityDesc, setEntityDesc] = useState('')

  // Sub-entity form
  const [showSubForm, setShowSubForm] = useState(false)
  const [editSub, setEditSub] = useState<SubEntity | null>(null)
  const [subName, setSubName] = useState('')
  const [subEntityId, setSubEntityId] = useState('')
  const [subDesc, setSubDesc] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [entRes, subRes] = await Promise.all([api.listEntities(), api.listSubEntities()])
      setEntities(entRes.items)
      setAllSubEntities(subRes.items)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  function toggleExpand(id: string) {
    const next = new Set(expandedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpandedIds(next)
  }

  // --- Entity handlers ---
  function openCreateEntity() {
    setEditEntity(null); setEntityName(''); setEntityDesc(''); setShowEntityForm(true)
  }
  function openEditEntity(e: Entity) {
    setEditEntity(e); setEntityName(e.name); setEntityDesc(e.description || ''); setShowEntityForm(true)
  }
  async function handleSaveEntity() {
    if (!entityName.trim()) { toast.error('Name required'); return }
    try {
      if (editEntity) {
        await api.updateEntity({ id: editEntity.id, name: entityName.trim(), description: entityDesc })
        toast.success('Entity updated')
      } else {
        await api.createEntity({ name: entityName.trim(), description: entityDesc })
        toast.success('Entity created')
      }
      setShowEntityForm(false); load()
    } catch (err: any) { toast.error(err.message) }
  }
  async function handleDeleteEntity(id: string) {
    if (!confirm('Delete this entity? All sub-entities under it will also be deleted.')) return
    try { await api.deleteEntity(id); toast.success('Deleted'); load() }
    catch (err: any) { toast.error(err.message) }
  }

  // --- Sub-entity handlers ---
  function openCreateSub(entityId?: string) {
    if (entities.length === 0) { toast.error('Create an entity first'); return }
    setEditSub(null); setSubName(''); setSubDesc('')
    setSubEntityId(entityId || entities[0].id); setShowSubForm(true)
  }
  function openEditSub(s: SubEntity) {
    setEditSub(s); setSubName(s.name); setSubDesc(s.description || '')
    setSubEntityId(s.entityId); setShowSubForm(true)
  }
  async function handleSaveSub() {
    if (!subName.trim()) { toast.error('Name required'); return }
    if (!subEntityId) { toast.error('Entity required'); return }
    try {
      if (editSub) {
        await api.updateSubEntity({ id: editSub.id, name: subName.trim(), entityId: subEntityId, description: subDesc })
        toast.success('Sub-entity updated')
      } else {
        await api.createSubEntity({ name: subName.trim(), entityId: subEntityId, description: subDesc })
        toast.success('Sub-entity created')
      }
      setShowSubForm(false); load()
    } catch (err: any) { toast.error(err.message) }
  }
  async function handleDeleteSub(id: string) {
    if (!confirm('Delete this sub-entity?')) return
    try { await api.deleteSubEntity(id); toast.success('Deleted'); load() }
    catch (err: any) { toast.error(err.message) }
  }

  return (
    <div className="space-y-4">
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-slate-600">
                Create entities (top-level categories) and sub-entities (sub-categories).
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Examples: Entity = "Garment Type", Sub-Entity = "Shirt", "Pant", "Suit".
                Or Entity = "Brand", Sub-Entity = "Aarong", "Yellow", "Levis".
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => openCreateSub()}>
                <Plus className="w-4 h-4 mr-1" /> Add Sub-Entity
              </Button>
              <Button onClick={openCreateEntity} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-1" /> Add Entity
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" /> Entities & Sub-Entities
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : entities.length === 0 ? (
            <div className="text-center py-12">
              <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">No entities yet</p>
              <p className="text-xs text-slate-400 mt-1">Click "Add Entity" to create your first one</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {entities.map(ent => {
                const subEntities = allSubEntities.filter(s => s.entityId === ent.id)
                const isExpanded = expandedIds.has(ent.id)
                return (
                  <div key={ent.id} className="p-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleExpand(ent.id)}
                        className="p-1 rounded hover:bg-slate-100"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{ent.name}</p>
                        {ent.description && <p className="text-xs text-slate-500">{ent.description}</p>}
                      </div>
                      <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                        {subEntities.length} sub-entit{subEntities.length === 1 ? 'y' : 'ies'}
                      </Badge>
                      <Button size="sm" variant="ghost" onClick={() => openCreateSub(ent.id)} title="Add sub-entity">
                        <Plus className="w-4 h-4 text-emerald-600" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEditEntity(ent)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteEntity(ent.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 ml-8 space-y-2">
                        {subEntities.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No sub-entities. Click + to add one.</p>
                        ) : (
                          subEntities.map(s => (
                            <div key={s.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-slate-800">{s.name}</p>
                                {s.description && <p className="text-xs text-slate-500">{s.description}</p>}
                              </div>
                              <Button size="sm" variant="ghost" onClick={() => openEditSub(s)}>
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteSub(s.id)}>
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entity form dialog */}
      {showEntityForm && (
        <Dialog open onOpenChange={setShowEntityForm}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editEntity ? 'Edit Entity' : 'Add Entity'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Name * (unique)</Label>
                <Input value={entityName} onChange={e => setEntityName(e.target.value)} autoFocus placeholder="e.g. Garment Type" />
              </div>
              <div>
                <Label className="text-xs">Description (optional)</Label>
                <Textarea rows={2} value={entityDesc} onChange={e => setEntityDesc(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEntityForm(false)}>Cancel</Button>
              <Button onClick={handleSaveEntity} className="bg-emerald-600 hover:bg-emerald-700">
                {editEntity ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Sub-entity form dialog */}
      {showSubForm && (
        <Dialog open onOpenChange={setShowSubForm}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editSub ? 'Edit Sub-Entity' : 'Add Sub-Entity'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Parent Entity *</Label>
                <Select value={subEntityId} onValueChange={setSubEntityId}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {entities.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Name *</Label>
                <Input value={subName} onChange={e => setSubName(e.target.value)} autoFocus placeholder="e.g. Shirt" />
              </div>
              <div>
                <Label className="text-xs">Description (optional)</Label>
                <Textarea rows={2} value={subDesc} onChange={e => setSubDesc(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSubForm(false)}>Cancel</Button>
              <Button onClick={handleSaveSub} className="bg-emerald-600 hover:bg-emerald-700">
                {editSub ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
