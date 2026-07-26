'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Search, Eye, Edit, FileText } from 'lucide-react'
import { api, formatCurrency, formatDate } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

interface SalesOrder {
  id: string
  orderId: string
  orderDate: string
  deliveryDate?: string
  tailorId?: string
  tailor?: { id: string; name: string }
  customerId: string
  customer: { id: string; name: string; phone: string; address?: string }
  salesNote?: string
  deliveryInfo?: string
  subTotal: number
  discount: number
  grandTotal: number
  paidAmount: number
  dueAmount: number
  status: string
  paymentStatus: string
  items: any[]
}

function numberToWords(num: number): string {
  if (num === 0) return 'Zero Taka Only'
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const two = (n: number) => n < 20 ? ones[n] : tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
  const three = (n: number) => {
    const h = Math.floor(n / 100), r = n % 100
    let s = ''
    if (h) s += ones[h] + ' Hundred'
    if (r) s += (h ? ' ' : '') + two(r)
    return s
  }
  const convert = (n: number): string => {
    if (n === 0) return ''
    const crore = Math.floor(n / 10000000); n %= 10000000
    const lakh = Math.floor(n / 100000); n %= 100000
    const thousand = Math.floor(n / 1000); n %= 1000
    const parts: string[] = []
    if (crore) parts.push(convert(crore) + ' Crore')
    if (lakh) parts.push(two(lakh) + ' Lakh')
    if (thousand) parts.push(two(thousand) + ' Thousand')
    if (n) parts.push(three(n))
    return parts.filter(Boolean).join(' ')
  }
  const intPart = Math.floor(num)
  const decPart = Math.round((num - intPart) * 100)
  let result = convert(intPart) + ' Taka'
  if (decPart > 0) result += ' and ' + two(decPart) + ' Paisa'
  return result + ' Only'
}

