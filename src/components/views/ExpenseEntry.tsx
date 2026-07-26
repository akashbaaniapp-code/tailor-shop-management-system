'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
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

interface ExpenseHead {
  id: string
  name: string
}

export default function ExpenseEntry() {
  const setView = useAppStore(s => s.setView)
  const setSelectedExpenseId = useAppStore(s => s.setSelectedExpenseId)
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
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleAddNew() {
    if (heads.length === 0) {
      toast.error('Please create at least one expense head first (Setup → Expense Heads)')
      setView('setup-expense-head')
      return
    }
    setSelectedExpenseId(null)
    setView('expense-create')
  }

  function handleEdit(exp: Expense) {
    setSelectedExpenseId(exp.id)
    setView('expense-edit')
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this expense entry?')) return
    try {
      await api.deleteExpense(id); toast.success('Deleted'); load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // Filter + total
  const filteredItems = filterHeadId === 'all'
    ? items
    : items.filter(it => it.expenseHeadId === filterHeadId)
  const totalAmount = filteredItems.reduce((s, it) => s + it.amount, 0)
  const totalAll = items.reduce((s, it) => s + it.amount, 0)

  return (
    <div className="space-y-4">
      {/* Top stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Total Expenses (all)</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalAll)}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Total Entries</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{items.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Expense Heads</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{heads.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="w-56">
              <Label className="text-xs text-slate-500">Filter by Head</Label>
              <Select value={filterHeadId} onValueChange={setFilterHeadId}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Heads</SelectItem>
                  {heads.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1" />
            <div className="text-right">
              <p className="text-xs text-slate-500">Filtered Total</p>
              <p className="text-lg font-bold text-red-600">{formatCurrency(totalAmount)}</p>
            </div>
            <Button onClick={handleAddNew} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-1" /> Add Expense
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-600" /> Expense Entries
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">No expenses found</p>
              <p className="text-xs text-slate-400 mt-1">Click "Add Expense" to record your first expense</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-slate-600">Date</th>
                    <th className="text-left px-4 py-2.5 font-medium text-slate-600">Title</th>
                    <th className="text-left px-4 py-2.5 font-medium text-slate-600">Head</th>
                    <th className="text-left px-4 py-2.5 font-medium text-slate-600">Note</th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-600">Amount</th>
                    <th className="text-center px-4 py-2.5 font-medium text-slate-600">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(it => (
                    <tr key={it.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-600">{formatDate(it.expenseDate)}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-900">{it.title}</td>
                      <td className="px-4 py-2.5">
                        {it.head ? (
                          <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100">{it.head.name}</Badge>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No head</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 max-w-xs truncate">{it.note || '-'}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-red-600">{formatCurrency(it.amount)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(it)} title="Edit">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(it.id)} title="Delete">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={4} className="px-4 py-2.5 font-bold text-right">Total</td>
                    <td className="px-4 py-2.5 text-right font-bold text-red-600">{formatCurrency(totalAmount)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
