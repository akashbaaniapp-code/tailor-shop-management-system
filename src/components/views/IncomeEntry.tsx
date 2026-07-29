'use client'

import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Receipt, Wallet, Edit, TrendingUp } from 'lucide-react'
import { api, formatCurrency, formatDate } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

interface Income {
  id: string
  title: string
  amount: number
  incomeDate: string
  note?: string | null
  category?: string | null
}

const darkCard = { background: '#14161a', border: '1px solid #2a2d33', borderRadius: '16px' }
const darkInput = { background: '#0b0d0f', border: '1px solid #2a2d33', color: '#aaa', borderRadius: '10px' }
const btnGreen = { background: '#1db954', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600 }
const darkTextMuted = { color: '#888' }

// Common income categories users can pick from
const CATEGORY_OPTIONS = [
  'general',
  'service',
  'commission',
  'interest',
  'rental',
  'sale-asset',
  'refund',
  'donation',
  'other'
]

export default function IncomeEntry() {
  const setView = useAppStore((s) => s.setView)
  const setSelectedIncomeId = useAppStore((s) => s.setSelectedIncomeId)
  const [items, setItems] = useState<Income[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState('all')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await api.listIncomes()
      setItems(res.items)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleAddNew() {
    setSelectedIncomeId(null)
    setView('income-create')
  }

  function handleEdit(inc: Income) {
    setSelectedIncomeId(inc.id)
    setView('income-edit')
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this income entry?')) return
    try {
      await api.deleteIncome(id)
      toast.success('Deleted')
      load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // Build list of categories present in actual data + standard options
  const presentCategories = Array.from(new Set(items.map((i) => i.category || 'general').filter(Boolean)))
  const allCategories = Array.from(new Set([...CATEGORY_OPTIONS, ...presentCategories])).sort()

  const filteredItems =
    filterCategory === 'all' ? items : items.filter((it) => (it.category || 'general') === filterCategory)
  const totalAmount = filteredItems.reduce((s, it) => s + it.amount, 0)
  const totalAll = items.reduce((s, it) => s + it.amount, 0)

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 relative" style={darkCard}>
          <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Total Income (all)
          </p>
          <p className="text-2xl font-bold" style={{ color: '#1db954' }}>
            {formatCurrency(totalAll)}
          </p>
          <div
            className="absolute right-5 top-5 w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: '#0b0d0f', border: '1px solid #2a2d33' }}
          >
            <Wallet className="w-4 h-4" style={{ color: '#1db954' }} />
          </div>
        </div>
        <div className="p-5 relative" style={darkCard}>
          <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Total Entries
          </p>
          <p className="text-2xl font-bold" style={{ color: '#3498db' }}>
            {items.length}
          </p>
          <div
            className="absolute right-5 top-5 w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: '#0b0d0f', border: '1px solid #2a2d33' }}
          >
            <Receipt className="w-4 h-4" style={{ color: '#3498db' }} />
          </div>
        </div>
        <div className="p-5 relative" style={darkCard}>
          <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Categories
          </p>
          <p className="text-2xl font-bold" style={{ color: '#d4df3a' }}>
            {allCategories.length}
          </p>
          <div
            className="absolute right-5 top-5 w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: '#0b0d0f', border: '1px solid #2a2d33' }}
          >
            <TrendingUp className="w-4 h-4" style={{ color: '#d4df3a' }} />
          </div>
        </div>
      </div>

      {/* Filter + Add */}
      <div className="p-5" style={darkCard}>
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div>
            <p className="text-xs mb-1.5" style={{ color: '#666' }}>
              Filter by Category
            </p>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger style={{ ...darkInput, minWidth: '200px' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: '#1a1c1e', border: '1px solid #2a2d33' }}>
                <SelectItem value="all">All Categories</SelectItem>
                {allCategories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs" style={{ color: '#666' }}>
                Filtered Total
              </p>
              <p className="text-lg font-bold" style={{ color: '#1db954' }}>
                {formatCurrency(totalAmount)}
              </p>
            </div>
            <button
              onClick={handleAddNew}
              className="px-6 py-3 flex items-center gap-2 transition-all duration-300 hover:opacity-90"
              style={btnGreen}
            >
              <Plus className="w-4 h-4" /> Add Income
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div style={darkCard} className="overflow-hidden">
        <div className="flex items-center gap-2.5 p-5 pb-4">
          <TrendingUp className="w-4 h-4" style={{ color: '#d4df3a' }} />
          <span className="font-medium text-sm" style={{ color: '#fff' }}>
            Income Entries
          </span>
        </div>
        {loading ? (
          <div className="p-5 space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-5" style={{ color: '#555' }}>
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ border: '2px solid #2a2d33' }}
            >
              <TrendingUp className="w-8 h-8" style={{ color: '#2a2d33' }} />
            </div>
            <h3 className="text-base" style={{ color: '#888' }}>
              No income found
            </h3>
            <p className="text-sm mt-1">Click "Add Income" to record your first income entry</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
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
                    Date
                  </th>
                  <th style={headerCell}>Title</th>
                  <th style={headerCell}>Category</th>
                  <th style={headerCell}>Note</th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '16px 10px',
                      color: '#333',
                      fontWeight: 600,
                      borderBottom: '1px solid #e0e0e0',
                    }}
                  >
                    Amount
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
                {filteredItems.map((it) => (
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
                    <td style={{ padding: '16px 10px 16px 25px', color: '#888' }}>
                      {formatDate(it.incomeDate)}
                    </td>
                    <td style={{ padding: '16px 10px', color: '#fff', fontWeight: 500 }}>{it.title}</td>
                    <td style={{ padding: '16px 10px' }}>
                      <span
                        className="text-xs px-3 py-1 rounded-full"
                        style={{
                          background: 'rgba(29, 185, 84, 0.1)',
                          color: '#1db954',
                          border: '1px solid rgba(29, 185, 84, 0.3)',
                        }}
                      >
                        {it.category || 'general'}
                      </span>
                    </td>
                    <td
                      className="max-w-xs truncate"
                      style={{ padding: '16px 10px', color: '#888' }}
                    >
                      {it.note || '-'}
                    </td>
                    <td
                      style={{
                        padding: '16px 10px',
                        textAlign: 'right',
                        color: '#1db954',
                        fontWeight: 500,
                      }}
                    >
                      {formatCurrency(it.amount)}
                    </td>
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
                          onClick={() => handleEdit(it)}
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
              <tfoot style={{ borderTop: '2px solid #2a2d33', background: '#1f2227' }}>
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: '14px 10px 14px 25px',
                      fontWeight: 700,
                      textAlign: 'right',
                      color: '#fff',
                    }}
                  >
                    Total
                  </td>
                  <td style={{ padding: '14px 10px', textAlign: 'right', fontWeight: 700, color: '#1db954' }}>
                    {formatCurrency(totalAmount)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

const headerCell: React.CSSProperties = {
  textAlign: 'left',
  padding: '16px 10px',
  color: '#333',
  fontWeight: 600,
  borderBottom: '1px solid #e0e0e0',
}
