'use client'

import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Save, CheckCircle2, TrendingUp } from 'lucide-react'
import { api, formatCurrency } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

const darkCard = { background: '#14161a', border: '1px solid #2a2d33', borderRadius: '16px' }
const darkInput = {
  background: '#0b0d0f',
  border: '1px solid #2a2d33',
  color: '#fff',
  borderRadius: '10px',
  padding: '10px 12px',
  fontSize: 14,
  outline: 'none',
}
const btnGreen = { background: '#1db954', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600 }
const btnWhite = { background: '#fff', color: '#000', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600 }

interface IncomeHead {
  id: string
  name: string
  description?: string | null
}

export default function IncomeFormPage() {
  const setView = useAppStore((s) => s.setView)
  const selectedIncomeId = useAppStore((s) => s.selectedIncomeId)

  const [loading, setLoading] = useState(!!selectedIncomeId)
  const [saving, setSaving] = useState(false)

  // Income heads loaded from DB (used as the dropdown options)
  const [incomeHeads, setIncomeHeads] = useState<IncomeHead[]>([])

  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState(0)
  const [incomeHeadId, setIncomeHeadId] = useState('')
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')

  const [saved, setSaved] = useState(false)

  useEffect(() => {
    // Always load income heads (used as dropdown options)
    api.listIncomeHeads()
      .then((res) => setIncomeHeads(res.items || []))
      .catch((err) => toast.error(err.message))

    if (!selectedIncomeId) {
      setLoading(false)
      return
    }
    api.listIncomes()
      .then((res) => {
        const inc = res.items.find((i: any) => i.id === selectedIncomeId)
        if (inc) {
          setTitle(inc.title)
          setAmount(inc.amount)
          setIncomeHeadId(inc.incomeHeadId || '')
          setIncomeDate(new Date(inc.incomeDate).toISOString().split('T')[0])
          setNote(inc.note || '')
        }
        setLoading(false)
      })
      .catch((err) => {
        toast.error(err.message)
        setLoading(false)
      })
  }, [selectedIncomeId])

  async function handleSave() {
    if (!title.trim()) {
      toast.error('Title required')
      return
    }
    if (!amount || amount <= 0) {
      toast.error('Amount must be greater than zero')
      return
    }
    // If heads exist in the system, require one to be selected.
    // (If no heads exist yet, fall back to allow save without a head.)
    if (incomeHeads.length > 0 && !incomeHeadId) {
      toast.error('Please select an income head')
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        amount,
        incomeHeadId: incomeHeadId || null,
        incomeDate,
        note,
      }
      if (selectedIncomeId) {
        await api.updateIncome({ id: selectedIncomeId, ...payload })
        toast.success('Income updated')
      } else {
        await api.createIncome(payload)
        toast.success('Income recorded')
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
    setTitle('')
    setAmount(0)
    setIncomeHeadId('')
    setNote('')
    setIncomeDate(new Date().toISOString().split('T')[0])
    useAppStore.setState({ selectedIncomeId: null })
    setView('income-create')
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
    const selectedHead = incomeHeads.find((h) => h.id === incomeHeadId)
    return (
      <div className="space-y-4 max-w-2xl mx-auto pt-8">
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: 'rgba(29,185,84,0.05)',
            border: '1px solid rgba(29,185,84,0.15)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(29,185,84,0.1)' }}
          >
            <CheckCircle2 className="w-10 h-10" style={{ color: '#1db954' }} />
          </div>
          <h2 className="text-2xl font-bold" style={{ color: '#1db954' }}>
            Income Saved Successfully!
          </h2>
          <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <span className="font-semibold" style={{ color: '#fff' }}>{title}</span>
          </p>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Head: <span className="font-semibold" style={{ color: '#fff' }}>{selectedHead?.name || '-'}</span>
          </p>
          <p className="text-lg font-bold mt-3" style={{ color: '#1db954' }}>
            Amount: {formatCurrency(amount)}
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Date: {incomeDate}</p>
          <div className="flex flex-wrap justify-center gap-2.5 mt-6">
            <button
              onClick={handleStartNew}
              className="px-6 py-2.5 font-medium transition-all duration-300"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.7)',
                borderRadius: '10px',
                fontSize: '14px',
              }}
            >
              Add Another Income
            </button>
            <button
              onClick={() => setView('income-entry')}
              className="px-6 py-2.5 font-semibold transition-all duration-300 hover:opacity-90"
              style={btnGreen}
            >
              Back to Income List
            </button>
          </div>
        </div>
      </div>
    )
  }

  const darkLabel: React.CSSProperties = {
    color: '#888',
    fontSize: '13px',
    display: 'block',
    marginBottom: '6px',
  }

  const selectStyle: React.CSSProperties = {
    width: '100%',
    background: '#0b0d0f',
    border: '1px solid #2a2d33',
    borderRadius: '10px',
    padding: '10px 12px',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    appearance: 'none',
    cursor: 'pointer',
  }

  // The dropdown shows income heads. If there are no heads yet, show a helper
  // message that directs the user to the Heads Create page.
  const noHeads = incomeHeads.length === 0

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: '#0b0d0f', border: '1px solid #2a2d33' }}
          >
            <ArrowLeft className="w-4 h-4" style={{ color: '#aaa' }} />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: '#fff' }}>
              {selectedIncomeId ? 'Edit Income' : 'Add New Income'}
            </h2>
            <p className="text-sm" style={{ color: '#666' }}>
              Record an income entry (other than sales) — service fees, commissions, interest, etc.
            </p>
          </div>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => setView('income-entry')}
            className="px-5 py-2.5 transition-all duration-300"
            style={btnWhite}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 flex items-center gap-1.5 transition-all duration-300 hover:opacity-90 disabled:opacity-50"
            style={btnGreen}
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Income'}
          </button>
        </div>
      </div>

      {/* If no heads exist, show a banner prompting user to create one first */}
      {noHeads && (
        <div
          style={{
            background: 'rgba(212, 223, 58, 0.05)',
            border: '1px solid rgba(212, 223, 58, 0.2)',
            borderRadius: 12,
            padding: '14px 18px',
            fontSize: 14,
            color: '#d4df3a',
            lineHeight: 1.6,
          }}
        >
          💡 No income heads exist yet. Please go to{' '}
          <button
            onClick={() => setView('setup-expense-head')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#d4df3a',
              textDecoration: 'underline',
              fontSize: 14,
              cursor: 'pointer',
              padding: 0,
              fontWeight: 600,
            }}
          >
            Setup → Heads Create
          </button>{' '}
          and create at least one income head first.
        </div>
      )}

      {/* Form card */}
      <div className="p-7" style={darkCard}>
        <p className="text-base font-medium mb-6 flex items-center gap-2" style={{ color: '#fff' }}>
          <TrendingUp size={16} color="#1db954" /> Income Details
        </p>
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label style={darkLabel}>
                Date <span style={{ color: '#ff6b6b' }}>*</span>
              </label>
              <input
                type="date"
                value={incomeDate}
                onChange={(e) => setIncomeDate(e.target.value)}
                className="w-full text-sm outline-none"
                style={darkInput}
              />
            </div>
            <div>
              <label style={darkLabel}>
                Income Head {!noHeads && <span style={{ color: '#ff6b6b' }}>*</span>}
              </label>
              <select
                value={incomeHeadId}
                onChange={(e) => setIncomeHeadId(e.target.value)}
                disabled={noHeads}
                style={{ ...selectStyle, opacity: noHeads ? 0.5 : 1, cursor: noHeads ? 'not-allowed' : 'pointer' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
              >
                <option value="" style={{ background: '#0b0d0f' }}>
                  {noHeads ? 'No heads available' : 'Select income head'}
                </option>
                {incomeHeads.map((h) => (
                  <option key={h.id} value={h.id} style={{ background: '#0b0d0f' }}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={darkLabel}>
              Title <span style={{ color: '#ff6b6b' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Service charge from Mr. Karim"
              autoFocus
              className="w-full text-sm outline-none"
              style={darkInput}
            />
          </div>

          <div>
            <label style={darkLabel}>
              Amount <span style={{ color: '#ff6b6b' }}>*</span>
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="w-full text-sm outline-none"
              style={darkInput}
            />
          </div>

          <div>
            <label style={darkLabel}>Note (optional)</label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Additional details about this income..."
              className="w-full text-sm outline-none resize-vertical"
              style={{ ...darkInput, fontFamily: 'inherit' }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2.5 pt-1">
        <button
          onClick={() => setView('income-entry')}
          className="px-5 py-2.5 transition-all duration-300"
          style={btnWhite}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 flex items-center gap-1.5 transition-all duration-300 hover:opacity-90 disabled:opacity-50"
          style={btnGreen}
        >
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Income'}
        </button>
      </div>
    </div>
  )
}
