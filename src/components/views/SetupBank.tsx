'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, Edit, Landmark, MapPin, CreditCard, Hash } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface Bank {
  id: string
  bankName: string
  bankTitle?: string | null
  accountNumber?: string | null
  branch?: string | null
  description?: string | null
}

export default function SetupBank() {
  const [items, setItems] = useState<Bank[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Bank | null>(null)
  const [bankName, setBankName] = useState('')
  const [bankTitle, setBankTitle] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [branch, setBranch] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await api.listBanks()
      setItems(res.items)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditItem(null)
    setBankName(''); setBankTitle(''); setAccountNumber(''); setBranch(''); setDescription('')
    setShowForm(true)
  }

  function openEdit(it: Bank) {
    setEditItem(it)
    setBankName(it.bankName); setBankTitle(it.bankTitle || '')
    setAccountNumber(it.accountNumber || ''); setBranch(it.branch || '')
    setDescription(it.description || '')
    setShowForm(true)
  }

  async function handleSave() {
    if (!bankName.trim()) { toast.error('Bank name required'); return }
    try {
      const data = {
        bankName: bankName.trim(),
        bankTitle: bankTitle.trim(),
        accountNumber: accountNumber.trim(),
        branch: branch.trim(),
        description: description.trim(),
      }
      if (editItem) {
        await api.updateBank({ id: editItem.id, ...data })
        toast.success('Bank updated')
      } else {
        await api.createBank(data)
        toast.success('Bank created')
      }
      setShowForm(false); load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this bank? Existing deposits linked to it will lose their bank reference.')) return
    try {
      await api.deleteBank(id); toast.success('Deleted'); load()
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
          flexWrap: 'wrap',
        }}
      >
        <div>
          <p style={{ fontSize: 14, color: '#e8eae9', lineHeight: 1.6, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Landmark size={16} color="#d4df3a" />
            Create bank accounts for recording deposits and tracking transactions
          </p>
          <span style={{ display: 'block', marginTop: 6, color: '#555', fontSize: 12 }}>
            Enter bank name, title, account number, and branch information
          </span>
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
          <Plus size={16} /> Add Bank
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
              <Landmark size={24} color="#666" />
            </div>
            <p style={{ color: '#888' }}>No banks yet</p>
            <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Add your first bank account to start recording deposits</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#ffffff' }}>
                  <th style={{ textAlign: 'left', padding: '16px 10px 16px 25px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0' }}>Bank Name</th>
                  <th style={{ textAlign: 'left', padding: '16px 10px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0' }}>Title</th>
                  <th style={{ textAlign: 'left', padding: '16px 10px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0' }}>Account Number</th>
                  <th style={{ textAlign: 'left', padding: '16px 10px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0' }}>Branch</th>
                  <th style={{ textAlign: 'right', padding: '16px 25px 16px 10px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr
                    key={it.id}
                    style={{ borderBottom: '1px solid #2a2d33' }}
                    onMouseEnter={(e) => {
                      Array.from(e.currentTarget.children).forEach((td) => {
                        ;(td as HTMLElement).style.background = 'rgba(255,255,255,0.02)'
                      })
                    }}
                    onMouseLeave={(e) => {
                      Array.from(e.currentTarget.children).forEach((td) => {
                        ;(td as HTMLElement).style.background = 'transparent'
                      })
                    }}
                  >
                    <td style={{ padding: '16px 10px 16px 25px', color: '#fff', fontWeight: 500 }}>{it.bankName}</td>
                    <td style={{ padding: '16px 10px', color: '#d4df3a' }}>{it.bankTitle || '-'}</td>
                    <td style={{ padding: '16px 10px', color: '#3498db', fontFamily: 'monospace' }}>{it.accountNumber || '-'}</td>
                    <td style={{ padding: '16px 10px', color: '#888' }}>{it.branch || '-'}</td>
                    <td style={{ padding: '16px 25px 16px 10px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 15, color: '#666', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button
                          onClick={() => openEdit(it)}
                          title="Edit"
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#666', padding: 0, display: 'inline-flex', transition: '0.3s' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#3498db')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#666')}
                        >
                          <Edit size={16} />
                        </button>
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form dialog */}
      {showForm && (
        <Dialog open onOpenChange={setShowForm}>
          <DialogContent style={{ background: '#1a1c1e', border: '1px solid #2a2d33', maxWidth: 480 }}>
            <DialogHeader>
              <DialogTitle style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Landmark size={18} color="#d4df3a" />
                {editItem ? 'Edit Bank' : 'Add Bank'}
              </DialogTitle>
            </DialogHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ color: '#888', fontSize: 13, display: 'block', marginBottom: 6 }}>
                  Bank Name <span style={{ color: '#ff6b6b' }}>*</span>
                </label>
                <input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. Dutch Bangla Bank"
                  autoFocus
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
                />
              </div>
              <div>
                <label style={{ color: '#888', fontSize: 13, display: 'block', marginBottom: 6 }}>Bank Title (short name)</label>
                <input
                  value={bankTitle}
                  onChange={(e) => setBankTitle(e.target.value)}
                  placeholder="e.g. DBBL"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
                />
              </div>
              <div>
                <label style={{ color: '#888', fontSize: 13, display: 'block', marginBottom: 6 }}>Account Number</label>
                <input
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g. 1234567890123"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
                />
              </div>
              <div>
                <label style={{ color: '#888', fontSize: 13, display: 'block', marginBottom: 6 }}>Branch</label>
                <input
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="e.g. Dhanmondi Branch"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
                />
              </div>
              <div>
                <label style={{ color: '#888', fontSize: 13, display: 'block', marginBottom: 6 }}>Description (optional)</label>
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
