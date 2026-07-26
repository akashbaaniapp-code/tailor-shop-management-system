'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Save, CheckCircle2 } from 'lucide-react'
import { api, formatCurrency } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

interface ExpenseHead {
  id: string
  name: string
}

export default function ExpenseFormPage() {
  const setView = useAppStore(s => s.setView)
  const selectedExpenseId = useAppStore(s => s.selectedExpenseId)

  const [heads, setHeads] = useState<ExpenseHead[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState(0)
  const [expenseHeadId, setExpenseHeadId] = useState('')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')

  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.listExpenseHeads()
      .then(res => {
        setHeads(res.items)
        if (res.items.length === 0) {
          toast.error('Please create at least one expense head first')
          setView('setup-expense-head')
          return
        }
        if (selectedExpenseId) {
          // Editing existing — load it
          return api.listExpenses().then(expRes => {
            const exp = expRes.items.find((e: any) => e.id === selectedExpenseId)
            if (exp) {
              setTitle(exp.title)
              setAmount(exp.amount)
              setExpenseHeadId(exp.expenseHeadId || '')
              setExpenseDate(new Date(exp.expenseDate).toISOString().split('T')[0])
              setNote(exp.note || '')
            }
            setLoading(false)
          })
        }
        setLoading(false)
      })
      .catch(err => {
        toast.error(err.message)
        setLoading(false)
      })
  }, [selectedExpenseId, setView])

  async function handleSave() {
    if (!title.trim()) { toast.error('Title required'); return }
    if (!amount || amount <= 0) { toast.error('Amount must be greater than zero'); return }
    if (!expenseHeadId) { toast.error('Please select an expense head'); return }

    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        amount,
        expenseHeadId,
        expenseDate,
        note
      }
      if (selectedExpenseId) {
        // Note: expense update API not yet implemented; using delete + create pattern
        await api.deleteExpense(selectedExpenseId)
        await api.createExpense(payload)
        toast.success('Expense updated')
      } else {
        await api.createExpense(payload)
        toast.success('Expense recorded')
      }
      setSaved(true)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleStartNew() {
    setSaved(false)
    setTitle(''); setAmount(0); setExpenseHeadId(''); setNote('')
    setExpenseDate(new Date().toISOString().split('T')[0])
    useAppStore.setState({ selectedExpenseId: null })
    setView('expense-create')
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  // Success state
  if (saved) {
    const selectedHead = heads.find(h => h.id === expenseHeadId)
    return (
      <div className="space-y-4 max-w-2xl mx-auto pt-8">
        <Card className="border-emerald-300 bg-emerald-50">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-emerald-900">
              Expense Saved Successfully!
            </h2>
            <p className="text-sm text-emerald-700 mt-2">
              <span className="font-semibold">{title}</span>
            </p>
            <p className="text-sm text-emerald-700 mt-1">
              Head: <span className="font-semibold">{selectedHead?.name || '-'}</span>
            </p>
            <p className="text-lg font-bold text-emerald-900 mt-3">
              Amount: {formatCurrency(amount)}
            </p>
            <p className="text-xs text-emerald-700 mt-1">
              Date: {expenseDate}
            </p>

            <div className="flex flex-wrap justify-center gap-2 mt-6">
              <Button variant="outline" onClick={handleStartNew} className="border-emerald-600 text-emerald-700 hover:bg-emerald-100">
                Add Another Expense
              </Button>
              <Button onClick={() => setView('expense-entry')} className="bg-emerald-600 hover:bg-emerald-700">
                Back to Expense List
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setView('expense-entry')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {selectedExpenseId ? 'Edit Expense' : 'Add New Expense'}
            </h2>
            <p className="text-sm text-slate-500">Fill in the expense details below</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setView('expense-entry')}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            <Save className="w-4 h-4 mr-1" />
            {saving ? 'Saving...' : 'Save Expense'}
          </Button>
        </div>
      </div>

      {/* Form card */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Expense Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Expense Head *</Label>
                <Select value={expenseHeadId} onValueChange={setExpenseHeadId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select head" /></SelectTrigger>
                  <SelectContent>
                    {heads.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Date *</Label>
                <Input
                  type="date"
                  value={expenseDate}
                  onChange={e => setExpenseDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Title *</Label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Shop rent for July"
                className="mt-1"
                autoFocus
              />
            </div>

            <div>
              <Label className="text-xs">Amount *</Label>
              <Input
                type="number"
                value={amount}
                onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Note (optional)</Label>
              <Textarea
                rows={3}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Additional details about this expense..."
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom action buttons */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={() => setView('expense-entry')}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
          <Save className="w-4 h-4 mr-1" />
          {saving ? 'Saving...' : 'Save Expense'}
        </Button>
      </div>
    </div>
  )
}
