'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, Ruler } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

export default function SetupUom() {
  const [items, setItems] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await api.listUom()
      setItems(res.items)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!name.trim()) { toast.error('Name required'); return }
    try {
      await api.createUom(name.trim())
      toast.success('UoM created')
      setName(''); setShowForm(false); load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this UoM?')) return
    try {
      await api.deleteUom(id)
      toast.success('Deleted')
      load()
    } catch (err: any) {
      toast.error(err.message)
    }
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 25 }}>
      {/* Control Card */}
      <div
        style={{
          background: '#14161a',
          border: '1px solid #2a2d33',
          borderRadius: 16,
          padding: 25,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 20,
        }}
      >
        <div>
          <p style={{ fontSize: 14, color: '#e8eae9', lineHeight: 1.6, margin: 0 }}>
            Manage units of measure for your items
            <span style={{ display: 'block', marginTop: 2, color: '#555', fontSize: 12 }}>
              Examples: Piece, Meter, Dozen, Kg, Foot, Set
            </span>
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{
            background: '#1db954',
            color: '#fff',
            border: 'none',
            padding: '10px 24px',
            borderRadius: 10,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 14,
            transition: '0.3s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#1aa34a')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#1db954')}
        >
          <Plus size={16} /> Add UoM
        </button>
      </div>

      {/* Grid Card */}
      <div
        style={{
          background: '#14161a',
          border: '1px solid #2a2d33',
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: 25, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ height: 56, background: '#1f2227', borderRadius: 10 }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
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
              <Ruler size={24} color="#666" />
            </div>
            <p style={{ color: '#888' }}>No UoM yet</p>
            <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Add your first unit of measure</p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 12,
              padding: 25,
            }}
          >
            {items.map((it) => (
              <div
                key={it.id}
                style={{
                  border: '1px solid #2a2d33',
                  borderRadius: 12,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#0b0d0f',
                  transition: '0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#d4df3a'
                  e.currentTarget.style.background = '#1f2227'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#2a2d33'
                  e.currentTarget.style.background = '#0b0d0f'
                }}
              >
                <span style={{ color: '#fff', fontWeight: 500, fontSize: 14 }}>{it.name}</span>
                <button
                  onClick={() => handleDelete(it.id)}
                  title="Delete"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#666',
                    padding: 4,
                    display: 'inline-flex',
                    transition: '0.3s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ff6b6b')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#666')}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <Dialog open onOpenChange={setShowForm}>
          <DialogContent style={{ background: '#1a1c1e', border: '1px solid #2a2d33', maxWidth: 400 }}>
            <DialogHeader>
              <DialogTitle style={{ color: '#fff' }}>Add UoM</DialogTitle>
            </DialogHeader>
            <div>
              <label style={{ color: '#888', fontSize: 13, display: 'block', marginBottom: 6 }}>
                Name <span style={{ color: '#ff6b6b' }}>*</span> (unique)
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Piece"
                autoFocus
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
              />
            </div>
            <DialogFooter>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid #2a2d33',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '8px 14px',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                style={{
                  background: '#1db954',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '8px 14px',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Save
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
