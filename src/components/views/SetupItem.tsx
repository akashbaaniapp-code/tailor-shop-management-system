'use client'

import { useEffect, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, Edit, Package } from 'lucide-react'
import { api, formatCurrency } from '@/lib/api'
import { toast } from 'sonner'

interface Item { id: string; name: string; uomId: string; uom: { id: string; name: string }; unitPrice: number }
interface UoM { id: string; name: string }

export default function SetupItem() {
  const [items, setItems] = useState<Item[]>([])
  const [uoms, setUoms] = useState<UoM[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Item | null>(null)
  const [name, setName] = useState('')
  const [uomId, setUomId] = useState('')
  const [unitPrice, setUnitPrice] = useState(0)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [i, u] = await Promise.all([api.listItems(), api.listUom()])
      setItems(i.items); setUoms(u.items)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    if (uoms.length === 0) {
      toast.error('Please create UoM first')
      return
    }
    setEditItem(null); setName(''); setUomId(''); setUnitPrice(0); setShowForm(true)
  }

  function openEdit(it: Item) {
    setEditItem(it); setName(it.name); setUomId(it.uomId); setUnitPrice(it.unitPrice); setShowForm(true)
  }

  async function handleSave() {
    if (!name.trim() || !uomId) { toast.error('Name and UoM required'); return }
    try {
      if (editItem) {
        await api.updateItem({ id: editItem.id, name: name.trim(), uomId, unitPrice })
        toast.success('Item updated')
      } else {
        await api.createItem({ name: name.trim(), uomId, unitPrice })
        toast.success('Item created')
      }
      setShowForm(false); load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this item?')) return
    try {
      await api.deleteItem(id); toast.success('Deleted'); load()
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: '#14161a', border: '1px solid #2a2d33', borderRadius: 16, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 14, color: '#666' }}>Manage items/products with their unit price and unit</p>
          <button
            onClick={openCreate}
            style={{ background: '#1db954', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={16} /> Add Item
          </button>
        </div>
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
              <Package size={24} color="#666" />
            </div>
            <p style={{ color: '#888' }}>No items yet</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#1f2227' }}>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: '#888', fontWeight: 500, borderBottom: '1px solid #2a2d33' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: '#888', fontWeight: 500, borderBottom: '1px solid #2a2d33' }}>UoM</th>
                  <th style={{ textAlign: 'right', padding: '10px 16px', color: '#888', fontWeight: 500, borderBottom: '1px solid #2a2d33' }}>Default Unit Price</th>
                  <th style={{ textAlign: 'center', padding: '10px 16px', color: '#888', fontWeight: 500, borderBottom: '1px solid #2a2d33' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map(it => (
                  <tr key={it.id} style={{ borderBottom: '1px solid #1f2227' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '10px 16px', color: '#3498db', fontWeight: 500 }}>{it.name}</td>
                    <td style={{ padding: '10px 16px', color: '#888' }}>{it.uom.name}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: '#1db954', fontWeight: 500 }}>{formatCurrency(it.unitPrice)}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <button
                          onClick={() => openEdit(it)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#666', padding: 4, display: 'inline-flex' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#3498db')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#666')}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(it.id)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#666', padding: 4, display: 'inline-flex' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#ff6b6b')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#666')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <Dialog open onOpenChange={setShowForm}>
          <DialogContent style={{ background: '#1a1c1e', border: '1px solid #2a2d33', maxWidth: 400 }}>
            <DialogHeader>
              <DialogTitle style={{ color: '#fff' }}>{editItem ? 'Edit Item' : 'Add Item'}</DialogTitle>
            </DialogHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ color: '#888', fontSize: 13, display: 'block', marginBottom: 6 }}>
                  Name <span style={{ color: '#ff6b6b' }}>*</span>
                </label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
                />
              </div>
              <div>
                <label style={{ color: '#888', fontSize: 13, display: 'block', marginBottom: 6 }}>
                  UoM <span style={{ color: '#ff6b6b' }}>*</span>
                </label>
                <Select value={uomId} onValueChange={setUomId}>
                  <SelectTrigger style={{ background: '#1a1c1e', border: '1px solid #2a2d33', borderRadius: 10, color: '#fff', width: '100%', height: 38 }}>
                    <SelectValue placeholder="Select UoM" />
                  </SelectTrigger>
                  <SelectContent style={{ background: '#1a1c1e', border: '1px solid #2a2d33', color: '#fff' }}>
                    {uoms.map(u => (
                      <SelectItem key={u.id} value={u.id} style={{ color: '#fff' }}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label style={{ color: '#888', fontSize: 13, display: 'block', marginBottom: 6 }}>Default Unit Price</label>
                <input
                  type="number"
                  value={unitPrice}
                  onChange={e => setUnitPrice(parseFloat(e.target.value) || 0)}
                  style={inputStyle}
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
                {editItem ? 'Update' : 'Create'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
