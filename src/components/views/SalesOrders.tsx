'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Trash2, Search, Eye, Edit, FileText, X } from 'lucide-react'
import { api, formatCurrency, formatDate } from '@/lib/api'
import { toast } from 'sonner'

interface SalesOrderItem {
  id?: string
  itemId: string
  itemName?: string
  uom: string
  qty: number
  unitPrice: number
  total: number
}

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

interface Item { id: string; name: string; uomId: string; uom: { id: string; name: string }; unitPrice: number }
interface Tailor { id: string; name: string }
interface Customer { id: string; name: string; phone: string; address?: string }

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
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [viewOrder, setViewOrder] = useState<SalesOrder | null>(null)
  const [editOrder, setEditOrder] = useState<SalesOrder | null>(null)

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
            <Button onClick={() => setShowCreate(true)} className="bg-emerald-600 hover:bg-emerald-700">
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
            <div className="text-center py-12 text-slate-500">No sales orders found</div>
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
                          <Button size="sm" variant="ghost" onClick={() => setViewOrder(o)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditOrder(o)}>
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

      {showCreate && (
        <SalesOrderForm
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); load() }}
        />
      )}

      {editOrder && (
        <SalesOrderForm
          order={editOrder}
          onClose={() => setEditOrder(null)}
          onSaved={() => { setEditOrder(null); load() }}
        />
      )}

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

