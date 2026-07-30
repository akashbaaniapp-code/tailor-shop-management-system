'use client'

import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Receipt, Wallet, Edit } from 'lucide-react'
import { api, formatCurrency, formatDate } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

interface Expense {
  id: string
  title: string
  amount: number
  expenseDate: string
  note?: string | null
  expenseHeadId?: string | null
  head?: { id: string; name: string } | null
}

interface ExpenseHead { id: string; name: string }

const darkCard = { background: '#14161a', border: '1px solid #2a2d33', borderRadius: '16px' }
const darkInput = { background: '#0b0d0f', border: '1px solid #2a2d33', color: '#aaa', borderRadius: '10px' }
const btnGreen = { background: '#1db954', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600 }
const btnOutline = { background: 'transparent', color: '#d4df3a', border: '1px solid rgba(212,223,58,0.3)', borderRadius: '10px', fontSize: '14px', fontWeight: 600 }
const darkTextMuted = { color: '#888' }

export default function ExpenseEntry() {
  const setView = useAppStore(s => s.setView)
  const setSelectedExpenseId = useAppStore(s => s.setSelectedExpenseId)
  const setSelectedDepositId = useAppStore(s => s.setSelectedDepositId)
  const [items, setItems] = useState<Expense[]>([])
  const [heads, setHeads] = useState<ExpenseHead[]>([])
  const [loading, setLoading] = useState(true)
  const [filterHeadId, setFilterHeadId] = useState('all')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [expRes, headRes] = await Promise.all([api.listExpenses(), api.listExpenseHeads()])
      setItems(expRes.items)
      setHeads(headRes.items)
    } catch (err: any) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  function handleAddNew() {
    if (heads.length === 0) { toast.error('Please create at least one expense head first'); setView('setup-expense-head'); return }
    setSelectedExpenseId(null); setView('expense-create')
  }

  function handleAddDeposit() {
    setSelectedDepositId(null); setView('deposit-create')
  }

  function handleEdit(exp: Expense) { setSelectedExpenseId(exp.id); setView('expense-edit') }

  async function handleDelete(id: string) {
    if (!confirm('Delete this expense entry?')) return
    try { await api.deleteExpense(id); toast.success('Deleted'); load() }
    catch (err: any) { toast.error(err.message) }
  }

  const filteredItems = filterHeadId === 'all' ? items : items.filter(it => it.expenseHeadId === filterHeadId)
  const totalAmount = filteredItems.reduce((s, it) => s + it.amount, 0)
  const totalAll = items.reduce((s, it) => s + it.amount, 0)

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 relative" style={darkCard}>
          <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Total Expenses (all)</p>
          <p className="text-2xl font-bold" style={{ color: '#ff6b6b' }}>{formatCurrency(totalAll)}</p>
          <div className="absolute right-5 top-5 w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#0b0d0f', border: '1px solid #2a2d33' }}>
            <Wallet className="w-4 h-4" style={{ color: '#ff6b6b' }} />
          </div>
        </div>
        <div className="p-5 relative" style={darkCard}>
          <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Total Entries</p>
          <p className="text-2xl font-bold" style={{ color: '#3498db' }}>{items.length}</p>
          <div className="absolute right-5 top-5 w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#0b0d0f', border: '1px solid #2a2d33' }}>
            <Receipt className="w-4 h-4" style={{ color: '#3498db' }} />
          </div>
        </div>
        <div className="p-5 relative" style={darkCard}>
          <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Expense Heads</p>
          <p className="text-2xl font-bold" style={{ color: '#2ecc71' }}>{heads.length}</p>
          <div className="absolute right-5 top-5 w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#0b0d0f', border: '1px solid #2a2d33' }}>
            <Receipt className="w-4 h-4" style={{ color: '#2ecc71' }} />
          </div>
        </div>
      </div>

      {/* Filter + Add */}
      <div className="p-5" style={darkCard}>
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div>
            <p className="text-xs mb-1.5" style={{ color: '#666' }}>Filter by Head</p>
            <Select value={filterHeadId} onValueChange={setFilterHeadId}>
              <SelectTrigger style={{ ...darkInput, minWidth: '200px' }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ background: '#1a1c1e', border: '1px solid #2a2d33' }}>
                <SelectItem value="all">All Heads</SelectItem>
                {heads.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs" style={{ color: '#666' }}>Filtered Total</p>
              <p className="text-lg font-bold" style={{ color: '#ff6b6b' }}>{formatCurrency(totalAmount)}</p>
            </div>
            <button onClick={handleAddDeposit} className="px-5 py-3 flex items-center gap-2 transition-all duration-300 hover:opacity-90" style={btnOutline}>
              <Plus className="w-4 h-4" /> Add Deposit
            </button>
            <button onClick={handleAddNew} className="px-6 py-3 flex items-center gap-2 transition-all duration-300 hover:opacity-90" style={btnGreen}>
              <Plus className="w-4 h-4" /> Add Expense
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div style={darkCard} className="overflow-hidden">
        <div className="flex items-center gap-2.5 p-5 pb-4">
          <Receipt className="w-4 h-4" style={{ color: '#d4df3a' }} />
          <span className="font-medium text-sm" style={{ color: '#fff' }}>Expense Entries</span>
        </div>
        {loading ? (
          <div className="p-5 space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-5" style={{ color: '#555' }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ border: '2px solid #2a2d33' }}>
              <Receipt className="w-8 h-8" style={{ color: '#2a2d33' }} />
            </div>
            <h3 className="text-base" style={{ color: '#888' }}>No expenses found</h3>
            <p className="text-sm mt-1">Click "Add Expense" to record your first expense</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ borderBottom: '1px solid #2a2d33' }}>
                <tr>
                  <th className="text-left px-5 py-3.5 font-medium" style={{ color: '#888' }}>Date</th>
                  <th className="text-left px-4 py-3.5 font-medium" style={{ color: '#888' }}>Title</th>
                  <th className="text-left px-4 py-3.5 font-medium" style={{ color: '#888' }}>Head</th>
                  <th className="text-left px-4 py-3.5 font-medium" style={{ color: '#888' }}>Note</th>
                  <th className="text-right px-4 py-3.5 font-medium" style={{ color: '#888' }}>Amount</th>
                  <th className="text-center px-5 py-3.5 font-medium" style={{ color: '#888' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(it => (
                  <tr key={it.id} style={{ borderBottom: '1px solid #1f2227' }} className="transition-colors hover:bg-[rgba(255,255,255,0.02)]">
                    <td className="px-5 py-3.5" style={darkTextMuted}>{formatDate(it.expenseDate)}</td>
                    <td className="px-4 py-3.5 font-medium" style={{ color: '#fff' }}>{it.title}</td>
                    <td className="px-4 py-3.5">
                      {it.head ? (
                        <span className="text-xs px-3 py-1 rounded-full" style={{ background: '#2a2d33', color: '#aaa' }}>{it.head.name}</span>
                      ) : (
                        <span className="text-xs italic" style={{ color: '#555' }}>No head</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 max-w-xs truncate" style={darkTextMuted}>{it.note || '-'}</td>
                    <td className="px-4 py-3.5 text-right font-medium" style={{ color: '#ff6b6b' }}>{formatCurrency(it.amount)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-4">
                        <button onClick={() => handleEdit(it)} title="Edit" className="transition-colors" style={{ color: '#666' }} onMouseEnter={e => e.currentTarget.style.color = '#3498db'} onMouseLeave={e => e.currentTarget.style.color = '#666'}>
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(it.id)} title="Delete" className="transition-colors" style={{ color: '#666' }} onMouseEnter={e => e.currentTarget.style.color = '#ff6b6b'} onMouseLeave={e => e.currentTarget.style.color = '#666'}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot style={{ borderTop: '2px solid #2a2d33' }}>
                <tr>
                  <td colSpan={4} className="px-5 py-3.5 font-bold text-right" style={{ color: '#fff' }}>Total</td>
                  <td className="px-4 py-3.5 text-right font-bold" style={{ color: '#ff6b6b' }}>{formatCurrency(totalAmount)}</td>
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
