'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, Edit, Tag } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface ExpenseHead {
  id: string
  name: string
  description?: string | null
}

export default function SetupExpenseHead() {
  const [items, setItems] = useState<ExpenseHead[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<ExpenseHead | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await api.listExpenseHeads()
      setItems(res.items)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditItem(null); setName(''); setDescription(''); setShowForm(true)
  }

  function openEdit(it: ExpenseHead) {
    setEditItem(it); setName(it.name); setDescription(it.description || ''); setShowForm(true)
  }

  async function handleSave() {
    if (!name.trim()) { toast.error('Name required'); return }
    try {
      if (editItem) {
        await api.updateExpenseHead({ id: editItem.id, name: name.trim(), description })
        toast.success('Expense head updated')
      } else {
        await api.createExpenseHead({ name: name.trim(), description })
        toast.success('Expense head created')
      }
      setShowForm(false); load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this expense head? Existing expenses linked to it will keep their records but show "no head".')) return
    try {
      await api.deleteExpenseHead(id); toast.success('Deleted'); load()
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
          <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6, margin: 0 }}>
            Create expense heads (categories) for organizing your expenses
            <span style={{ display: 'block', marginTop: 2, color: '#555', fontSize: 12 }}>
              Examples: Rent, Salary, Utility Bill, Fabric Purchase, Electricity, Transport
            </span>
          </p>
        </div>
        <button
          onClick={openCreate}
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
          <Plus size={16} /> Add Head
        </button>
      </div>

      {/* Data Table Card */}
      <div style={{ background: '#14161a', border: '1px solid #2a2d33', borderRadius: 16, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ height: 40, background: '#1f2227', borderRadius: 8 }} />
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
              <Tag size={24} color="#666" />
            </div>
            <p style={{ color: '#888' }}>No expense heads yet</p>
            <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
              Create one to start categorizing your expenses
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#1f2227' }}>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '14px 10px 14px 25px',
                      color: '#888',
                      fontWeight: 500,
                      borderBottom: '1px solid #2a2d33',
                    }}
                  >
                    Name
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '14px 10px',
                      color: '#888',
                      fontWeight: 500,
                      borderBottom: '1px solid #2a2d33',
                    }}
                  >
                    Description
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '14px 25px 14px 10px',
                      color: '#888',
                      fontWeight: 500,
                      borderBottom: '1px solid #2a2d33',
                    }}
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr
                    key={it.id}
                    style={{ borderBottom: '1px solid #1f2227' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '14px 10px 14px 25px', color: '#fff', fontWeight: 500 }}>
                      {it.name}
                    </td>
                    <td style={{ padding: '14px 10px', color: '#888' }}>{it.description || '-'}</td>
                    <td style={{ padding: '14px 25px 14px 10px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 15, color: '#666', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button
                          onClick={() => openEdit(it)}
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
                          onClick={() => handleDelete(it.id)}
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
              <DialogTitle style={{ color: '#fff' }}>{editItem ? 'Edit Expense Head' : 'Add Expense Head'}</DialogTitle>
            </DialogHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ color: '#888', fontSize: 13, display: 'block', marginBottom: 6 }}>
                  Name <span style={{ color: '#ff6b6b' }}>*</span> (unique)
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rent"
                  autoFocus
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
                />
              </div>
              <div>
                <label style={{ color: '#888', fontSize: 13, display: 'block', marginBottom: 6 }}>
                  Description (optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description..."
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
                />
              </div>
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
                {editItem ? 'Update' : 'Create'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
