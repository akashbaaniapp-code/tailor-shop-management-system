'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Receipt, Wallet, ChevronRight, ChevronDown, Printer, Calendar, User
} from 'lucide-react'
import { api, formatCurrency, formatDate } from '@/lib/api'
import { printMoneyReceipt } from '@/lib/money-receipt'
import { toast } from 'sonner'

const PAGE_SIZE = 20

interface ReceiptBill {
  id: string
  billId: string
  amount: number
  order: {
    orderId: string
    customer: { name: string; phone: string }
  }
}

interface MoneyReceipt {
  id: string
  receiptId: string
  customerName: string
  customerPhone?: string | null
  customerAddress?: string | null
  receiptDate: string
  totalAmount: number
  method: string
  note?: string | null
  bills: ReceiptBill[]
}

export default function ReportBillCollection() {
  const now = new Date()
  const [from, setFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0])
  const [to, setTo] = useState(now.toISOString().split('T')[0])
  const [search, setSearch] = useState('')

  const [receipts, setReceipts] = useState<MoneyReceipt[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    setPage(1)
    try {
      const res = await api.listMoneyReceipts({
        from: from || undefined,
        to: to || undefined,
        search: search.trim() || undefined
      })
      setReceipts(res.receipts || [])
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [from, to, search])

  useEffect(() => { load() }, [load])

  function toggleExpand(id: string) {
    const next = new Set(expandedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpandedIds(next)
  }

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

  const totalAmount = receipts.reduce((s, r) => s + r.totalAmount, 0)
  const totalBills = receipts.reduce((s, r) => s + r.bills.length, 0)

  // Pagination
  const totalPages = Math.max(1, Math.ceil(receipts.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginatedReceipts = receipts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

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
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-slate-500">Search</Label>
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && load()}
                placeholder="Receipt ID, party name, phone..."
                className="mt-1"
              />
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Total Receipts</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{receipts.length}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Total Collected</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(totalAmount)}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Total Bills Covered</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{totalBills}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Receipts list */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-600" /> Money Receipts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : paginatedReceipts.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p>No money receipts found for this period</p>
              <p className="text-xs text-slate-400 mt-1">
                Collect bills from Bill Collection page to generate receipts
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {paginatedReceipts.map(r => {
                const isExpanded = expandedIds.has(r.id)
                return (
                  <div key={r.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleExpand(r.id)}
                        className="p-1 rounded hover:bg-slate-100 shrink-0"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-semibold text-slate-900">{r.receiptId}</span>
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                            {r.bills.length} bill{r.bills.length === 1 ? '' : 's'}
                          </Badge>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {formatDate(r.receiptDate)}
                          </span>
                          <Badge variant="secondary" className="bg-slate-100 text-slate-600 capitalize">
                            {r.method}
                          </Badge>
                        </div>
                        <div className="text-sm mt-0.5 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span className="font-medium text-slate-800">{r.customerName}</span>
                          {r.customerPhone && <span className="text-xs text-slate-500">• {r.customerPhone}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-600">{formatCurrency(r.totalAmount)}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                        onClick={() => printMoneyReceipt(r)}
                        title="Print Money Receipt"
                      >
                        <Printer className="w-3 h-3 mr-1" /> Print
                      </Button>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 ml-7">
                        {r.note && (
                          <div className="mb-2 p-2 bg-amber-50 rounded text-xs text-amber-800">
                            <strong>Note:</strong> {r.note}
                          </div>
                        )}
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                              <tr>
                                <th className="text-left px-3 py-2 font-medium text-slate-600">#</th>
                                <th className="text-left px-3 py-2 font-medium text-slate-600">Order ID</th>
                                <th className="text-left px-3 py-2 font-medium text-slate-600">Bill ID</th>
                                <th className="text-right px-3 py-2 font-medium text-slate-600">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {r.bills.map((b, i) => (
                                <tr key={b.id} className="border-b border-slate-100">
                                  <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                                  <td className="px-3 py-2 font-mono text-xs">{b.order.orderId}</td>
                                  <td className="px-3 py-2 font-mono text-xs">{b.billId}</td>
                                  <td className="px-3 py-2 text-right font-medium text-emerald-600">
                                    {formatCurrency(b.amount)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                              <tr>
                                <td colSpan={3} className="px-3 py-2 font-bold text-right">Total</td>
                                <td className="px-3 py-2 text-right font-bold text-emerald-600">
                                  {formatCurrency(r.totalAmount)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
              <p className="text-xs text-slate-500">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, receipts.length)} of {receipts.length} receipts
              </p>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Prev</Button>
                <span className="text-sm px-2">Page {currentPage} of {totalPages}</span>
                <Button size="sm" variant="outline" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
