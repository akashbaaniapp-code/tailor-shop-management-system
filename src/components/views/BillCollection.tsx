'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Search, Wallet, Trash2, Receipt, ChevronLeft, ChevronRight, X, Eye, Printer
} from 'lucide-react'
import { api, formatCurrency, formatDate } from '@/lib/api'
import { printMoneyReceipt } from '@/lib/money-receipt'
import { toast } from 'sonner'

const PAGE_SIZE = 20

interface Order {
  id: string
  orderId: string
  orderDate: string
  customer: { name: string; phone: string }
  grandTotal: number
  paidAmount: number
  dueAmount: number
  paymentStatus: string
  status: string
}

export default function BillCollection() {
  const [search, setSearch] = useState('')
  const [dueOnly, setDueOnly] = useState('due') // 'all' | 'due'
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  // Detail panel
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [bills, setBills] = useState<any[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Collect dialog
  const [showCollect, setShowCollect] = useState(false)
  const [collectAmount, setCollectAmount] = useState(0)
  const [collectMethod, setCollectMethod] = useState('cash')
  const [collectNote, setCollectNote] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setPage(1)
    try {
      const res = await api.listSalesOrders({
        search: search.trim() || undefined
      })
      // Apply due filter
      const filtered = dueOnly === 'due'
        ? res.orders.filter((o: Order) => o.dueAmount > 0.01)
        : res.orders
      setOrders(filtered)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [search, dueOnly])

  useEffect(() => { load() }, [load])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginatedOrders = orders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  // Select an order to view payment details
  async function openOrderDetail(o: Order) {
    setLoadingDetail(true)
    setSelectedOrder(null)
    setBills([])
    try {
      const res = await api.listBills(o.id)
      setSelectedOrder(o)
      setBills(res.bills)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoadingDetail(false)
    }
  }

  function closeDetail() {
    setSelectedOrder(null)
    setBills([])
  }

  async function handleCollect() {
    if (!selectedOrder) return
    if (collectAmount <= 0) { toast.error('Amount must be greater than zero'); return }
    if (collectAmount > selectedOrder.dueAmount + 0.01) {
      toast.error(`Amount exceeds due (${formatCurrency(selectedOrder.dueAmount)})`)
      return
    }
    try {
      await api.createBill({
        orderId: selectedOrder.id,
        amount: collectAmount,
        method: collectMethod,
        note: collectNote
      })
      toast.success('Bill collected')
      setShowCollect(false)
      setCollectAmount(0); setCollectNote('')
      // Refresh order from server
      const updated = await api.listSalesOrders({ search: selectedOrder.orderId })
      if (updated.orders.length > 0) {
        const u = updated.orders[0]
        setSelectedOrder(u)
        // Update in list
        setOrders(prev => {
          if (dueOnly === 'due' && u.dueAmount <= 0.01) {
            // Remove from list if no due and we're filtering by due
            return prev.filter(o => o.id !== u.id)
          }
          return prev.map(o => o.id === u.id ? u : o)
        })
      }
      const bres = await api.listBills(selectedOrder.id)
      setBills(bres.bills)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function handleDeleteBill(billId: string) {
    if (!selectedOrder) return
    if (!confirm('Delete this bill collection?')) return
    try {
      await api.deleteBill(billId)
      toast.success('Bill deleted')
      const updated = await api.listSalesOrders({ search: selectedOrder.orderId })
      if (updated.orders.length > 0) {
        const u = updated.orders[0]
        setSelectedOrder(u)
        setOrders(prev => {
          if (dueOnly === 'due' && u.dueAmount <= 0.01) {
            return prev.filter(o => o.id !== u.id)
          }
          return prev.map(o => o.id === u.id ? u : o)
        })
      }
      const bres = await api.listBills(selectedOrder.id)
      setBills(bres.bills)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search + Filters */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <Label className="text-xs text-slate-500">
            Search by Order ID, Customer Name, or Phone — leave empty to see all
          </Label>
          <div className="flex flex-wrap gap-2 mt-1">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && load()}
                placeholder="e.g. SO-20260726-0001 or customer name..."
                className="pl-9"
              />
            </div>
            <div className="w-[180px]">
              <Select value={dueOnly} onValueChange={setDueOnly}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="due">Due Orders Only</SelectItem>
                  <SelectItem value="all">All Orders</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={load} className="bg-emerald-600 hover:bg-emerald-700">
              <Search className="w-4 h-4 mr-1" /> Search
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            💡 Click "View" on any order to see payment history and collect bills.
          </p>
        </CardContent>
      </Card>

      {/* Detail panel */}
      {(selectedOrder || loadingDetail) && (
        <Card className="border-emerald-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-emerald-900">
                💰 Bill Collection {selectedOrder && <span className="font-mono">— {selectedOrder.orderId}</span>}
              </h3>
              <div className="flex gap-2">
                {selectedOrder && selectedOrder.dueAmount > 0.01 && (
                  <Button size="sm" onClick={() => setShowCollect(true)} className="bg-emerald-600 hover:bg-emerald-700">
                    <Wallet className="w-4 h-4 mr-1" /> Collect
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={closeDetail}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {loadingDetail && <Skeleton className="h-40 w-full" />}

            {selectedOrder && (
              <>
                <div className="flex flex-wrap justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold">{selectedOrder.orderId}</h3>
                      <PaymentBadge status={selectedOrder.paymentStatus} />
                    </div>
                    <p className="text-sm text-slate-600 mt-1">
                      {selectedOrder.customer.name} • {selectedOrder.customer.phone}
                    </p>
                    <p className="text-xs text-slate-500">Order Date: {formatDate(selectedOrder.orderDate)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500">Grand Total</p>
                    <p className="text-lg font-bold text-slate-900">{formatCurrency(selectedOrder.grandTotal)}</p>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-lg">
                    <p className="text-xs text-emerald-700">Collected</p>
                    <p className="text-lg font-bold text-emerald-700">{formatCurrency(selectedOrder.paidAmount)}</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg">
                    <p className="text-xs text-red-700">Due</p>
                    <p className="text-lg font-bold text-red-700">{formatCurrency(selectedOrder.dueAmount)}</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-slate-700">Payment History</h4>
                    {bills.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                        onClick={async () => {
                          try {
                            const res = await api.createMoneyReceipt({
                              billIds: bills.map(b => b.id),
                              method: bills[0]?.method || 'cash',
                              receiptDate: new Date().toISOString().split('T')[0]
                            })
                            toast.success('Money receipt generated')
                            printMoneyReceipt(res.receipt)
                          } catch (err: any) {
                            toast.error(err.message)
                          }
                        }}
                      >
                        <Printer className="w-3 h-3 mr-1" /> Generate Money Receipt
                      </Button>
                    )}
                  </div>
                  {bills.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">No payments yet</p>
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium text-slate-600">Bill ID</th>
                            <th className="text-left px-3 py-2 font-medium text-slate-600">Date</th>
                            <th className="text-left px-3 py-2 font-medium text-slate-600">Method</th>
                            <th className="text-right px-3 py-2 font-medium text-slate-600">Amount</th>
                            <th className="text-center px-3 py-2 font-medium text-slate-600">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bills.map(b => (
                            <tr key={b.id} className="border-b border-slate-100">
                              <td className="px-3 py-2 font-mono text-xs">{b.billId}</td>
                              <td className="px-3 py-2">{formatDate(b.collectDate)}</td>
                              <td className="px-3 py-2 capitalize">{b.method}</td>
                              <td className="px-3 py-2 text-right font-medium text-emerald-600">{formatCurrency(b.amount)}</td>
                              <td className="px-3 py-2 text-center">
                                <Button size="sm" variant="ghost" onClick={() => handleDeleteBill(b.id)}>
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Orders list */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : paginatedOrders.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No orders found</p>
              <p className="text-xs text-slate-400 mt-1">Try a different search or change the filter</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium text-slate-600">Order ID</th>
                      <th className="text-left px-4 py-2.5 font-medium text-slate-600">Date</th>
                      <th className="text-left px-4 py-2.5 font-medium text-slate-600">Customer</th>
                      <th className="text-right px-4 py-2.5 font-medium text-slate-600">Total</th>
                      <th className="text-right px-4 py-2.5 font-medium text-slate-600">Paid</th>
                      <th className="text-right px-4 py-2.5 font-medium text-slate-600">Due</th>
                      <th className="text-center px-4 py-2.5 font-medium text-slate-600">Status</th>
                      <th className="text-center px-4 py-2.5 font-medium text-slate-600">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOrders.map(o => (
                      <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-mono text-xs font-semibold text-slate-900">{o.orderId}</td>
                        <td className="px-4 py-2.5 text-slate-600">{formatDate(o.orderDate)}</td>
                        <td className="px-4 py-2.5">
                          <div className="font-medium">{o.customer.name}</div>
                          <div className="text-xs text-slate-500">{o.customer.phone}</div>
                        </td>
                        <td className="px-4 py-2.5 text-right">{formatCurrency(o.grandTotal)}</td>
                        <td className="px-4 py-2.5 text-right text-emerald-600">{formatCurrency(o.paidAmount)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={o.dueAmount > 0 ? 'text-red-600 font-medium' : 'text-slate-400'}>
                            {formatCurrency(o.dueAmount)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <PaymentBadge status={o.paymentStatus} />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openOrderDetail(o)}
                            title="View payment history"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                  <p className="text-xs text-slate-500">
                    Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, orders.length)} of {orders.length} orders
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage === 1}
                      onClick={() => setPage(currentPage - 1)}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm px-2">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage === totalPages}
                      onClick={() => setPage(currentPage + 1)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Result count when no pagination needed */}
              {totalPages === 1 && orders.length > 0 && (
                <div className="px-4 py-3 border-t border-slate-200 text-xs text-slate-500">
                  Showing {orders.length} order{orders.length === 1 ? '' : 's'}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Collect dialog */}
      {showCollect && selectedOrder && (
        <Dialog open onOpenChange={setShowCollect}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle><Receipt className="w-5 h-5 inline mr-2" />Collect Bill</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="bg-slate-50 p-3 rounded">
                <p className="text-xs text-slate-500">Order</p>
                <p className="font-mono font-semibold">{selectedOrder.orderId}</p>
                <p className="text-xs text-slate-600 mt-1">{selectedOrder.customer.name}</p>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Total Due</span>
                <span className="font-bold text-red-600">{formatCurrency(selectedOrder.dueAmount)}</span>
              </div>
              <div>
                <Label className="text-xs">Amount *</Label>
                <Input
                  type="number"
                  value={collectAmount}
                  onChange={e => setCollectAmount(parseFloat(e.target.value) || 0)}
                  max={selectedOrder.dueAmount}
                  min={0}
                />
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="text-xs h-5"
                  onClick={() => setCollectAmount(selectedOrder.dueAmount)}
                >
                  Set full due amount
                </Button>
              </div>
              <div>
                <Label className="text-xs">Payment Method</Label>
                <Select value={collectMethod} onValueChange={setCollectMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="mobile">Mobile Banking</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Note (optional)</Label>
                <Textarea rows={2} value={collectNote} onChange={e => setCollectNote(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCollect(false)}>Cancel</Button>
              <Button onClick={handleCollect} className="bg-emerald-600 hover:bg-emerald-700">
                <Wallet className="w-4 h-4 mr-1" /> Confirm Collection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    unpaid: { label: 'Unpaid', className: 'bg-red-100 text-red-700 hover:bg-red-100' },
    partial: { label: 'Partial', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100' },
    paid: { label: 'Paid', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' }
  }
  const v = map[status] || { label: status, className: 'bg-slate-100 text-slate-700' }
  return <Badge variant="secondary" className={v.className}>{v.label}</Badge>
}
