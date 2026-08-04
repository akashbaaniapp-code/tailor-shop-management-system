'use client'

import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Save, CheckCircle2, Landmark } from 'lucide-react'
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

interface Bank { id: string; bankName: string; bankTitle?: string; accountNumber?: string; branch?: string }
interface DepositHead { id: string; name: string }

export default function DepositFormPage() {
  const setView = useAppStore((s) => s.setView)
  const selectedDepositId = useAppStore((s) => s.selectedDepositId)

  const [loading, setLoading] = useState(!!selectedDepositId)
  const [saving, setSaving] = useState(false)

  const [banks, setBanks] = useState<Bank[]>([])
  const [heads, setHeads] = useState<DepositHead[]>([])

  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState(0)
  const [bankId, setBankId] = useState('')
  const [depositHeadId, setDepositHeadId] = useState('')
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')

  const [saved, setSaved] = useState(false)

  useEffect(() => {
    Promise.all([api.listBanks(), api.listDepositHeads()])
      .then(([b, h]) => {
        setBanks(b.items || [])
        setHeads(h.items || [])
      })
      .catch((err) => toast.error(err.message))

    if (!selectedDepositId) {
      setLoading(false)
      return
    }
    api.listDeposits()
      .then((res) => {
        const dep = res.items.find((d: any) => d.id === selectedDepositId)
        if (dep) {
          setTitle(dep.title)
          setAmount(dep.amount)
          setBankId(dep.bankId || '')
          setDepositHeadId(dep.depositHeadId || '')
          setDepositDate(new Date(dep.depositDate).toISOString().split('T')[0])
          setNote(dep.note || '')
        }
        setLoading(false)
      })
      .catch((err) => {
        toast.error(err.message)
        setLoading(false)
      })
  }, [selectedDepositId])

  async function handleSave() {
    if (!title.trim()) { toast.error('Title required'); return }
    if (!amount || amount <= 0) { toast.error('Amount must be greater than zero'); return }
    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        amount,
        bankId: bankId || null,
        depositHeadId: depositHeadId || null,
        depositDate,
        note,
      }
      if (selectedDepositId) {
        await api.updateDeposit({ id: selectedDepositId, ...payload })
        toast.success('Deposit updated')
      } else {
        await api.createDeposit(payload)
        toast.success('Deposit recorded')
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
    setTitle(''); setAmount(0); setBankId(''); setDepositHeadId(''); setNote('')
    setDepositDate(new Date().toISOString().split('T')[0])
    useAppStore.setState({ selectedDepositId: null })
    setView('deposit-create')
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
    const selectedBank = banks.find((b) => b.id === bankId)
    const selectedHead = heads.find((h) => h.id === depositHeadId)
    return (
      <div className="space-y-4 max-w-2xl mx-auto pt-8">
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: 'rgba(29,185,84,0.05)', border: '1px solid rgba(29,185,84,0.15)', backdropFilter: 'blur(10px)' }}
        >
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(29,185,84,0.1)' }}>
            <CheckCircle2 className="w-10 h-10" style={{ color: '#1db954' }} />
          </div>
          <h2 className="text-2xl font-bold" style={{ color: '#1db954' }}>Deposit Saved Successfully!</h2>
          <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <span className="font-semibold" style={{ color: '#fff' }}>{title}</span>
          </p>
          {selectedHead && (
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Head: <span className="font-semibold" style={{ color: '#fff' }}>{selectedHead.name}</span>
            </p>
          )}
          {selectedBank && (
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Bank: <span className="font-semibold" style={{ color: '#fff' }}>{selectedBank.bankName}</span>
            </p>
          )}
          <p className="text-lg font-bold mt-3" style={{ color: '#1db954' }}>Amount: {formatCurrency(amount)}</p>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Date: {depositDate}</p>
          <div className="flex flex-wrap justify-center gap-2.5 mt-6">
            <button
              onClick={handleStartNew}
              className="px-6 py-2.5 font-medium transition-all duration-300"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', borderRadius: '10px', fontSize: '14px' }}
            >
              Add Another Deposit
            </button>
            <button onClick={() => setView('expense-entry')} className="px-6 py-2.5 font-semibold transition-all duration-300 hover:opacity-90" style={btnGreen}>
              Back to List
            </button>
          </div>
        </div>
      </div>
    )
  }

  const darkLabel: React.CSSProperties = { color: '#888', fontSize: '13px', display: 'block', marginBottom: '6px' }
  const selectStyle: React.CSSProperties = {
    width: '100%', background: '#0b0d0f', border: '1px solid #2a2d33', borderRadius: '10px',
    padding: '10px 12px', color: '#fff', fontSize: 14, outline: 'none', appearance: 'none', cursor: 'pointer',
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#0b0d0f', border: '1px solid #2a2d33' }}>
            <ArrowLeft className="w-4 h-4" style={{ color: '#aaa' }} />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: '#fff' }}>{selectedDepositId ? 'Edit Deposit' : 'Add New Deposit'}</h2>
            <p className="text-sm" style={{ color: '#666' }}>Record a bank deposit entry</p>
          </div>
        </div>
        <div className="flex gap-2.5">
          <button onClick={() => setView('expense-entry')} className="px-5 py-2.5 transition-all duration-300" style={btnWhite}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 flex items-center gap-1.5 transition-all duration-300 hover:opacity-90 disabled:opacity-50" style={btnGreen}>
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Deposit'}
          </button>
        </div>
      </div>

      {/* Form card */}
      <div className="p-7" style={darkCard}>
        <p className="text-base font-medium mb-6 flex items-center gap-2" style={{ color: '#fff' }}>
          <Landmark size={16} color="#d4df3a" /> Deposit Details
        </p>
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label style={darkLabel}>Date <span style={{ color: '#ff6b6b' }}>*</span></label>
              <input type="date" value={depositDate} onChange={(e) => setDepositDate(e.target.value)} className="w-full text-sm outline-none" style={darkInput} />
            </div>
            <div>
              <label style={darkLabel}>Deposit Head</label>
              <select
                value={depositHeadId}
                onChange={(e) => setDepositHeadId(e.target.value)}
                style={selectStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
              >
                <option value="" style={{ background: '#0b0d0f' }}>Select deposit head</option>
                {heads.map((h) => (
                  <option key={h.id} value={h.id} style={{ background: '#0b0d0f' }}>{h.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={darkLabel}>Bank Account</label>
            <select
              value={bankId}
              onChange={(e) => setBankId(e.target.value)}
              style={selectStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
            >
              <option value="" style={{ background: '#0b0d0f' }}>Select bank account</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id} style={{ background: '#0b0d0f' }}>
                  {b.bankName}{b.accountNumber ? ` — ${b.accountNumber}` : ''}{b.branch ? ` (${b.branch})` : ''}
                </option>
              ))}
            </select>
            {banks.length === 0 && (
              <p className="text-xs mt-2" style={{ color: '#d4df3a' }}>
                💡 No banks created yet. Go to Setup → Bank to create one.
              </p>
            )}
          </div>

          <div>
            <label style={darkLabel}>Title <span style={{ color: '#ff6b6b' }}>*</span></label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cash deposit to DBBL"
              autoFocus
              className="w-full text-sm outline-none"
              style={darkInput}
            />
          </div>

          <div>
            <label style={darkLabel}>Amount <span style={{ color: '#ff6b6b' }}>*</span></label>
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
              placeholder="Additional details about this deposit..."
              className="w-full text-sm outline-none resize-vertical"
              style={{ ...darkInput, fontFamily: 'inherit' }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2.5 pt-1">
        <button onClick={() => setView('expense-entry')} className="px-5 py-2.5 transition-all duration-300" style={btnWhite}>Cancel</button>
        <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 flex items-center gap-1.5 transition-all duration-300 hover:opacity-90 disabled:opacity-50" style={btnGreen}>
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Deposit'}
        </button>
      </div>
    </div>
  )
}
