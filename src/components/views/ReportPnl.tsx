'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react'
import { api, formatCurrency } from '@/lib/api'
import { toast } from 'sonner'

export default function ReportPnl() {
  const now = new Date()
  const [period, setPeriod] = useState('monthly')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [showExpense, setShowExpense] = useState(false)
  const [showIncome, setShowIncome] = useState(false)
  // Expense form
  const [expTitle, setExpTitle] = useState('')
  const [expAmount, setExpAmount] = useState(0)
  const [expCategory, setExpCategory] = useState('general')
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0])
  const [expNote, setExpNote] = useState('')
  // Income form
  const [incTitle, setIncTitle] = useState('')
  const [incAmount, setIncAmount] = useState(0)
  const [incCategory, setIncCategory] = useState('general')
  const [incDate, setIncDate] = useState(new Date().toISOString().split('T')[0])
  const [incNote, setIncNote] = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await api.pnl({ period, year, month })
      setData(res)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [period, year, month])

  async function handleAddExpense() {
    if (!expTitle || expAmount <= 0) { toast.error('Title and amount required'); return }
    try {
      await api.createExpense({ title: expTitle, amount: expAmount, category: expCategory, expenseDate: expDate, note: expNote })
      toast.success('Expense added')
      setShowExpense(false)
      setExpTitle(''); setExpAmount(0); setExpNote('')
      load()
    } catch (err: any) { toast.error(err.message) }
  }

  async function handleAddIncome() {
    if (!incTitle || incAmount <= 0) { toast.error('Title and amount required'); return }
    try {
      await api.createIncome({ title: incTitle, amount: incAmount, category: incCategory, incomeDate: incDate, note: incNote })
      toast.success('Income added')
      setShowIncome(false)
      setIncTitle(''); setIncAmount(0); setIncNote('')
      load()
    } catch (err: any) { toast.error(err.message) }
  }

  return (
    <div className="space-y-4">
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="w-44">
              <Label className="text-xs text-slate-500">Period</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily (one month)</SelectItem>
                  <SelectItem value="monthly">Monthly (one year)</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-32">
              <Label className="text-xs text-slate-500">Year</Label>
              <Input type="number" value={year} onChange={e => setYear(parseInt(e.target.value) || now.getFullYear())} className="mt-1" />
            </div>
            {period === 'daily' && (
              <div className="w-44">
                <Label className="text-xs text-slate-500">Month</Label>
                <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                      <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={load} className="bg-emerald-600 hover:bg-emerald-700">Refresh</Button>
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setShowIncome(true)}>
              <Plus className="w-4 h-4 mr-1" /> Other Income
            </Button>
            <Button variant="outline" onClick={() => setShowExpense(true)}>
              <Plus className="w-4 h-4 mr-1" /> Expense
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Skeleton className="h-80 w-full" />
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <SummaryCard label="Sales" value={data.totals.sales} color="emerald" />
            <SummaryCard label="Collected" value={data.totals.collected} color="blue" />
            <SummaryCard label="Other Income" value={data.totals.otherIncome} color="emerald" />
            <SummaryCard label="Expense" value={data.totals.expense} color="red" />
            <SummaryCard label="Payable Paid" value={data.totals.payablePaid} color="red" />
            <SummaryCard label="Net Profit" value={data.totals.netProfit} color={data.totals.netProfit >= 0 ? 'emerald' : 'red'} highlight />
          </div>

          {/* Detail table */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Breakdown - {period === 'daily' ? 'Daily' : period === 'monthly' ? 'Monthly' : 'Yearly'}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium text-slate-600">Period</th>
                      <th className="text-right px-4 py-2.5 font-medium text-slate-600">Sales</th>
                      <th className="text-right px-4 py-2.5 font-medium text-slate-600">Collected</th>
                      <th className="text-right px-4 py-2.5 font-medium text-slate-600">Other Income</th>
                      <th className="text-right px-4 py-2.5 font-medium text-slate-600">Expense</th>
                      <th className="text-right px-4 py-2.5 font-medium text-slate-600">Payable Paid</th>
                      <th className="text-right px-4 py-2.5 font-medium text-slate-600">Net Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((r: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-medium">{r.label}</td>
                        <td className="px-4 py-2.5 text-right text-slate-700">{formatCurrency(r.sales)}</td>
                        <td className="px-4 py-2.5 text-right text-emerald-600">{formatCurrency(r.collected)}</td>
                        <td className="px-4 py-2.5 text-right text-emerald-600">{formatCurrency(r.otherIncome)}</td>
                        <td className="px-4 py-2.5 text-right text-red-600">{formatCurrency(r.expense)}</td>
                        <td className="px-4 py-2.5 text-right text-red-600">{formatCurrency(r.payablePaid)}</td>
                        <td className="px-4 py-2.5 text-right font-bold">
                          <span className={r.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {formatCurrency(r.netProfit)}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {data.rows.length === 0 && (
                      <tr><td colSpan={7} className="text-center py-8 text-slate-500">No data for this period</td></tr>
                    )}
                  </tbody>
                  {data.rows.length > 0 && (
                    <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                      <tr>
                        <td className="px-4 py-2.5 font-bold">Total</td>
                        <td className="px-4 py-2.5 text-right font-bold">{formatCurrency(data.totals.sales)}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-emerald-600">{formatCurrency(data.totals.collected)}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-emerald-600">{formatCurrency(data.totals.otherIncome)}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-red-600">{formatCurrency(data.totals.expense)}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-red-600">{formatCurrency(data.totals.payablePaid)}</td>
                        <td className="px-4 py-2.5 text-right font-bold">
                          <span className={data.totals.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {formatCurrency(data.totals.netProfit)}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}

      {/* Expense dialog */}
      {showExpense && (
        <Dialog open onOpenChange={setShowExpense}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Title *</Label>
                <Input value={expTitle} onChange={e => setExpTitle(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Amount *</Label>
                <Input type="number" value={expAmount} onChange={e => setExpAmount(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <Input value={expCategory} onChange={e => setExpCategory(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Date</Label>
                <Input type="date" value={expDate} onChange={e => setExpDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Note</Label>
                <Textarea rows={2} value={expNote} onChange={e => setExpNote(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowExpense(false)}>Cancel</Button>
              <Button onClick={handleAddExpense} className="bg-emerald-600 hover:bg-emerald-700">Add Expense</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Income dialog */}
      {showIncome && (
        <Dialog open onOpenChange={setShowIncome}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add Other Income</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Title *</Label>
                <Input value={incTitle} onChange={e => setIncTitle(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Amount *</Label>
                <Input type="number" value={incAmount} onChange={e => setIncAmount(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <Input value={incCategory} onChange={e => setIncCategory(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Date</Label>
                <Input type="date" value={incDate} onChange={e => setIncDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Note</Label>
                <Textarea rows={2} value={incNote} onChange={e => setIncNote(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowIncome(false)}>Cancel</Button>
              <Button onClick={handleAddIncome} className="bg-emerald-600 hover:bg-emerald-700">Add Income</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function SummaryCard({ label, value, color, highlight }: { label: string; value: number; color: 'emerald' | 'red' | 'blue'; highlight?: boolean }) {
  const colorMap = {
    emerald: 'text-emerald-600',
    red: 'text-red-600',
    blue: 'text-blue-600'
  }
  return (
    <Card className={`border-slate-200 ${highlight ? 'ring-2 ring-slate-300' : ''}`}>
      <CardContent className="p-3">
        <p className="text-xs text-slate-500">{label}</p>
        <p className={`text-lg font-bold mt-1 ${colorMap[color]}`}>{formatCurrency(value)}</p>
      </CardContent>
    </Card>
  )
}
