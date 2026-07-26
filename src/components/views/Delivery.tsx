'use client'

import { useEffect, useState, useCallback } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Search, Truck, ArrowRight, Printer, CheckCircle2, Clock, AlertCircle,
  ChevronLeft, ChevronRight, X, Eye
} from 'lucide-react'
import { api, formatCurrency, formatDate } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { printChallan } from '@/lib/challan'
import { toast } from 'sonner'

const PAGE_SIZE = 20

interface OrderListItem {
  id: string
  orderId: string
  orderDate: string
  deliveryDate?: string | null
  status: string
  customer: { name: string; phone: string }
  tailor?: { name: string } | null
  items: any[]
  grandTotal: number
}

interface FullOrder extends OrderListItem {
  deliveryInfo?: string | null
  deliveries: any[]
}

// Dark theme styles
const darkCard = { background: '#14161a', border: '1px solid #2a2d33', borderRadius: '16px' }
const darkInput = { background: '#0b0d0f', border: '1px solid #2a2d33', color: '#fff', borderRadius: '10px' }
const darkTextMuted = { color: '#888' }
const btnGreen = { background: '#1db954', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600 }
const btnOutline = { background: 'transparent', border: '1px solid #2a2d33', color: '#fff', borderRadius: '8px', fontSize: '14px' }

