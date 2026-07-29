'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, FileText } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface DeliveryInfo { id: string; label: string; note: string }

export default function SetupDeliveryInfo() {
  const [items, setItems] = useState<DeliveryInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [label, setLabel] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await api.listDeliveryInfo()
      setItems(res.items)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!label.trim() || !note.trim()) { toast.error('Label and note required'); return }
    try {
      await api.createDeliveryInfo({ label: label.trim(), note: note.trim() })
      toast.success('Delivery info saved')
      setLabel(''); setNote(''); setShowForm(false); load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this delivery info?')) return
    try {
      await api.deleteDeliveryInfo(id); toast.success('Deleted'); load()
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
            Save reusable delivery information templates
            <span style={{ display: 'block', marginTop: 2, color: '#555', fontSize: 12 }}>
              Examples: Home Delivery, Office Pickup, Courier Pickup
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
          <Plus size={16} /> Add Info
        </button>
      </div>

      <div style={{ background: '#14161a', border: '1px solid #2a2d33', borderRadius: 16, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ height: 40, background: '#1f2227', borderRadius: 8 }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, border: '2px solid #2a2d33', borderRadius: 12, marginBottom: 8 }}>
              <FileText size={24} color="#666" />
            </div>
            <p style={{ color: '#888' }}>No saved delivery info yet</p>
          </div>
        ) : (
          <div>
            {items.map((it, idx) => (
              <div
                key={it.id}
                style={{
                  padding: '20px 25px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12,
                  borderBottom: idx === items.length - 1 ? 'none' : '1px solid #2a2d33',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div>
                  <p style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{it.label}</p>
                  <p style={{ fontSize: 14, color: '#888', marginTop: 4 }}>{it.note}</p>
                </div>
                <button
                  onClick={() => handleDelete(it.id)}
                  title="Delete"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#666', padding: 0, display: 'inline-flex', transition: '0.3s' }}
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
              <DialogTitle style={{ color: '#fff' }}>Add Delivery Info</DialogTitle>
            </DialogHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ color: '#888', fontSize: 13, display: 'block', marginBottom: 6 }}>
                  Label <span style={{ color: '#ff6b6b' }}>*</span>
                </label>
                <input
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="e.g. Home Delivery"
                  autoFocus
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
                />
              </div>
              <div>
                <label style={{ color: '#888', fontSize: 13, display: 'block', marginBottom: 6 }}>
                  Note <span style={{ color: '#ff6b6b' }}>*</span>
                </label>
                <textarea
                  rows={3}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Delivery instructions/details..."
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
                />
              </div>
            </div>
            <DialogFooter>
              <button
                onClick={() => setShowForm(false)}
                style={{ background: 'transparent', border: '1px solid #2a2d33', color: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 14, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                style={{ background: '#1db954', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
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
