'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, Edit, Tag, TrendingDown, TrendingUp } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface Head {
  id: string
  name: string
  description?: string | null
}

type TabKey = 'expense' | 'income'

export default function SetupExpenseHead() {
  const [activeTab, setActiveTab] = useState<TabKey>('expense')

  // Expense heads state
  const [expenseItems, setExpenseItems] = useState<Head[]>([])
  const [expenseLoading, setExpenseLoading] = useState(true)

  // Income heads state
  const [incomeItems, setIncomeItems] = useState<Head[]>([])
  const [incomeLoading, setIncomeLoading] = useState(true)

  // Form state (shared between both tabs, re-used for whichever tab is active)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Head | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    loadExpense()
    loadIncome()
  }, [])

  async function loadExpense() {
    setExpenseLoading(true)
    try {
      const res = await api.listExpenseHeads()
      setExpenseItems(res.items)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setExpenseLoading(false)
    }
  }

  async function loadIncome() {
    setIncomeLoading(true)
    try {
      const res = await api.listIncomeHeads()
      setIncomeItems(res.items)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIncomeLoading(false)
    }
  }

  function openCreate() {
    setEditItem(null)
    setName('')
    setDescription('')
    setShowForm(true)
  }

  function openEdit(it: Head) {
    setEditItem(it)
    setName(it.name)
    setDescription(it.description || '')
    setShowForm(true)
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Name required')
      return
    }
    try {
      if (activeTab === 'expense') {
        if (editItem) {
          await api.updateExpenseHead({ id: editItem.id, name: name.trim(), description })
          toast.success('Expense head updated')
        } else {
          await api.createExpenseHead({ name: name.trim(), description })
          toast.success('Expense head created')
        }
        loadExpense()
      } else {
        if (editItem) {
          await api.updateIncomeHead({ id: editItem.id, name: name.trim(), description })
          toast.success('Income head updated')
        } else {
          await api.createIncomeHead({ name: name.trim(), description })
          toast.success('Income head created')
        }
        loadIncome()
      }
      setShowForm(false)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function handleDelete(id: string) {
    const kind = activeTab === 'expense' ? 'expense' : 'income'
    const msg =
      activeTab === 'expense'
        ? 'Delete this expense head? Existing expenses linked to it will keep their records but show "no head".'
        : 'Delete this income head? Existing incomes linked to it will keep their records but show "no head".'
    if (!confirm(msg)) return
    try {
      if (activeTab === 'expense') {
        await api.deleteExpenseHead(id)
      } else {
        await api.deleteIncomeHead(id)
      }
      toast.success(`${kind.charAt(0).toUpperCase() + kind.slice(1)} head deleted`)
      if (activeTab === 'expense') loadExpense()
      else loadIncome()
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

  // Active tab data
  const activeItems = activeTab === 'expense' ? expenseItems : incomeItems
  const activeLoading = activeTab === 'expense' ? expenseLoading : incomeLoading
  const activeColor = activeTab === 'expense' ? '#ff6b6b' : '#1db954'
  const activeIcon = activeTab === 'expense' ? <TrendingDown size={16} /> : <TrendingUp size={16} />

  const expenseExamples = 'Examples: Rent, Salary, Utility Bill, Fabric Purchase, Electricity, Transport'
  const incomeExamples = 'Examples: Service Charge, Commission, Interest, Rental Income, Sale of Asset, Refund'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 25 }}>
      {/* Tabs */}
      <div
        style={{
          display: 'inline-flex',
          background: '#14161a',
          border: '1px solid #2a2d33',
          borderRadius: 12,
          padding: 4,
          alignSelf: 'flex-start',
        }}
      >
        <TabButton
          label="Expense Heads"
          icon={<TrendingDown size={14} />}
          isActive={activeTab === 'expense'}
          activeColor="#ff6b6b"
          onClick={() => setActiveTab('expense')}
        />
        <TabButton
          label="Income Heads"
          icon={<TrendingUp size={14} />}
          isActive={activeTab === 'income'}
          activeColor="#1db954"
          onClick={() => setActiveTab('income')}
        />
      </div>

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
            {activeIcon}
            {activeTab === 'expense'
              ? 'Create expense heads (categories) for organizing your expenses'
              : 'Create income heads (categories) for organizing your other incomes'}
          </p>
          <span style={{ display: 'block', marginTop: 6, color: '#555', fontSize: 12 }}>
            {activeTab === 'expense' ? expenseExamples : incomeExamples}
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
          <Plus size={16} /> Add {activeTab === 'expense' ? 'Expense' : 'Income'} Head
        </button>
      </div>

      {/* Data Table Card */}
      <div style={{ background: '#14161a', border: '1px solid #2a2d33', borderRadius: 16, overflow: 'hidden' }}>
        {activeLoading ? (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ height: 40, background: '#1f2227', borderRadius: 8 }} />
            ))}
          </div>
        ) : activeItems.length === 0 ? (
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
              {activeTab === 'expense' ? (
                <TrendingDown size={24} color="#666" />
              ) : (
                <TrendingUp size={24} color="#666" />
              )}
            </div>
            <p style={{ color: '#888' }}>
              No {activeTab === 'expense' ? 'expense' : 'income'} heads yet
            </p>
            <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
              Create one to start categorizing your {activeTab === 'expense' ? 'expenses' : 'incomes'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#ffffff' }}>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '16px 10px 16px 25px',
                      color: '#333',
                      fontWeight: 600,
                      borderBottom: '1px solid #e0e0e0',
                    }}
                  >
                    Name
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '16px 10px',
                      color: '#333',
                      fontWeight: 600,
                      borderBottom: '1px solid #e0e0e0',
                    }}
                  >
                    Description
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '16px 25px 16px 10px',
                      color: '#333',
                      fontWeight: 600,
                      borderBottom: '1px solid #e0e0e0',
                    }}
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeItems.map((it) => (
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
                    <td style={{ padding: '16px 10px 16px 25px', color: '#fff', fontWeight: 500 }}>
                      {it.name}
                    </td>
                    <td style={{ padding: '16px 10px', color: '#888' }}>{it.description || '-'}</td>
                    <td style={{ padding: '16px 25px 16px 10px', textAlign: 'right' }}>
                      <div
                        style={{
                          display: 'flex',
                          gap: 15,
                          color: '#666',
                          justifyContent: 'flex-end',
                          alignItems: 'center',
                        }}
                      >
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

      {/* Form dialog */}
      {showForm && (
        <Dialog open onOpenChange={setShowForm}>
          <DialogContent style={{ background: '#1a1c1e', border: '1px solid #2a2d33', maxWidth: 400 }}>
            <DialogHeader>
              <DialogTitle style={{ color: '#fff' }}>
                {editItem ? `Edit ${activeTab === 'expense' ? 'Expense' : 'Income'} Head` : `Add ${activeTab === 'expense' ? 'Expense' : 'Income'} Head`}
              </DialogTitle>
            </DialogHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ color: '#888', fontSize: 13, display: 'block', marginBottom: 6 }}>
                  Name <span style={{ color: '#ff6b6b' }}>*</span> (unique)
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={activeTab === 'expense' ? 'e.g. Rent' : 'e.g. Service Charge'}
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

function TabButton({
  label,
  icon,
  isActive,
  activeColor,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  isActive: boolean
  activeColor: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: isActive ? '#1f2227' : 'transparent',
        color: isActive ? activeColor : '#888',
        border: 'none',
        padding: '8px 18px',
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        transition: '0.3s',
        borderBottom: isActive ? `2px solid ${activeColor}` : '2px solid transparent',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.color = '#fff'
          e.currentTarget.style.background = '#1f2227'
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.color = '#888'
          e.currentTarget.style.background = 'transparent'
        }
      }}
    >
      {icon}
      {label}
    </button>
  )
}
