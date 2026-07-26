'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Wallet, Trash2, Receipt } from 'lucide-react'
import { api, formatCurrency, formatDate } from '@/lib/api'
import { toast } from 'sonner'

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
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [bills, setBills] = useState<any[]>([])
  const [showCollect, setShowCollect] = useState(false)
  const [collectAmount, setCollectAmount] = useState(0)
  const [collectMethod, setCollectMethod] = useState('cash')
  const [collectNote, setCollectNote] = useState('')

  async function handleSearch() {
    setLoading(true)
    setOrders([])
    setSelectedOrder(null)
    try {
      const res = await api.listSalesOrders({ search })
      // Filter to orders with due
      setOrders(res.orders.filter((o: Order) => o.dueAmount > 0.01))
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function selectOrder(o: Order) {
    setSelectedOrder(o)
    try {
      const res = await api.listBills(o.id)
      setBills(res.bills)
    } catch {}
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
      // refresh order
      const updated = await api.listSalesOrders({ search: selectedOrder.orderId })
      if (updated.orders.length > 0) {
        setSelectedOrder(updated.orders[0])
        if (updated.orders[0].dueAmount > 0.01) {
          setOrders(updated.orders.filter((o: Order) => o.orderId === selectedOrder.orderId || o.dueAmount > 0.01))
        } else {
          setOrders(prev => prev.filter(o => o.id !== selectedOrder.id))
          setSelectedOrder(updated.orders[0])
        }
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
        setSelectedOrder(updated.orders[0])
        if (updated.orders[0].dueAmount > 0.01) {
          setOrders(prev => prev.map(o => o.id === selectedOrder.id ? updated.orders[0] : o))
        } else {
          // Remove from list if no due
          setOrders(prev => prev.filter(o => o.id !== selectedOrder.id))
          setSelectedOrder(updated.orders[0])
        }
      }
      const bres = await api.listBills(selectedOrder.id)
      setBills(bres.bills)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <Label className="text-xs text-slate-500">Search Orders with Due (by Order ID / Customer)</Label>
          <div className="flex gap-2 mt-1">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search by Order ID or customer name..."
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch} className="bg-emerald-600 hover:bg-emerald-700">
              <Search className="w-4 h-4 mr-1" /> Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && <Skeleton className="h-40 w-full" />}

      {!loading && orders.length > 0 && !selectedOrder && (
        <Card className="border-slate-200">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">Order ID</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">Customer</th>
                  <th className="text-right px-4 py-2.5 font-medium text-slate-600">Total</th>
                  <th className="text-right px-4 py-2.5 font-medium text-slate-600">Paid</th>
                  <th className="text-right px-4 py-2.5 font-medium text-slate-600">Due</th>
                  <th className="text-center px-4 py-2.5 font-medium text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold">{o.orderId}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{o.customer.name}</div>
                      <div className="text-xs text-slate-500">{o.customer.phone}</div>
                    </td>
                    <td className="px-4 py-2.5 text-right">{formatCurrency(o.grandTotal)}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-600">{formatCurrency(o.paidAmount)}</td>
                    <td className="px-4 py-2.5 text-right text-red-600 font-medium">{formatCurrency(o.dueAmount)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Button size="sm" onClick={() => selectOrder(o)} className="bg-emerald-600 hover:bg-emerald-700">
                        <Wallet className="w-4 h-4 mr-1" /> Collect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {!loading && !selectedOrder && orders.length === 0 && (
        <Card className="border-dashed border-slate-300">
          <CardContent className="p-12 text-center">
            <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Search to find orders with due amounts</p>
          </CardContent>
        </Card>
      )}

      {selectedOrder && (
        <Card className="border-slate-200">
          <CardContent className="p-4">
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
              <Button onClick={() => setShowCollect(true)} className="bg-emerald-600 hover:bg-emerald-700">
                <Wallet className="w-4 h-4 mr-1" /> Collect Bill
              </Button>
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
              <h4 className="text-sm font-medium text-slate-700 mb-2">Payment History</h4>
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

            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={() => { setSelectedOrder(null); setBills([]) }}>Back to List</Button>
            </div>
          </CardContent>
        </Card>
      )}

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
