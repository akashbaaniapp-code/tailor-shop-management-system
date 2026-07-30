'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Receipt, TrendingDown, Layers, Calendar } from 'lucide-react'
import { api, formatCurrency, formatDate } from '@/lib/api'
import ExportButtons from '@/components/ExportButtons'
import { toast } from 'sonner'

export default function ReportExpense() {
  const [data, setData] = useState<any>(null)
  const [heads, setHeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const today = now.toISOString().split('T')[0]
  const [from, setFrom] = useState(firstDayOfMonth)
  const [to, setTo] = useState(today)
  const [headId, setHeadId] = useState('all')
  const [groupBy, setGroupBy] = useState('date')

  async function load() {
    setLoading(true)
    try {
      const res = await api.expenseReport({ from, to, headId, groupBy })
      setData(res)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    api.listExpenseHeads().then(res => setHeads(res.items)).catch(err => toast.error(err.message))
  }, [])

  useEffect(() => { load() }, [from, to, headId, groupBy])

  function handlePreset(kind: 'today' | 'thisMonth' | 'thisYear' | 'lastMonth') {
    const n = new Date()
    if (kind === 'today') {
      const t = n.toISOString().split('T')[0]
      setFrom(t); setTo(t)
    } else if (kind === 'thisMonth') {
      setFrom(new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split('T')[0])
      setTo(n.toISOString().split('T')[0])
    } else if (kind === 'thisYear') {
      setFrom(new Date(n.getFullYear(), 0, 1).toISOString().split('T')[0])
      setTo(n.toISOString().split('T')[0])
    } else if (kind === 'lastMonth') {
      setFrom(new Date(n.getFullYear(), n.getMonth() - 1, 1).toISOString().split('T')[0])
      setTo(new Date(n.getFullYear(), n.getMonth(), 0).toISOString().split('T')[0])
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <Label className="text-xs text-slate-500">From Date</Label>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">To Date</Label>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="mt-1" />
            </div>
            <div className="w-48">
              <Label className="text-xs text-slate-500">Expense Head</Label>
              <Select value={headId} onValueChange={setHeadId}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Heads</SelectItem>
                  {heads.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <Label className="text-xs text-slate-500">Group By</Label>
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="head">Expense Head</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={load} className="bg-emerald-600 hover:bg-emerald-700">Apply</Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button size="sm" variant="outline" onClick={() => handlePreset('today')}>Today</Button>
            <Button size="sm" variant="outline" onClick={() => handlePreset('thisMonth')}>This Month</Button>
            <Button size="sm" variant="outline" onClick={() => handlePreset('lastMonth')}>Last Month</Button>
            <Button size="sm" variant="outline" onClick={() => handlePreset('thisYear')}>This Year</Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(data.totalAmount)}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Total Entries</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{data.count}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Average per Entry</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {formatCurrency(data.count > 0 ? data.totalAmount / data.count : 0)}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-slate-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Group summary */}
      {data && data.groups && data.groups.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              Summary by {groupBy === 'head' ? 'Expense Head' : groupBy === 'month' ? 'Month' : 'Date'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-slate-600">
                      {groupBy === 'head' ? 'Head Name' : groupBy === 'month' ? 'Month' : 'Date'}
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-600">Entries</th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-600">Amount</th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-600">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.groups.map((g: any, i: number) => {
                    const pct = data.totalAmount > 0 ? (g.amount / data.totalAmount) * 100 : 0
                    return (
                      <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-medium text-slate-900">{g.label || g.name}</td>
                        <td className="px-4 py-2.5 text-right text-slate-600">{g.count}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-red-600">{formatCurrency(g.amount)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-red-500" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-slate-600 w-10 text-right">{pct.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td className="px-4 py-2.5 font-bold">Total</td>
                    <td className="px-4 py-2.5 text-right font-bold">{data.count}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-red-600">{formatCurrency(data.totalAmount)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed list */}
      {data && data.expenses && data.expenses.length > 0 && (
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <ExportButtons
            filename="expense-report"
            title="Expense Report"
            columns={[
              { key: 'expenseDate', label: 'Date', format: (v: any) => formatDate(v) },
              { key: 'title', label: 'Title' },
              { key: 'headName', label: 'Head', format: (_v: any, row: any) => row.head?.name || 'No Head' },
              { key: 'amount', label: 'Amount', format: (v: any) => formatCurrency(Number(v || 0)) },
              { key: 'note', label: 'Note' },
            ]}
            rows={data.expenses}
          />
        </div>
      )}

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-600" /> Detailed Expenses
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : !data || data.expenses.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No expenses found in this period</div>
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
                  </tr>
                </thead>
                <tbody>
                  {data.expenses.map((e: any) => (
                    <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-600">{formatDate(e.expenseDate)}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-900">{e.title}</td>
                      <td className="px-4 py-2.5">
                        {e.head ? (
                          <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100">{e.head.name}</Badge>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No head</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 max-w-xs truncate">{e.note || '-'}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-red-600">{formatCurrency(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={4} className="px-4 py-2.5 font-bold text-right">Total</td>
                    <td className="px-4 py-2.5 text-right font-bold text-red-600">{formatCurrency(data.totalAmount)}</td>
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
