'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, Edit, Layers, ChevronRight, ChevronDown, MapPin, Phone, Building2 } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface Entity {
  id: string
  name: string
  description?: string | null
  address?: string | null
  contactNumber?: string | null
  subEntities?: SubEntity[]
}

interface SubEntity {
  id: string
  name: string
  description?: string | null
  address?: string | null
  contactNumber?: string | null
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
  const [entityAddress, setEntityAddress] = useState('')
  const [entityContact, setEntityContact] = useState('')

  // Sub-entity form
  const [showSubForm, setShowSubForm] = useState(false)
  const [editSub, setEditSub] = useState<SubEntity | null>(null)
  const [subName, setSubName] = useState('')
  const [subEntityId, setSubEntityId] = useState('')
  const [subDesc, setSubDesc] = useState('')
  const [subAddress, setSubAddress] = useState('')
  const [subContact, setSubContact] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [entRes, subRes] = await Promise.all([api.listEntities(), api.listSubEntities()])
      setEntities(entRes.items)
      setAllSubEntities(subRes.items)
      // Auto-expand first entity on initial load so sub-entities are visible
      if (entRes.items.length > 0 && expandedIds.size === 0) {
        setExpandedIds(new Set([entRes.items[0].id]))
      }
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
    setEditEntity(null); setEntityName(''); setEntityDesc(''); setEntityAddress(''); setEntityContact(''); setShowEntityForm(true)
  }
  function openEditEntity(e: Entity) {
    setEditEntity(e); setEntityName(e.name); setEntityDesc(e.description || '')
    setEntityAddress(e.address || ''); setEntityContact(e.contactNumber || '')
    setShowEntityForm(true)
  }
  async function handleSaveEntity() {
    if (!entityName.trim()) { toast.error('Name required'); return }
    try {
      const data = { name: entityName.trim(), description: entityDesc, address: entityAddress, contactNumber: entityContact }
      if (editEntity) {
        await api.updateEntity({ id: editEntity.id, ...data })
        toast.success('Entity updated')
      } else {
        await api.createEntity(data)
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
    setEditSub(null); setSubName(''); setSubDesc(''); setSubAddress(''); setSubContact('')
    setSubEntityId(entityId || entities[0].id); setShowSubForm(true)
  }
  function openEditSub(s: SubEntity) {
    setEditSub(s); setSubName(s.name); setSubDesc(s.description || '')
    setSubAddress(s.address || ''); setSubContact(s.contactNumber || '')
    setSubEntityId(s.entityId); setShowSubForm(true)
  }
  async function handleSaveSub() {
    if (!subName.trim()) { toast.error('Name required'); return }
    if (!subEntityId) { toast.error('Entity required'); return }
    try {
      const data = { name: subName.trim(), entityId: subEntityId, description: subDesc, address: subAddress, contactNumber: subContact }
      if (editSub) {
        await api.updateSubEntity({ id: editSub.id, ...data })
        toast.success('Sub-entity updated')
      } else {
        await api.createSubEntity(data)
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

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#0b0d0f',
    border: '1px solid #2a2d33',
    borderRadius: 10,
    padding: '8px 12px',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
  }

  const selectStyle: React.CSSProperties = {
    width: '100%',
    background: '#0b0d0f',
    border: '1px solid #2a2d33',
    borderRadius: 10,
    padding: '8px 12px',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    appearance: 'none',
    cursor: 'pointer',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 25 }}>
      {/* Control / Instruction Card */}
      <div
        style={{
          background: '#14161a',
          border: '1px solid #2a2d33',
          borderRadius: 16,
          padding: 25,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: 240 }}>
          <h4 style={{ fontSize: 15, fontWeight: 500, color: '#e8eae9', margin: '0 0 4px 0' }}>
            Create entities (top-level) and sub-entities (sub-categories)
          </h4>
          <span style={{ fontSize: 13, color: '#555', display: 'block', lineHeight: 1.6 }}>
            Examples: Entity = "Brand", Sub-Entity = "Aarong", "Yellow", "Levis". Or Entity = "Garment Type", Sub-Entity = "Shirt", "Pant", "Suit".
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => openCreateSub()}
            style={{
              background: 'transparent',
              border: '1px solid #2a2d33',
              color: '#aaa',
              padding: '10px 20px',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: '0.3s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#555'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = '#1f2227' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2d33'; e.currentTarget.style.color = '#aaa'; e.currentTarget.style.background = 'transparent' }}
          >
            <Plus size={14} /> Add Sub-Entity
          </button>
          <button
            onClick={openCreateEntity}
            style={{
              background: '#1db954',
              color: '#fff',
              border: 'none',
              padding: '10px 24px',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: '0.3s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#1aa34a')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#1db954')}
          >
            <Plus size={14} /> Add Entity
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 25 }}>
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              style={{
                background: '#14161a',
                border: '1px solid #2a2d33',
                borderRadius: 16,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ height: 50, background: '#1f2227', borderRadius: 8 }} />
              <div style={{ height: 60, background: '#1f2227', borderRadius: 10 }} />
            </div>
          ))}
        </div>
      ) : entities.length === 0 ? (
        // Empty state
        <div
          style={{
            background: '#14161a',
            border: '1px solid #2a2d33',
            borderRadius: 16,
            textAlign: 'center',
            padding: '48px 0',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              border: '2px solid #2a2d33',
              borderRadius: 12,
              marginBottom: 8,
            }}
          >
            <Layers size={24} color="#666" />
          </div>
          <p style={{ color: '#888' }}>No entities yet</p>
          <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Click "Add Entity" to create your first one</p>
        </div>
      ) : (
        // Nested Parent & Sub-Entities Cards
        entities.map((ent) => {
          const subEntities = allSubEntities.filter((s) => s.entityId === ent.id)
          const isExpanded = expandedIds.has(ent.id)
          return (
            <div
              key={ent.id}
              style={{
                background: '#14161a',
                border: '1px solid #2a2d33',
                borderRadius: 16,
                padding: 20,
              }}
            >
              {/* Parent Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 15px',
                  cursor: 'pointer',
                  gap: 15,
                  flexWrap: 'wrap',
                }}
                onClick={() => toggleExpand(ent.id)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 240 }}>
                  <div style={{ color: '#888', fontSize: 14, marginTop: 4, display: 'inline-flex' }}>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>{ent.name}</div>
                    {ent.description && (
                      <div style={{ fontSize: 14, color: '#888', marginBottom: 6 }}>{ent.description}</div>
                    )}
                    <div style={{ display: 'flex', gap: 15, fontSize: 13, color: '#666', flexWrap: 'wrap' }}>
                      {ent.address && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={12} /> {ent.address}
                        </span>
                      )}
                      {ent.contactNumber && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Phone size={12} /> {ent.contactNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 15, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      background: '#1f2227',
                      border: '1px solid #2a2d33',
                      color: '#aaa',
                      padding: '4px 12px',
                      borderRadius: 50,
                      fontSize: 12,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {subEntities.length} sub-entit{subEntities.length === 1 ? 'y' : 'ies'}
                  </span>
                  <div style={{ display: 'flex', gap: 12, color: '#666' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); openCreateSub(ent.id) }}
                      title="Add sub-entity"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#666',
                        padding: 0,
                        display: 'inline-flex',
                        transition: '0.3s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#1db954')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#666')}
                    >
                      <Plus size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditEntity(ent) }}
                      title="Edit"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#666',
                        padding: 0,
                        display: 'inline-flex',
                        transition: '0.3s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#3498db')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#666')}
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteEntity(ent.id) }}
                      title="Delete"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#666',
                        padding: 0,
                        display: 'inline-flex',
                        transition: '0.3s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#ff6b6b')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#666')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Nested Sub-Entities (only when expanded) */}
              {isExpanded && (
                <div
                  style={{
                    marginTop: 10,
                    padding: '0 15px 10px 15px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  {subEntities.length === 0 ? (
                    <div
                      style={{
                        background: '#0b0d0f',
                        border: '1px dashed #2a2d33',
                        borderRadius: 12,
                        padding: '15px 20px',
                        textAlign: 'center',
                        color: '#555',
                        fontSize: 13,
                        fontStyle: 'italic',
                      }}
                    >
                      No sub-entities. Click + to add one.
                    </div>
                  ) : (
                    subEntities.map((s) => (
                      <div
                        key={s.id}
                        style={{
                          background: '#0b0d0f',
                          border: '1px solid #2a2d33',
                          borderRadius: 12,
                          padding: '15px 20px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 15,
                          flexWrap: 'wrap',
                          transition: '0.3s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#3a3d43')}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 220 }}>
                          <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{s.name}</div>
                          {s.description && <div style={{ fontSize: 13, color: '#888' }}>{s.description}</div>}
                          <div style={{ display: 'flex', gap: 15, fontSize: 12, color: '#666', marginTop: 2, flexWrap: 'wrap' }}>
                            {s.address && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <MapPin size={12} /> {s.address}
                              </span>
                            )}
                            {s.contactNumber && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Phone size={12} /> {s.contactNumber}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, color: '#666' }}>
                          <button
                            onClick={() => openEditSub(s)}
                            title="Edit"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#666',
                              padding: 0,
                              display: 'inline-flex',
                              transition: '0.3s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#3498db')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#666')}
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteSub(s.id)}
                            title="Delete"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#666',
                              padding: 0,
                              display: 'inline-flex',
                              transition: '0.3s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#ff6b6b')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#666')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })
      )}

      {/* Entity form dialog */}
      {showEntityForm && (
        <Dialog open onOpenChange={setShowEntityForm}>
          <DialogContent style={{ background: '#1a1c1e', border: '1px solid #2a2d33', maxWidth: 480 }}>
            <DialogHeader>
              <DialogTitle style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 size={18} color="#d4df3a" />
                {editEntity ? 'Edit Entity' : 'Add Entity'}
              </DialogTitle>
            </DialogHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ color: '#888', fontSize: 13, display: 'block', marginBottom: 6 }}>
                  Name <span style={{ color: '#ff6b6b' }}>*</span> (unique)
                </label>
                <input
                  value={entityName}
                  onChange={(e) => setEntityName(e.target.value)}
                  placeholder="e.g. Brand"
                  autoFocus
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
                />
              </div>
              <div>
                <label style={{ color: '#888', fontSize: 13, display: 'block', marginBottom: 6 }}>Description (optional)</label>
                <textarea
                  rows={2}
                  value={entityDesc}
                  onChange={(e) => setEntityDesc(e.target.value)}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
                />
              </div>
              <div>
                <label style={{ color: '#888', fontSize: 13, display: 'block', marginBottom: 6 }}>Address (optional)</label>
                <textarea
                  rows={2}
                  value={entityAddress}
                  onChange={(e) => setEntityAddress(e.target.value)}
                  placeholder="House, road, area, city"
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
                />
              </div>
              <div>
                <label style={{ color: '#888', fontSize: 13, display: 'block', marginBottom: 6 }}>Contact Number (optional)</label>
                <input
                  value={entityContact}
                  onChange={(e) => setEntityContact(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
                />
              </div>
            </div>
            <DialogFooter>
              <button
                onClick={() => setShowEntityForm(false)}
                style={{ background: 'transparent', border: '1px solid #2a2d33', color: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 14, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEntity}
                style={{ background: '#1db954', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
              >
                {editEntity ? 'Update' : 'Create'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Sub-entity form dialog */}
      {showSubForm && (
        <Dialog open onOpenChange={setShowSubForm}>
          <DialogContent style={{ background: '#1a1c1e', border: '1px solid #2a2d33', maxWidth: 480 }}>
            <DialogHeader>
              <DialogTitle style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Layers size={18} color="#d4df3a" />
                {editSub ? 'Edit Sub-Entity' : 'Add Sub-Entity'}
              </DialogTitle>
            </DialogHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ color: '#888', fontSize: 13, display: 'block', marginBottom: 6 }}>
                  Parent Entity <span style={{ color: '#ff6b6b' }}>*</span>
                </label>
                <select
                  value={subEntityId}
                  onChange={(e) => setSubEntityId(e.target.value)}
                  style={selectStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
                >
                  {entities.map((e) => (
                    <option key={e.id} value={e.id} style={{ background: '#0b0d0f' }}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ color: '#888', fontSize: 13, display: 'block', marginBottom: 6 }}>
                  Name <span style={{ color: '#ff6b6b' }}>*</span>
                </label>
                <input
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  placeholder="e.g. Shirt"
                  autoFocus
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
                />
              </div>
              <div>
                <label style={{ color: '#888', fontSize: 13, display: 'block', marginBottom: 6 }}>Description (optional)</label>
                <textarea
                  rows={2}
                  value={subDesc}
                  onChange={(e) => setSubDesc(e.target.value)}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
                />
              </div>
              <div>
                <label style={{ color: '#888', fontSize: 13, display: 'block', marginBottom: 6 }}>Address (optional)</label>
                <textarea
                  rows={2}
                  value={subAddress}
                  onChange={(e) => setSubAddress(e.target.value)}
                  placeholder="House, road, area, city"
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
                />
              </div>
              <div>
                <label style={{ color: '#888', fontSize: 13, display: 'block', marginBottom: 6 }}>Contact Number (optional)</label>
                <input
                  value={subContact}
                  onChange={(e) => setSubContact(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
                />
              </div>
            </div>
            <DialogFooter>
              <button
                onClick={() => setShowSubForm(false)}
                style={{ background: 'transparent', border: '1px solid #2a2d33', color: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 14, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSub}
                style={{ background: '#1db954', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
              >
                {editSub ? 'Update' : 'Create'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
