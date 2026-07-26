'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Wallet } from 'lucide-react'
import { api, formatCurrency, formatDate } from '@/lib/api'
import { toast } from 'sonner'

export default function ReportPayable() {
  const [data, setData] = useState<{ rows: any[]; totalAmount: number; totalPaid: number; totalDue: number; count: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showPay, setShowPay] = useState<string | null>(null) // payable id
  const [payAmount, setPayAmount] = useState(0)
  const [payNote, setPayNote] = useState('')
  // Create payable form
  const [partyName, setPartyName] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState(0)
  const [dueDate, setDueDate] = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await api.payableReport()
      setData(res)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleCreate() {
    if (!partyName || amount <= 0) { toast.error('Party name and amount required'); return }
    try {
      await api.createPayable({ partyName, description, amount, dueDate: dueDate || undefined })
      toast.success('Payable created')
      setShowCreate(false)
      setPartyName(''); setDescription(''); setAmount(0); setDueDate('')
      load()
    } catch (err: any) { toast.error(err.message) }
  }

  async function handlePay() {
    if (!showPay) return
    if (payAmount <= 0) { toast.error('Amount required'); return }
    try {
      await api.payPayable({ payableId: showPay, amount: payAmount, note: payNote })
      toast.success('Payment recorded')
      setShowPay(null); setPayAmount(0); setPayNote('')
      load()
    } catch (err: any) { toast.error(err.message) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this payable?')) return
    try {
      await api.deletePayable(id); toast.success('Deleted'); load()
    } catch (err: any) { toast.error(err.message) }
  }

  if (loading) return <Skeleton className="h-80 w-full" />
  if (!data) return null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Total Payable</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(data.totalAmount)}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Paid</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(data.totalPaid)}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Due</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(data.totalDue)}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Entries</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{data.count}</p>
            </div>
            <Button onClick={() => setShowCreate(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-1" /> Add Payable
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-600" /> Payable List
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.rows.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No payables</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-slate-600">Payable ID</th>
                    <th className="text-left px-4 py-2.5 font-medium text-slate-600">Party</th>
                    <th className="text-left px-4 py-2.5 font-medium text-slate-600">Description</th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-600">Amount</th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-600">Paid</th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-600">Due</th>
                    <th className="text-left px-4 py-2.5 font-medium text-slate-600">Due Date</th>
                    <th className="text-center px-4 py-2.5 font-medium text-slate-600">Status</th>
                    <th className="text-center px-4 py-2.5 font-medium text-slate-600">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono text-xs">{r.payableId}</td>
                      <td className="px-4 py-2.5 font-medium">{r.partyName}</td>
                      <td className="px-4 py-2.5 text-slate-600">{r.description || '-'}</td>
                      <td className="px-4 py-2.5 text-right">{formatCurrency(r.amount)}</td>
                      <td className="px-4 py-2.5 text-right text-emerald-600">{formatCurrency(r.paidAmount)}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-red-600">{formatCurrency(r.dueAmount)}</td>
                      <td className="px-4 py-2.5 text-slate-600">{r.dueDate ? formatDate(r.dueDate) : '-'}</td>
                      <td className="px-4 py-2.5 text-center">
                        <Badge variant="secondary" className={
                          r.status === 'paid' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                          : r.status === 'partial' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                          : 'bg-red-100 text-red-700 hover:bg-red-100'
                        }>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          {r.dueAmount > 0.01 && (
                            <Button size="sm" variant="ghost" onClick={() => { setShowPay(r.payableId); setPayAmount(r.dueAmount) }} title="Pay">
                              <Wallet className="w-4 h-4 text-emerald-600" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(r.payableId)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {showCreate && (
        <Dialog open onOpenChange={setShowCreate}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add Payable</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Party Name *</Label>
                <Input value={partyName} onChange={e => setPartyName(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Amount *</Label>
                <Input type="number" value={amount} onChange={e => setAmount(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Due Date</Label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700">Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {showPay && (
        <Dialog open onOpenChange={(o) => !o && setShowPay(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Pay Payable</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Amount</Label>
                <Input type="number" value={payAmount} onChange={e => setPayAmount(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs">Note</Label>
                <Textarea rows={2} value={payNote} onChange={e => setPayNote(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPay(null)}>Cancel</Button>
              <Button onClick={handlePay} className="bg-emerald-600 hover:bg-emerald-700">Confirm Payment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