export default function SalesOrders() {
  const setView = useAppStore(s => s.setView)
  const setSelectedOrderId = useAppStore(s => s.setSelectedOrderId)
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewOrder, setViewOrder] = useState<SalesOrder | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.listSalesOrders({ search, status: statusFilter })
      setOrders(res.orders)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => { load() }, [load])

  function handleNew() {
    setView('sales-order-create')
  }

  function handleEdit(o: SalesOrder) {
    setSelectedOrderId(o.id)
    setView('sales-order-edit')
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-slate-500">Search by Order ID / Customer</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-[180px]">
              <Label className="text-xs text-slate-500">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="full_pending">Full Pending</SelectItem>
                  <SelectItem value="partial_pending">Partial Pending</SelectItem>
                  <SelectItem value="full_delivered">Full Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleNew} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-1" /> New Sales Order
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No sales orders found. Click "New Sales Order" to create one.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-slate-600">Order ID</th>
                    <th className="text-left px-4 py-2.5 font-medium text-slate-600">Date</th>
                    <th className="text-left px-4 py-2.5 font-medium text-slate-600">Customer</th>
                    <th className="text-left px-4 py-2.5 font-medium text-slate-600">Tailor</th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-600">Total</th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-600">Due</th>
                    <th className="text-center px-4 py-2.5 font-medium text-slate-600">Status</th>
                    <th className="text-center px-4 py-2.5 font-medium text-slate-600">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono text-xs font-semibold text-slate-900">{o.orderId}</td>
                      <td className="px-4 py-2.5 text-slate-600">{formatDate(o.orderDate)}</td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-slate-900">{o.customer.name}</div>
                        <div className="text-xs text-slate-500">{o.customer.phone}</div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{o.tailor?.name || '-'}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-900">{formatCurrency(o.grandTotal)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={o.dueAmount > 0 ? 'text-red-600 font-medium' : 'text-slate-400'}>
                          {formatCurrency(o.dueAmount)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setViewOrder(o)} title="View">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(o)} title="Edit">
                            <Edit className="w-4 h-4" />
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

      {viewOrder && (
        <OrderDetail order={viewOrder} onClose={() => setViewOrder(null)} />
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    full_pending: { label: 'Full Pending', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100' },
    partial_pending: { label: 'Partial', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
    full_delivered: { label: 'Delivered', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' }
  }
  const v = map[status] || { label: status, className: 'bg-slate-100 text-slate-700' }
  return <Badge variant="secondary" className={v.className}>{v.label}</Badge>
}

function OrderDetail({ order, onClose }: { order: SalesOrder; onClose: () => void }) {
  const [fullOrder, setFullOrder] = useState<any>(null)

  useEffect(() => {
    api.getSalesOrder(order.id).then(res => setFullOrder(res.order)).catch(() => onClose())
  }, [order.id, onClose])

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            Sales Order: {order.orderId}
          </DialogTitle>
        </DialogHeader>
        {fullOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-500">Order Date</p>
                <p className="font-medium">{formatDate(fullOrder.orderDate)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Delivery Date</p>
                <p className="font-medium">{fullOrder.deliveryDate ? formatDate(fullOrder.deliveryDate) : '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Customer</p>
                <p className="font-medium">{fullOrder.customer.name}</p>
                <p className="text-xs text-slate-500">{fullOrder.customer.phone}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Tailor</p>
                <p className="font-medium">{fullOrder.tailor?.name || '-'}</p>
              </div>
            </div>

            {fullOrder.salesNote && (
              <div>
                <p className="text-xs text-slate-500">Sales Note</p>
                <p className="text-sm bg-slate-50 p-2 rounded">{fullOrder.salesNote}</p>
              </div>
            )}
            {fullOrder.deliveryInfo && (
              <div>
                <p className="text-xs text-slate-500">Delivery Information</p>
                <p className="text-sm bg-slate-50 p-2 rounded">{fullOrder.deliveryInfo}</p>
              </div>
            )}

            <div>
              <p className="text-xs text-slate-500 mb-2">Items</p>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">Item</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-600">Qty</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">UoM</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-600">Unit Price</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-600">Delivered</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-600">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fullOrder.items.map((it: any) => (
                      <tr key={it.id} className="border-b border-slate-100">
                        <td className="px-3 py-2 font-medium">{it.item.name}</td>
                        <td className="px-3 py-2 text-right">{it.qty}</td>
                        <td className="px-3 py-2">{it.uom}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(it.unitPrice)}</td>
                        <td className="px-3 py-2 text-right">
                          <span className={it.deliveredQty >= it.qty ? 'text-emerald-600 font-medium' : ''}>
                            {it.deliveredQty}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-medium">{formatCurrency(it.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <div className="w-72 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-600">Sub Total</span><span className="font-medium">{formatCurrency(fullOrder.subTotal)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Discount</span><span className="font-medium text-red-600">- {formatCurrency(fullOrder.discount)}</span></div>
                <div className="flex justify-between text-base border-t border-slate-200 pt-1"><span className="font-semibold">Grand Total</span><span className="font-bold">{formatCurrency(fullOrder.grandTotal)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Paid</span><span className="font-medium text-emerald-600">{formatCurrency(fullOrder.paidAmount)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Due</span><span className="font-bold text-red-600">{formatCurrency(fullOrder.dueAmount)}</span></div>
              </div>
            </div>

            <div className="bg-emerald-50 p-3 rounded-lg">
              <p className="text-xs text-emerald-700">In Words</p>
              <p className="text-sm font-medium text-emerald-900 italic">{numberToWords(fullOrder.grandTotal)}</p>
            </div>

            {fullOrder.deliveries?.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-2">Delivery History ({fullOrder.deliveries.length})</p>
                <div className="space-y-2">
                  {fullOrder.deliveries.map((d: any) => (
                    <div key={d.id} className="border border-slate-200 rounded p-2 text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="font-mono text-xs font-semibold">{d.deliveryId}</span>
                        <span className="text-slate-500 text-xs">{formatDate(d.deliveryDate)}</span>
                      </div>
                      <div className="text-xs text-slate-600">
                        {d.items.map((di: any) => `${di.orderItem.item.name}: ${di.qty}`).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {fullOrder.bills?.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-2">Payment History ({fullOrder.bills.length})</p>
                <div className="space-y-2">
                  {fullOrder.bills.map((b: any) => (
                    <div key={b.id} className="border border-slate-200 rounded p-2 text-sm flex justify-between">
                      <span className="font-mono text-xs font-semibold">{b.billId}</span>
                      <span className="text-slate-500 text-xs">{formatDate(b.collectDate)}</span>
                      <span className="font-medium text-emerald-600">{formatCurrency(b.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Close</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