function SalesOrderForm({ order, onClose, onSaved }: { order?: SalesOrder; onClose: () => void; onSaved: () => void }) {
  const [items, setItems] = useState<SalesOrderItem[]>([])
  const [dbItems, setDbItems] = useState<Item[]>([])
  const [tailors, setTailors] = useState<Tailor[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [deliveryInfos, setDeliveryInfos] = useState<{ id: string; label: string; note: string }[]>([])
  const [tailorId, setTailorId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0])
  const [deliveryDate, setDeliveryDate] = useState('')
  const [salesNote, setSalesNote] = useState('')
  const [deliveryInfo, setDeliveryInfo] = useState('')
  const [discount, setDiscount] = useState(0)
  const [saving, setSaving] = useState(false)
  const [showNewCustomer, setShowNewCustomer] = useState(false)

  // New customer form
  const [ncName, setNcName] = useState('')
  const [ncPhone, setNcPhone] = useState('')
  const [ncAddress, setNcAddress] = useState('')

  useEffect(() => {
    Promise.all([
      api.listItems(),
      api.listTailors(),
      api.listCustomers(),
      api.listDeliveryInfo()
    ]).then(([i, t, c, d]) => {
      setDbItems(i.items)
      setTailors(t.items)
      setCustomers(c.items)
      setDeliveryInfos(d.items)
    })
  }, [])

  useEffect(() => {
    if (order) {
      api.getSalesOrder(order.id).then(res => {
        const o = res.order
        setTailorId(o.tailorId || '')
        setCustomerId(o.customerId)
        setOrderDate(new Date(o.orderDate).toISOString().split('T')[0])
        setDeliveryDate(o.deliveryDate ? new Date(o.deliveryDate).toISOString().split('T')[0] : '')
        setSalesNote(o.salesNote || '')
        setDeliveryInfo(o.deliveryInfo || '')
        setDiscount(o.discount)
        setItems(o.items.map((it: any) => ({
          id: it.id,
          itemId: it.itemId,
          itemName: it.item.name,
          uom: it.uom,
          qty: it.qty,
          unitPrice: it.unitPrice,
          total: it.total
        })))
      })
    } else {
      // Add a blank item by default
      setItems([{ itemId: '', uom: '', qty: 1, unitPrice: 0, total: 0 }])
    }
  }, [order])

  function addItem() {
    setItems([...items, { itemId: '', uom: '', qty: 1, unitPrice: 0, total: 0 }])
  }

  function removeItem(idx: number) {
    if (items.length === 1) {
      toast.error('At least one item required')
      return
    }
    setItems(items.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, field: keyof SalesOrderItem, value: any) {
    const next = [...items]
    ;(next[idx] as any)[field] = value
    if (field === 'itemId') {
      const dbItem = dbItems.find(i => i.id === value)
      if (dbItem) {
        next[idx].uom = dbItem.uom.name
        next[idx].unitPrice = dbItem.unitPrice
        next[idx].itemName = dbItem.name
      }
    }
    next[idx].total = (Number(next[idx].qty) || 0) * (Number(next[idx].unitPrice) || 0)
    setItems(next)
  }

  const subTotal = items.reduce((s, it) => s + (Number(it.total) || 0), 0)
  const grandTotal = subTotal - (Number(discount) || 0)

  async function handleCreateCustomer() {
    if (!ncName || !ncPhone) {
      toast.error('Name and phone required')
      return
    }
    try {
      const res = await api.createCustomer({ name: ncName, phone: ncPhone, address: ncAddress })
      setCustomers([...customers, res.item])
      setCustomerId(res.item.id)
      setShowNewCustomer(false)
      setNcName(''); setNcPhone(''); setNcAddress('')
      toast.success('Customer added')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function handleSave() {
    if (!customerId) { toast.error('Customer required'); return }
    if (!orderDate) { toast.error('Order date required'); return }
    const validItems = items.filter(it => it.itemId && it.qty > 0)
    if (validItems.length === 0) { toast.error('At least one valid item required'); return }

    setSaving(true)
    try {
      const payload = {
        orderDate,
        deliveryDate: deliveryDate || undefined,
        tailorId: tailorId || undefined,
        customerId,
        salesNote,
        deliveryInfo,
        items: validItems.map(it => ({
          itemId: it.itemId,
          qty: it.qty,
          uom: it.uom,
          unitPrice: it.unitPrice,
          total: it.total
        })),
        discount: Number(discount) || 0
      }
      if (order) {
        await api.updateSalesOrder(order.id, payload)
        toast.success('Sales order updated')
      } else {
        await api.createSalesOrder(payload)
        toast.success('Sales order created')
      }
      onSaved()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{order ? `Edit Order: ${order.orderId}` : 'Create New Sales Order'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header info */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Order Date *</Label>
              <Input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Delivery Date</Label>
              <Input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Tailor</Label>
              <Select value={tailorId} onValueChange={setTailorId}>
                <SelectTrigger><SelectValue placeholder="Select tailor" /></SelectTrigger>
                <SelectContent>
                  {tailors.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Customer *</Label>
              <div className="flex gap-2">
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name} - {c.phone}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button type="button" size="icon" variant="outline" onClick={() => setShowNewCustomer(true)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Sales Note</Label>
              <Textarea value={salesNote} onChange={e => setSalesNote(e.target.value)} rows={2} placeholder="Internal sales note..." />
            </div>
            <div>
              <Label className="text-xs">Delivery Information</Label>
              <Textarea
                value={deliveryInfo}
                onChange={e => setDeliveryInfo(e.target.value)}
                rows={2}
                placeholder="Delivery instructions..."
              />
              {deliveryInfos.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {deliveryInfos.map(d => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDeliveryInfo(d.note)}
                      className="text-xs px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Items table */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="text-sm font-medium">Items</Label>
              <Button type="button" size="sm" variant="outline" onClick={addItem}>
                <Plus className="w-3 h-3 mr-1" /> Add Item
              </Button>
            </div>
            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-2 py-2 font-medium text-slate-600 min-w-[200px]">Item</th>
                    <th className="text-right px-2 py-2 font-medium text-slate-600 w-20">Qty</th>
                    <th className="text-left px-2 py-2 font-medium text-slate-600 w-20">UoM</th>
                    <th className="text-right px-2 py-2 font-medium text-slate-600 w-28">Unit Price</th>
                    <th className="text-right px-2 py-2 font-medium text-slate-600 w-32">Total</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="px-2 py-1.5">
                        <Select value={it.itemId} onValueChange={(v) => updateItem(idx, 'itemId', v)}>
                          <SelectTrigger className="h-8"><SelectValue placeholder="Select item" /></SelectTrigger>
                          <SelectContent>
                            {dbItems.map(i => <SelectItem key={i.id} value={i.id}>{i.name} ({i.uom.name})</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          value={it.qty}
                          onChange={e => updateItem(idx, 'qty', parseFloat(e.target.value) || 0)}
                          className="h-8 text-right"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-slate-600">{it.uom || '-'}</td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          value={it.unitPrice}
                          onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="h-8 text-right"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right font-medium">{formatCurrency(it.total)}</td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 bg-emerald-50 p-3 rounded-lg">
              <p className="text-xs text-emerald-700">In Words</p>
              <p className="text-sm font-medium text-emerald-900 italic mt-1">
                {numberToWords(grandTotal)}
              </p>
            </div>
            <div className="w-full md:w-72 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Sub Total</span>
                <span className="font-medium">{formatCurrency(subTotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Discount</span>
                <Input
                  type="number"
                  value={discount}
                  onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                  className="h-7 w-28 text-right"
                />
              </div>
              <div className="flex justify-between text-base border-t border-slate-200 pt-1.5">
                <span className="font-semibold">Grand Total</span>
                <span className="font-bold">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? 'Saving...' : order ? 'Update Order' : 'Create Order'}
          </Button>
        </DialogFooter>

        {showNewCustomer && (
          <Dialog open onOpenChange={setShowNewCustomer}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Customer</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Name *</Label>
                  <Input value={ncName} onChange={e => setNcName(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Contact Number *</Label>
                  <Input
                    value={ncPhone}
                    onChange={e => setNcPhone(e.target.value)}
                    placeholder="Unique contact number"
                  />
                  <p className="text-xs text-slate-500 mt-1">System will check for duplicates automatically</p>
                </div>
                <div>
                  <Label className="text-xs">Address</Label>
                  <Textarea value={ncAddress} onChange={e => setNcAddress(e.target.value)} rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewCustomer(false)}>Cancel</Button>
                <Button onClick={handleCreateCustomer} className="bg-emerald-600 hover:bg-emerald-700">Add Customer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  )
}