export default function Delivery() {
  const setView = useAppStore(s => s.setView)
  const setSelectedOrderId = useAppStore(s => s.setSelectedOrderId)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [orders, setOrders] = useState<OrderListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const [selectedOrder, setSelectedOrder] = useState<FullOrder | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setPage(1)
    try {
      const res = await api.listSalesOrders({
        search: search.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined
      })
      setOrders(res.orders)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => { load() }, [load])

  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginatedOrders = orders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  async function openOrderDetail(o: OrderListItem) {
    setLoadingDetail(true)
    setSelectedOrder(null)
    try {
      const res = await api.getSalesOrder(o.id)
      setSelectedOrder(res.order)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoadingDetail(false)
    }
  }

  function closeDetail() { setSelectedOrder(null) }

  function openCreateDelivery() {
    if (!selectedOrder) return
    setSelectedOrderId(selectedOrder.id)
    setView('delivery-create')
  }

  return (
    <div className="space-y-5">
      {/* Search + Filters */}
      <div className="p-5" style={darkCard}>
        <p className="text-xs mb-3" style={darkTextMuted}>Search by Order ID, Customer Name, or Phone — leave empty to see all</p>
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#666' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && load()}
              placeholder="e.g. SO-20260726-0001 or customer name..."
              className="w-full pl-10 pr-4 py-3 text-sm outline-none"
              style={darkInput}
            />
          </div>
          <div className="w-[160px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger style={darkInput}><SelectValue /></SelectTrigger>
              <SelectContent style={{ background: '#1a1c1e', border: '1px solid #2a2d33' }}>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="full_pending">Full Pending</SelectItem>
                <SelectItem value="partial_pending">Partial Pending</SelectItem>
                <SelectItem value="full_delivered">Full Delivered</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <button onClick={load} className="px-6 py-3 flex items-center gap-1.5 transition-all duration-300 hover:opacity-90" style={btnGreen}>
            <Search className="w-4 h-4" /> Search
          </button>
        </div>
        <p className="text-xs mt-3 flex items-center gap-1.5" style={{ color: '#555' }}>
          <CheckCircle2 className="w-3 h-3" style={{ color: '#d4df3a' }} />
          Click "View" on any order to see its items, delivery history, and create a new delivery.
        </p>
      </div>

      {/* Detail panel */}
      {(selectedOrder || loadingDetail) && (
        <div className="p-5" style={darkCard}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ color: '#d4df3a' }}>
              📦 Order Detail {selectedOrder && <span className="font-mono">— {selectedOrder.orderId}</span>}
            </h3>
            <button onClick={closeDetail} className="p-1.5 rounded-lg transition-colors" style={{ color: '#666' }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {loadingDetail && <Skeleton className="h-40 w-full" />}

          {selectedOrder && (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold" style={{ color: '#fff' }}>{selectedOrder.orderId}</h3>
                    <DeliveryStatusBadge status={selectedOrder.status} />
                  </div>
                  <p className="text-sm mt-1" style={darkTextMuted}>
                    {selectedOrder.customer.name} • {selectedOrder.customer.phone}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#555' }}>
                    Order Date: {formatDate(selectedOrder.orderDate)}
                    {selectedOrder.tailor && ` • Tailor: ${selectedOrder.tailor.name}`}
                  </p>
                </div>
                {selectedOrder.status !== 'full_delivered' && selectedOrder.status !== 'closed' && (
                  <button onClick={openCreateDelivery} className="px-5 py-2.5 flex items-center gap-1.5 transition-all duration-300 hover:opacity-90" style={btnGreen}>
                    <Truck className="w-4 h-4" /> Create Delivery
                    <ArrowRight className="w-4 h-4 ml-0.5" />
                  </button>
                )}
              </div>

              {/* Items table */}
              <div className="overflow-x-auto rounded-xl mb-4" style={{ border: '1px solid #222' }}>
                <table className="w-full text-sm">
                  <thead style={{ borderBottom: '1px solid #2a2d33' }}>
                    <tr>
                      <th className="text-left px-4 py-3 font-medium" style={{ color: '#888', fontSize: '13px' }}>Item</th>
                      <th className="text-right px-4 py-3 font-medium" style={{ color: '#888', fontSize: '13px' }}>Ordered</th>
                      <th className="text-right px-4 py-3 font-medium" style={{ color: '#888', fontSize: '13px' }}>Delivered</th>
                      <th className="text-right px-4 py-3 font-medium" style={{ color: '#888', fontSize: '13px' }}>Remaining</th>
                      <th className="text-center px-4 py-3 font-medium" style={{ color: '#888', fontSize: '13px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((it: any) => {
                      const remaining = it.qty - it.deliveredQty
                      const status = it.deliveredQty === 0 ? 'pending' : it.deliveredQty >= it.qty ? 'delivered' : 'partial'
                      return (
                        <tr key={it.id} style={{ borderBottom: '1px solid #222' }}>
                          <td className="px-4 py-3 font-medium" style={{ color: '#fff' }}>{it.item.name}</td>
                          <td className="px-4 py-3 text-right" style={darkTextMuted}>{it.qty} {it.uom}</td>
                          <td className="px-4 py-3 text-right font-medium" style={{ color: '#1db954' }}>{it.deliveredQty}</td>
                          <td className="px-4 py-3 text-right">
                            <span style={{ color: remaining > 0 ? '#f1c40f' : '#444', fontWeight: remaining > 0 ? 500 : 400 }}>
                              {remaining}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {status === 'pending' && <span className="text-xs px-3 py-1 rounded-full" style={{ background: 'rgba(241,196,15,0.15)', color: '#f1c40f' }}>Pending</span>}
                            {status === 'partial' && <span className="text-xs px-3 py-1 rounded-full" style={{ background: 'rgba(52,152,219,0.2)', color: '#3498db' }}>Partial</span>}
                            {status === 'delivered' && <span className="text-xs px-3 py-1 rounded-full" style={{ background: 'rgba(29,185,84,0.2)', color: '#1db954' }}>Delivered</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Delivery History */}
              {selectedOrder.deliveries.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3" style={darkTextMuted}>Delivery History ({selectedOrder.deliveries.length})</h4>
                  <div className="space-y-3">
                    {selectedOrder.deliveries.map((d: any) => (
                      <div key={d.id} className="p-4 rounded-xl flex flex-wrap justify-between items-start gap-2" style={{ background: '#0b0d0f', border: '1px solid #2a2d33' }}>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs font-semibold" style={{ color: '#fff' }}>{d.deliveryId}</span>
                            <span className="text-xs" style={darkTextMuted}>{formatDate(d.deliveryDate)}</span>
                          </div>
                          {d.note && <p className="text-xs mb-1" style={{ color: '#aaa' }}>{d.note}</p>}
                          <div className="text-xs" style={{ color: '#aaa' }}>
                            {d.items.map((di: any) => (
                              <span key={di.id} className="inline-block mr-3">
                                {di.orderItem.item.name}: <span className="font-medium" style={{ color: '#fff' }}>{di.qty}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => printChallan({
                            deliveryId: d.deliveryId,
                            deliveryDate: d.deliveryDate,
                            note: d.note,
                            order: {
                              orderId: selectedOrder.orderId,
                              orderDate: selectedOrder.orderDate,
                              deliveryDate: selectedOrder.deliveryDate,
                              customer: selectedOrder.customer,
                              tailor: selectedOrder.tailor,
                              deliveryInfo: selectedOrder.deliveryInfo
                            },
                            items: d.items
                          })}
                          className="px-4 py-2 text-sm flex items-center gap-1.5 transition-all duration-300"
                          style={btnOutline}
                        >
                          <Printer className="w-3 h-3" /> Print Challan
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Orders list */}
      <div style={darkCard}>
        {loading ? (
          <div className="p-5 space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : paginatedOrders.length === 0 ? (
          <div className="text-center py-12">
            <Truck className="w-12 h-12 mx-auto mb-3" style={{ color: '#333' }} />
            <p style={{ color: '#555' }}>No orders found</p>
            <p className="text-xs mt-1" style={{ color: '#444' }}>Try a different search or clear filters</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ borderBottom: '1px solid #2a2d33' }}>
                  <tr>
                    <th className="text-left px-4 py-3.5 font-medium" style={{ color: '#888', fontSize: '13px' }}>Order ID</th>
                    <th className="text-left px-4 py-3.5 font-medium" style={{ color: '#888', fontSize: '13px' }}>Date</th>
                    <th className="text-left px-4 py-3.5 font-medium" style={{ color: '#888', fontSize: '13px' }}>Customer</th>
                    <th className="text-left px-4 py-3.5 font-medium" style={{ color: '#888', fontSize: '13px' }}>Tailor</th>
                    <th className="text-right px-4 py-3.5 font-medium" style={{ color: '#888', fontSize: '13px' }}>Items</th>
                    <th className="text-center px-4 py-3.5 font-medium" style={{ color: '#888', fontSize: '13px' }}>Status</th>
                    <th className="text-center px-4 py-3.5 font-medium" style={{ color: '#888', fontSize: '13px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map(o => (
                    <tr key={o.id} style={{ borderBottom: '1px solid #222' }} className="transition-colors hover:bg-[#1f2227]">
                      <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: '#fff' }}>{o.orderId}</td>
                      <td className="px-4 py-3" style={darkTextMuted}>{formatDate(o.orderDate)}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium" style={{ color: '#fff' }}>{o.customer.name}</div>
                        <div className="text-xs" style={{ color: '#555' }}>{o.customer.phone}</div>
                      </td>
                      <td className="px-4 py-3" style={darkTextMuted}>{o.tailor?.name || '-'}</td>
                      <td className="px-4 py-3 text-right" style={{ color: '#fff' }}>{o.items?.length || 0}</td>
                      <td className="px-4 py-3 text-center">
                        <DeliveryStatusBadge status={o.status} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => openOrderDetail(o)}
                          title="View items & delivery"
                          className="p-2 rounded-lg transition-colors hover:bg-[#2a2d33]"
                          style={{ color: '#666' }}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid #2a2d33' }}>
                <p className="text-xs" style={{ color: '#555' }}>
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, orders.length)} of {orders.length} orders
                </p>
                <div className="flex items-center gap-2">
                  <button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="px-3 py-1.5 transition-all disabled:opacity-30" style={btnOutline}>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm px-2" style={darkTextMuted}>Page {currentPage} of {totalPages}</span>
                  <button disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} className="px-3 py-1.5 transition-all disabled:opacity-30" style={btnOutline}>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {totalPages === 1 && orders.length > 0 && (
              <div className="px-4 py-3 text-center text-xs" style={{ borderTop: '1px solid #2a2d33', color: '#555' }}>
                Showing {orders.length} order{orders.length === 1 ? '' : 's'}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function DeliveryStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    full_pending: { label: 'Full Pending', bg: 'rgba(241,196,15,0.15)', color: '#f1c40f' },
    partial_pending: { label: 'Partial', bg: 'rgba(52,152,219,0.2)', color: '#3498db' },
    full_delivered: { label: 'Delivered', bg: 'rgba(29,185,84,0.2)', color: '#1db954' },
    closed: { label: 'Closed', bg: '#2a2d33', color: '#fff' }
  }
  const v = map[status] || { label: status, bg: '#2a2d33', color: '#fff' }
  return (
    <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: v.bg, color: v.color }}>
      {v.label}
    </span>
  )
}
