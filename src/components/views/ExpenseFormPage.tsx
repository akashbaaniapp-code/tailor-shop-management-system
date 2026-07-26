'use client'

import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Save, CheckCircle2 } from 'lucide-react'
import { api, formatCurrency } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

interface ExpenseHead { id: string; name: string }

const darkCard = { background: '#14161a', border: '1px solid #2a2d33', borderRadius: '16px' }
const darkInput = { background: '#0b0d0f', border: '1px solid #2a2d33', color: '#fff', borderRadius: '10px' }
const btnGreen = { background: '#1db954', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600 }
const btnWhite = { background: '#fff', color: '#000', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600 }

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
        if (res.items.length === 0) { toast.error('Please create at least one expense head first'); setView('setup-expense-head'); return }
        if (selectedExpenseId) {
          return api.listExpenses().then(expRes => {
            const exp = expRes.items.find((e: any) => e.id === selectedExpenseId)
            if (exp) {
              setTitle(exp.title); setAmount(exp.amount); setExpenseHeadId(exp.expenseHeadId || '')
              setExpenseDate(new Date(exp.expenseDate).toISOString().split('T')[0]); setNote(exp.note || '')
            }
            setLoading(false)
          })
        }
        setLoading(false)
      })
      .catch(err => { toast.error(err.message); setLoading(false) })
  }, [selectedExpenseId, setView])

  async function handleSave() {
    if (!title.trim()) { toast.error('Title required'); return }
    if (!amount || amount <= 0) { toast.error('Amount must be greater than zero'); return }
    if (!expenseHeadId) { toast.error('Please select an expense head'); return }
    setSaving(true)
    try {
      const payload = { title: title.trim(), amount, expenseHeadId, expenseDate, note }
      if (selectedExpenseId) {
        await api.deleteExpense(selectedExpenseId)
        await api.createExpense(payload)
        toast.success('Expense updated')
      } else {
        await api.createExpense(payload)
        toast.success('Expense recorded')
      }
      setSaved(true)
    } catch (err: any) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  function handleStartNew() {
    setSaved(false); setTitle(''); setAmount(0); setExpenseHeadId(''); setNote('')
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

  if (saved) {
    const selectedHead = heads.find(h => h.id === expenseHeadId)
    return (
      <div className="space-y-4 max-w-2xl mx-auto pt-8">
        <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(29,185,84,0.05)', border: '1px solid rgba(29,185,84,0.15)', backdropFilter: 'blur(10px)' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(29,185,84,0.1)' }}>
            <CheckCircle2 className="w-10 h-10" style={{ color: '#1db954' }} />
          </div>
          <h2 className="text-2xl font-bold" style={{ color: '#1db954' }}>Expense Saved Successfully!</h2>
          <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}><span className="font-semibold" style={{ color: '#fff' }}>{title}</span></p>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Head: <span className="font-semibold" style={{ color: '#fff' }}>{selectedHead?.name || '-'}</span></p>
          <p className="text-lg font-bold mt-3" style={{ color: '#1db954' }}>Amount: {formatCurrency(amount)}</p>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Date: {expenseDate}</p>
          <div className="flex flex-wrap justify-center gap-2.5 mt-6">
            <button onClick={handleStartNew} className="px-6 py-2.5 font-medium transition-all duration-300" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', borderRadius: '10px', fontSize: '14px' }}>
              Add Another Expense
            </button>
            <button onClick={() => setView('expense-entry')} className="px-6 py-2.5 font-semibold transition-all duration-300 hover:opacity-90" style={btnGreen}>
              Back to Expense List
            </button>
          </div>
        </div>
      </div>
    )
  }

  const darkLabel = { color: '#888', fontSize: '13px', display: 'block', marginBottom: '6px' }

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#0b0d0f', border: '1px solid #2a2d33' }}>
            <ArrowLeft className="w-4 h-4" style={{ color: '#aaa' }} />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: '#fff' }}>{selectedExpenseId ? 'Edit Expense' : 'Add New Expense'}</h2>
            <p className="text-sm" style={{ color: '#666' }}>Fill in the expense details below</p>
          </div>
        </div>
        <div className="flex gap-2.5">
          <button onClick={() => setView('expense-entry')} className="px-5 py-2.5 transition-all duration-300" style={btnWhite}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 flex items-center gap-1.5 transition-all duration-300 hover:opacity-90 disabled:opacity-50" style={btnGreen}>
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Expense'}
          </button>
        </div>
      </div>

      {/* Form card */}
      <div className="p-7" style={darkCard}>
        <p className="text-base font-medium mb-6" style={{ color: '#fff' }}>Expense Details</p>
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label style={darkLabel}>Date <span style={{ color: '#ff6b6b' }}>*</span></label>
              <input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} className="w-full px-4 py-3 text-sm outline-none" style={darkInput} />
            </div>
            <div>
              <label style={darkLabel}>Expense Head <span style={{ color: '#ff6b6b' }}>*</span></label>
              <Select value={expenseHeadId} onValueChange={setExpenseHeadId}>
                <SelectTrigger style={darkInput}><SelectValue placeholder="Select head" /></SelectTrigger>
                <SelectContent style={{ background: '#1a1c1e', border: '1px solid #2a2d33' }}>
                  {heads.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label style={darkLabel}>Title <span style={{ color: '#ff6b6b' }}>*</span></label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Shop rent for July" autoFocus className="w-full px-4 py-3 text-sm outline-none" style={darkInput} />
          </div>

          <div>
            <label style={darkLabel}>Amount <span style={{ color: '#ff6b6b' }}>*</span></label>
            <input type="number" value={amount} onChange={e => setAmount(parseFloat(e.target.value) || 0)} placeholder="0.00" className="w-full px-4 py-3 text-sm outline-none" style={darkInput} />
          </div>

          <div>
            <label style={darkLabel}>Note (optional)</label>
            <textarea rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Additional details about this expense..." className="w-full px-4 py-3 text-sm outline-none resize-vertical" style={darkInput} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2.5 pt-1">
        <button onClick={() => setView('expense-entry')} className="px-5 py-2.5 transition-all duration-300" style={btnWhite}>Cancel</button>
        <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 flex items-center gap-1.5 transition-all duration-300 hover:opacity-90 disabled:opacity-50" style={btnGreen}>
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Expense'}
        </button>
      </div>
    </div>
  )
}
