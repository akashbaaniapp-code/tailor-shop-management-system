'use client'

import { useEffect, useState, useCallback } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Search, Eye, Edit, FileText, Printer, Lock } from 'lucide-react'
import { api, formatCurrency, formatDate } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'
import { printInvoice } from '@/lib/invoice'

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

// Dark theme styles
const darkCard = { background: '#14161a', border: '1px solid #2a2d33', borderRadius: '16px' }
const darkInput = { background: '#0b0d0f', border: '1px solid #2a2d33', color: '#fff', borderRadius: '10px' }
const btnGreen = { background: '#1db954', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600 }

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

  function handleNew() { setView('sales-order-create') }

  function handleEdit(o: SalesOrder) {
    setSelectedOrderId(o.id)
    setView('sales-order-edit')
  }

  async function handlePrint(o: SalesOrder) {
    try {
      const res = await api.getSalesOrder(o.id)
      printInvoice(res.order)
    } catch (err: any) {
      toast.error(err.message || 'Failed to load order for printing')
    }
  }

  async function handleClose(o: SalesOrder) {
    if (!confirm(`Close order ${o.orderId}?\n\nOnce closed, the order cannot be modified.`)) return
    try {
      await api.closeSalesOrder(o.id)
      toast.success(`Order ${o.orderId} closed`)
      load()
    } catch (err: any) {
      toast.error(err.message || 'Failed to close order')
    }
  }

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="p-5" style={darkCard}>
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#666' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && load()}
              placeholder="Search by Order ID / Customer..."
              className="w-full pl-10 pr-4 py-3 text-sm outline-none"
              style={darkInput}
            />
          </div>
          <div className="flex gap-3 items-center">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger style={{ ...darkInput, minWidth: '140px' }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ background: '#1a1c1e', border: '1px solid #2a2d33' }}>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="full_pending">Full Pending</SelectItem>
                <SelectItem value="partial_pending">Partial Pending</SelectItem>
                <SelectItem value="full_delivered">Full Delivered</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <button onClick={handleNew} className="px-5 py-3 flex items-center gap-2 transition-all duration-300 hover:-translate-y-0.5" style={btnGreen}>
              <Plus className="w-4 h-4" /> New Sales Order
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={darkCard} className="overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12" style={{ color: '#555' }}>No sales orders found. Click "New Sales Order" to create one.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #2a2d33' }}>
                  <th className="text-left px-6 py-4 font-medium" style={{ color: '#888' }}>Order ID</th>
                  <th className="text-left px-4 py-4 font-medium" style={{ color: '#888' }}>Date</th>
                  <th className="text-left px-4 py-4 font-medium" style={{ color: '#888' }}>Customer</th>
                  <th className="text-left px-4 py-4 font-medium" style={{ color: '#888' }}>Tailor</th>
                  <th className="text-right px-4 py-4 font-medium" style={{ color: '#888' }}>Total</th>
                  <th className="text-right px-4 py-4 font-medium" style={{ color: '#888' }}>Due</th>
                  <th className="text-center px-4 py-4 font-medium" style={{ color: '#888' }}>Status</th>
                  <th className="text-right px-6 py-4 font-medium" style={{ color: '#888' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} style={{ borderBottom: '1px solid #1f2227' }} className="transition-colors hover:bg-[rgba(255,255,255,0.02)]">
                    <td className="px-6 py-4 font-mono text-xs font-semibold" style={{ color: '#fff' }}>{o.orderId}</td>
                    <td className="px-4 py-4" style={{ color: '#888' }}>{formatDate(o.orderDate)}</td>
                    <td className="px-4 py-4">
                      <span className="font-medium" style={{ color: '#fff' }}>{o.customer.name}</span>
                      <span className="block text-xs mt-0.5" style={{ color: '#666' }}>{o.customer.phone}</span>
                    </td>
                    <td className="px-4 py-4" style={{ color: '#888' }}>{o.tailor?.name || '-'}</td>
                    <td className="px-4 py-4 text-right font-medium" style={{ color: '#1db954' }}>{formatCurrency(o.grandTotal)}</td>
                    <td className="px-4 py-4 text-right">
                      <span style={{ color: o.dueAmount > 0 ? '#ff6b6b' : '#444', fontWeight: o.dueAmount > 0 ? 600 : 400 }}>
                        {formatCurrency(o.dueAmount)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-4">
                        <button onClick={() => setViewOrder(o)} title="View" className="transition-colors" style={{ color: '#666' }} onMouseEnter={e => e.currentTarget.style.color = '#d4df3a'} onMouseLeave={e => e.currentTarget.style.color = '#666'}>
                          <Eye className="w-4 h-4" />
                        </button>
                        {o.status !== 'closed' && (
                          <>
                            <button onClick={() => handleEdit(o)} title="Edit" className="transition-colors" style={{ color: '#666' }} onMouseEnter={e => e.currentTarget.style.color = '#3498db'} onMouseLeave={e => e.currentTarget.style.color = '#666'}>
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handlePrint(o)} title="Print Invoice" className="transition-colors" style={{ color: '#666' }} onMouseEnter={e => e.currentTarget.style.color = '#1db954'} onMouseLeave={e => e.currentTarget.style.color = '#666'}>
                              <Printer className="w-4 h-4" />
                            </button>
                            {o.status === 'full_delivered' && (
                              <button onClick={() => handleClose(o)} title="Close Order" className="transition-colors" style={{ color: '#666' }} onMouseEnter={e => e.currentTarget.style.color = '#ff6b6b'} onMouseLeave={e => e.currentTarget.style.color = '#666'}>
                                <Lock className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                        {o.status === 'closed' && (
                          <button onClick={() => handlePrint(o)} title="Print Invoice" className="transition-colors" style={{ color: '#666' }} onMouseEnter={e => e.currentTarget.style.color = '#1db954'} onMouseLeave={e => e.currentTarget.style.color = '#666'}>
                            <Printer className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewOrder && (
        <OrderDetail
          order={viewOrder}
          onClose={() => setViewOrder(null)}
          onCloseOrder={async (o) => {
            await handleClose(o)
            setViewOrder(null)
          }}
        />
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    full_pending: { label: 'Pending', bg: 'rgba(241,196,15,0.15)', color: '#f1c40f' },
    partial_pending: { label: 'Partial', bg: 'rgba(52,152,219,0.15)', color: '#3498db' },
    full_delivered: { label: 'Delivered', bg: 'rgba(29,185,84,0.15)', color: '#1db954' },
    closed: { label: 'Closed', bg: '#2a2d33', color: '#fff' }
  }
  const v = map[status] || { label: status, bg: '#2a2d33', color: '#fff' }
  return <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: v.bg, color: v.color }}>{v.label}</span>
}

function OrderDetail({ order, onClose, onCloseOrder }: {
  order: SalesOrder
  onClose: () => void
  onCloseOrder: (o: SalesOrder) => Promise<void>
}) {
  const [fullOrder, setFullOrder] = useState<any>(null)

  useEffect(() => {
    api.getSalesOrder(order.id).then(res => setFullOrder(res.order)).catch(() => onClose())
  }, [order.id, onClose])

  const darkTextMuted = { color: '#888' }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" style={{ background: '#14161a', border: '1px solid #2a2d33' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: '#d4df3a' }}>
            <FileText className="w-5 h-5" />
            Sales Order: {order.orderId}
          </DialogTitle>
        </DialogHeader>
        {fullOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs mb-1" style={darkTextMuted}>Order Date</p>
                <p className="font-medium" style={{ color: '#fff' }}>{formatDate(fullOrder.orderDate)}</p>
              </div>
              <div>
                <p className="text-xs mb-1" style={darkTextMuted}>Delivery Date</p>
                <p className="font-medium" style={{ color: '#fff' }}>{fullOrder.deliveryDate ? formatDate(fullOrder.deliveryDate) : '-'}</p>
              </div>
              <div>
                <p className="text-xs mb-1" style={darkTextMuted}>Customer</p>
                <p className="font-medium" style={{ color: '#fff' }}>{fullOrder.customer.name}</p>
                <p className="text-xs" style={darkTextMuted}>{fullOrder.customer.phone}</p>
              </div>
              <div>
                <p className="text-xs mb-1" style={darkTextMuted}>Tailor</p>
                <p className="font-medium" style={{ color: '#fff' }}>{fullOrder.tailor?.name || '-'}</p>
              </div>
            </div>

            {fullOrder.salesNote && (
              <div className="p-3 rounded-xl" style={{ background: '#0b0d0f', border: '1px solid #2a2d33' }}>
                <p className="text-xs mb-1" style={darkTextMuted}>Sales Note</p>
                <p className="text-sm" style={{ color: '#ccc' }}>{fullOrder.salesNote}</p>
              </div>
            )}
            {fullOrder.deliveryInfo && (
              <div className="p-3 rounded-xl" style={{ background: '#0b0d0f', border: '1px solid #2a2d33' }}>
                <p className="text-xs mb-1" style={darkTextMuted}>Delivery Information</p>
                <p className="text-sm" style={{ color: '#ccc' }}>{fullOrder.deliveryInfo}</p>
              </div>
            )}

            <div>
              <p className="text-xs mb-2" style={darkTextMuted}>Items</p>
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2a2d33' }}>
                <table className="w-full text-sm">
                  <thead style={{ borderBottom: '1px solid #2a2d33' }}>
                    <tr>
                      <th className="text-left px-3 py-2.5 font-medium" style={darkTextMuted}>Item</th>
                      <th className="text-right px-3 py-2.5 font-medium" style={darkTextMuted}>Qty</th>
                      <th className="text-left px-3 py-2.5 font-medium" style={darkTextMuted}>UoM</th>
                      <th className="text-right px-3 py-2.5 font-medium" style={darkTextMuted}>Unit Price</th>
                      <th className="text-right px-3 py-2.5 font-medium" style={darkTextMuted}>Delivered</th>
                      <th className="text-right px-3 py-2.5 font-medium" style={darkTextMuted}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fullOrder.items.map((it: any) => (
                      <tr key={it.id} style={{ borderBottom: '1px solid #1f2227' }}>
                        <td className="px-3 py-2.5 font-medium" style={{ color: '#fff' }}>{it.item.name}</td>
                        <td className="px-3 py-2.5 text-right" style={darkTextMuted}>{it.qty}</td>
                        <td className="px-3 py-2.5" style={darkTextMuted}>{it.uom}</td>
                        <td className="px-3 py-2.5 text-right" style={darkTextMuted}>{formatCurrency(it.unitPrice)}</td>
                        <td className="px-3 py-2.5 text-right">
                          <span style={{ color: it.deliveredQty >= it.qty ? '#1db954' : '#888', fontWeight: it.deliveredQty >= it.qty ? 500 : 400 }}>
                            {it.deliveredQty}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium" style={{ color: '#fff' }}>{formatCurrency(it.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <div className="w-72 space-y-1.5 text-sm">
                <div className="flex justify-between"><span style={darkTextMuted}>Sub Total</span><span className="font-medium" style={{ color: '#fff' }}>{formatCurrency(fullOrder.subTotal)}</span></div>
                <div className="flex justify-between"><span style={darkTextMuted}>Discount</span><span className="font-medium" style={{ color: '#ff6b6b' }}>- {formatCurrency(fullOrder.discount)}</span></div>
                <div className="flex justify-between text-base pt-2" style={{ borderTop: '1px solid #2a2d33' }}><span className="font-bold" style={{ color: '#fff' }}>Grand Total</span><span className="font-bold" style={{ color: '#d4df3a' }}>{formatCurrency(fullOrder.grandTotal)}</span></div>
                <div className="flex justify-between"><span style={darkTextMuted}>Paid</span><span className="font-medium" style={{ color: '#1db954' }}>{formatCurrency(fullOrder.paidAmount)}</span></div>
                <div className="flex justify-between"><span style={darkTextMuted}>Due</span><span className="font-bold" style={{ color: '#ff6b6b' }}>{formatCurrency(fullOrder.dueAmount)}</span></div>
              </div>
            </div>

            <div className="p-3 rounded-xl" style={{ background: 'rgba(212,223,58,0.05)', border: '1px solid rgba(212,223,58,0.1)' }}>
              <p className="text-xs" style={{ color: 'rgba(212,223,58,0.6)' }}>In Words</p>
              <p className="text-sm font-medium italic mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{numberToWords(fullOrder.grandTotal)}</p>
            </div>

            {fullOrder.deliveries?.length > 0 && (
              <div>
                <p className="text-xs mb-2" style={darkTextMuted}>Delivery History ({fullOrder.deliveries.length})</p>
                <div className="space-y-2">
                  {fullOrder.deliveries.map((d: any) => (
                    <div key={d.id} className="p-3 rounded-xl text-sm" style={{ background: '#0b0d0f', border: '1px solid #2a2d33' }}>
                      <div className="flex justify-between mb-1">
                        <span className="font-mono text-xs font-semibold" style={{ color: '#fff' }}>{d.deliveryId}</span>
                        <span className="text-xs" style={darkTextMuted}>{formatDate(d.deliveryDate)}</span>
                      </div>
                      <div className="text-xs" style={{ color: '#aaa' }}>
                        {d.items.map((di: any) => `${di.orderItem.item.name}: ${di.qty}`).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {fullOrder.bills?.length > 0 && (
              <div>
                <p className="text-xs mb-2" style={darkTextMuted}>Payment History ({fullOrder.bills.length})</p>
                <div className="space-y-2">
                  {fullOrder.bills.map((b: any) => (
                    <div key={b.id} className="p-3 rounded-xl text-sm flex justify-between" style={{ background: '#0b0d0f', border: '1px solid #2a2d33' }}>
                      <span className="font-mono text-xs font-semibold" style={{ color: '#fff' }}>{b.billId}</span>
                      <span className="text-xs" style={darkTextMuted}>{formatDate(b.collectDate)}</span>
                      <span className="font-medium" style={{ color: '#1db954' }}>{formatCurrency(b.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <button onClick={onClose} className="px-5 py-2.5 transition-all duration-300" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #2a2d33', color: 'rgba(255,255,255,0.7)', borderRadius: '10px', fontSize: '14px' }}>Close Window</button>
              <button onClick={() => printInvoice(fullOrder)} className="px-5 py-2.5 flex items-center gap-1.5 transition-all duration-300 hover:opacity-90" style={btnGreen}>
                <Printer className="w-4 h-4" /> Print Invoice
              </button>
              {fullOrder.status === 'full_delivered' && (
                <button onClick={() => onCloseOrder(order)} className="px-5 py-2.5 flex items-center gap-1.5 transition-all duration-300" style={{ background: '#2a2d33', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600 }}>
                  <Lock className="w-4 h-4" /> Close Order
                </button>
              )}
              {fullOrder.status === 'closed' && (
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: '#2a2d33', color: '#fff' }}>
                  <Lock className="w-3 h-3 inline mr-1" /> Order is Closed
                </span>
              )}
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
