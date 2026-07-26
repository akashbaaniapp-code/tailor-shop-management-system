'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, Edit, Users, Search } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface Customer { id: string; name: string; phone: string; address?: string }

export default function SetupCustomer() {
  const [items, setItems] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Customer | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await api.listCustomers(search || undefined)
      setItems(res.items)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [search])

  function openCreate() {
    setEditItem(null); setName(''); setPhone(''); setAddress(''); setShowForm(true)
  }

  function openEdit(it: Customer) {
    setEditItem(it); setName(it.name); setPhone(it.phone); setAddress(it.address || ''); setShowForm(true)
  }

  async function handleSave() {
    if (!name.trim() || !phone.trim()) { toast.error('Name and phone required'); return }
    try {
      if (editItem) {
        await api.updateCustomer({ id: editItem.id, name: name.trim(), phone: phone.trim(), address })
        toast.success('Customer updated')
      } else {
        await api.createCustomer({ name: name.trim(), phone: phone.trim(), address })
        toast.success('Customer created')
      }
      setShowForm(false); load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this customer?')) return
    try {
      await api.deleteCustomer(id); toast.success('Deleted'); load()
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <Search size={16} color="#888" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or phone..."
              style={{ ...inputStyle, paddingLeft: 36 }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
            />
          </div>
          <button
            onClick={openCreate}
            style={{ background: '#1db954', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={16} /> Add Customer
          </button>
        </div>
        <p style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
          Note: Contact number must be unique. System will block duplicate entries automatically.
        </p>
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
              <Users size={24} color="#666" />
            </div>
            <p style={{ color: '#888' }}>No customers yet</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#1f2227' }}>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: '#888', fontWeight: 500, borderBottom: '1px solid #2a2d33' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: '#888', fontWeight: 500, borderBottom: '1px solid #2a2d33' }}>Phone</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', color: '#888', fontWeight: 500, borderBottom: '1px solid #2a2d33' }}>Address</th>
                  <th style={{ textAlign: 'center', padding: '10px 16px', color: '#888', fontWeight: 500, borderBottom: '1px solid #2a2d33' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map(it => (
                  <tr key={it.id} style={{ borderBottom: '1px solid #1f2227' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '10px 16px', color: '#fff', fontWeight: 500 }}>{it.name}</td>
                    <td style={{ padding: '10px 16px', color: '#888', fontFamily: 'monospace' }}>{it.phone}</td>
                    <td style={{ padding: '10px 16px', color: '#888' }}>{it.address || '-'}</td>
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
              <DialogTitle style={{ color: '#fff' }}>{editItem ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
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
                  Contact Number <span style={{ color: '#ff6b6b' }}>*</span> (unique)
                </label>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
                />
                <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Duplicates will be blocked automatically</p>
              </div>
              <div>
                <label style={{ color: '#888', fontSize: 13, display: 'block', marginBottom: 6 }}>Address</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={e => setAddress(e.target.value)}
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
                {editItem ? 'Update' : 'Create'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
