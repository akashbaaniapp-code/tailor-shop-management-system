'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, Edit, Wallet } from 'lucide-react'
import { api, formatCurrency, formatDate } from '@/lib/api'
import { toast } from 'sonner'

interface OpeningBalance {
  id: string
  label: string
  amount: number
  asOfDate: string
  note?: string | null
}

export default function SetupOpeningBalance() {
  const [items, setItems] = useState<OpeningBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<OpeningBalance | null>(null)
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState(0)
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await api.listOpeningBalances()
      setItems(res.items)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditItem(null); setLabel(''); setAmount(0); setNote('')
    setAsOfDate(new Date().toISOString().split('T')[0])
    setShowForm(true)
  }

  function openEdit(it: OpeningBalance) {
    setEditItem(it); setLabel(it.label); setAmount(it.amount)
    setAsOfDate(new Date(it.asOfDate).toISOString().split('T')[0])
    setNote(it.note || '')
    setShowForm(true)
  }

  async function handleSave() {
    if (!label.trim()) { toast.error('Label required'); return }
    try {
      const data = { label: label.trim(), amount: Number(amount) || 0, asOfDate, note }
      if (editItem) {
        await api.updateOpeningBalance({ id: editItem.id, ...data })
        toast.success('Opening balance updated')
      } else {
        await api.createOpeningBalance(data)
        toast.success('Opening balance created')
      }
      setShowForm(false); load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this opening balance entry?')) return
    try {
      await api.deleteOpeningBalance(id); toast.success('Deleted'); load()
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

  const totalAmount = items.reduce((s, it) => s + it.amount, 0)

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
            <Wallet size={16} color="#d4df3a" />
            Record opening balances for cash-in-hand, bank balances, or any starting amount
          </p>
          <span style={{ display: 'block', marginTop: 6, color: '#555', fontSize: 12 }}>
            Examples: Cash in Hand, Bank Balance — DBBL, Cash Register Opening
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
          <Plus size={16} /> Add Opening Balance
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
              <Wallet size={24} color="#666" />
            </div>
            <p style={{ color: '#888' }}>No opening balances yet</p>
            <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Add your first opening balance to get started</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#ffffff' }}>
                  <th style={{ textAlign: 'left', padding: '16px 10px 16px 25px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0' }}>Label</th>
                  <th style={{ textAlign: 'left', padding: '16px 10px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0' }}>As Of Date</th>
                  <th style={{ textAlign: 'right', padding: '16px 10px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0' }}>Amount</th>
                  <th style={{ textAlign: 'left', padding: '16px 10px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0' }}>Note</th>
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
                    <td style={{ padding: '16px 10px 16px 25px', color: '#fff', fontWeight: 500 }}>{it.label}</td>
                    <td style={{ padding: '16px 10px', color: '#888' }}>{formatDate(it.asOfDate)}</td>
                    <td style={{ padding: '16px 10px', textAlign: 'right', color: '#d4df3a', fontWeight: 600 }}>{formatCurrency(it.amount)}</td>
                    <td style={{ padding: '16px 10px', color: '#888' }}>{it.note || '-'}</td>
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
              <tfoot>
                <tr style={{ borderTop: '2px solid #2a2d33', background: '#1f2227' }}>
                  <td colSpan={2} style={{ padding: '14px 10px 14px 25px', fontWeight: 700, textAlign: 'right', color: '#fff' }}>
                    Total
                  </td>
                  <td style={{ padding: '14px 10px', textAlign: 'right', fontWeight: 700, color: '#d4df3a' }}>
                    {formatCurrency(totalAmount)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Form dialog */}
      {showForm && (
        <Dialog open onOpenChange={setShowForm}>
          <DialogContent style={{ background: '#1a1c1e', border: '1px solid #2a2d33', maxWidth: 400 }}>
            <DialogHeader>
              <DialogTitle style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wallet size={18} color="#d4df3a" />
                {editItem ? 'Edit Opening Balance' : 'Add Opening Balance'}
              </DialogTitle>
            </DialogHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ color: '#888', fontSize: 13, display: 'block', marginBottom: 6 }}>
                  Label <span style={{ color: '#ff6b6b' }}>*</span>
                </label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Cash in Hand"
                  autoFocus
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
                />
              </div>
              <div>
                <label style={{ color: '#888', fontSize: 13, display: 'block', marginBottom: 6 }}>Amount</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
                />
              </div>
              <div>
                <label style={{ color: '#888', fontSize: 13, display: 'block', marginBottom: 6 }}>As Of Date</label>
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
                />
              </div>
              <div>
                <label style={{ color: '#888', fontSize: 13, display: 'block', marginBottom: 6 }}>Note (optional)</label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
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
