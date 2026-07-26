'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

export default function Delivery() {
  const setView = useAppStore(s => s.setView)
  const setSelectedOrderId = useAppStore(s => s.setSelectedOrderId)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [orders, setOrders] = useState<OrderListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  // Detail panel
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

  // Pagination
  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginatedOrders = orders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  // When user clicks an order, fetch its full details (with deliveries)
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

  function closeDetail() {
    setSelectedOrder(null)
  }

  function openCreateDelivery() {
    if (!selectedOrder) return
    setSelectedOrderId(selectedOrder.id)
    setView('delivery-create')
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
            <div className="w-[160px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="full_pending">Full Pending</SelectItem>
                  <SelectItem value="partial_pending">Partial Pending</SelectItem>
                  <SelectItem value="full_delivered">Full Delivered</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={load} className="bg-emerald-600 hover:bg-emerald-700">
              <Search className="w-4 h-4 mr-1" /> Search
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            💡 Click "View" on any order to see its items, delivery history, and create a new delivery.
          </p>
        </CardContent>
      </Card>

      {/* Detail panel (shown when an order is selected) */}
      {(selectedOrder || loadingDetail) && (
        <Card className="border-emerald-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-emerald-900">
                📦 Order Detail {selectedOrder && <span className="font-mono">— {selectedOrder.orderId}</span>}
              </h3>
              <Button size="sm" variant="ghost" onClick={closeDetail}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {loadingDetail && <Skeleton className="h-40 w-full" />}

            {selectedOrder && (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold">{selectedOrder.orderId}</h3>
                      <DeliveryStatusBadge status={selectedOrder.status} />
                    </div>
                    <p className="text-sm text-slate-600 mt-1">
                      {selectedOrder.customer.name} • {selectedOrder.customer.phone}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Order Date: {formatDate(selectedOrder.orderDate)}
                      {selectedOrder.tailor && ` • Tailor: ${selectedOrder.tailor.name}`}
                    </p>
                  </div>
                  {selectedOrder.status !== 'full_delivered' && selectedOrder.status !== 'closed' && (
                    <Button onClick={openCreateDelivery} className="bg-emerald-600 hover:bg-emerald-700">
                      <Truck className="w-4 h-4 mr-1" /> Create Delivery
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>

                <div className="border border-slate-200 rounded-lg overflow-x-auto mb-4">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-slate-600">Item</th>
                        <th className="text-right px-3 py-2 font-medium text-slate-600">Ordered</th>
                        <th className="text-right px-3 py-2 font-medium text-slate-600">Delivered</th>
                        <th className="text-right px-3 py-2 font-medium text-slate-600">Remaining</th>
                        <th className="text-center px-3 py-2 font-medium text-slate-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((it: any) => {
                        const remaining = it.qty - it.deliveredQty
                        const status = it.deliveredQty === 0 ? 'pending' : it.deliveredQty >= it.qty ? 'delivered' : 'partial'
                        return (
                          <tr key={it.id} className="border-b border-slate-100">
                            <td className="px-3 py-2 font-medium">{it.item.name}</td>
                            <td className="px-3 py-2 text-right">{it.qty} {it.uom}</td>
                            <td className="px-3 py-2 text-right text-emerald-600 font-medium">{it.deliveredQty}</td>
                            <td className="px-3 py-2 text-right">
                              <span className={remaining > 0 ? 'text-amber-600 font-medium' : 'text-slate-400'}>
                                {remaining}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              {status === 'pending' && <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pending</Badge>}
                              {status === 'partial' && <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">Partial</Badge>}
                              {status === 'delivered' && <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Delivered</Badge>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {selectedOrder.deliveries.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-3">Delivery History ({selectedOrder.deliveries.length})</h4>
                    <div className="space-y-3">
                      {selectedOrder.deliveries.map((d: any) => (
                        <div key={d.id} className="border border-slate-200 rounded-lg p-3 flex flex-wrap justify-between items-start gap-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-xs font-semibold text-slate-900">{d.deliveryId}</span>
                              <span className="text-xs text-slate-500">{formatDate(d.deliveryDate)}</span>
                            </div>
                            {d.note && <p className="text-xs text-slate-600 mb-1">{d.note}</p>}
                            <div className="text-xs text-slate-700">
                              {d.items.map((di: any) => (
                                <span key={di.id} className="inline-block mr-3">
                                  {di.orderItem.item.name}: <span className="font-medium">{di.qty}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
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
                          >
                            <Printer className="w-3 h-3 mr-1" /> Print Challan
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
              <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No orders found</p>
              <p className="text-xs text-slate-400 mt-1">Try a different search or clear filters</p>
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
                      <th className="text-left px-4 py-2.5 font-medium text-slate-600">Tailor</th>
                      <th className="text-right px-4 py-2.5 font-medium text-slate-600">Items</th>
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
                        <td className="px-4 py-2.5 text-slate-600">{o.tailor?.name || '-'}</td>
                        <td className="px-4 py-2.5 text-right">{o.items?.length || 0}</td>
                        <td className="px-4 py-2.5 text-center">
                          <DeliveryStatusBadge status={o.status} />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openOrderDetail(o)}
                            title="View items & delivery"
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
    </div>
  )
}

function DeliveryStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; icon: any; className: string }> = {
    full_pending: { label: 'Full Pending', icon: Clock, className: 'bg-amber-100 text-amber-700 hover:bg-amber-100' },
    partial_pending: { label: 'Partial', icon: AlertCircle, className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
    full_delivered: { label: 'Delivered', icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' },
    closed: { label: 'Closed', icon: CheckCircle2, className: 'bg-slate-800 text-white hover:bg-slate-800' }
  }
  const v = map[status] || { label: status, icon: AlertCircle, className: 'bg-slate-100 text-slate-700' }
  const Icon = v.icon
  return (
    <Badge variant="secondary" className={v.className}>
      <Icon className="w-3 h-3 mr-1" /> {v.label}
    </Badge>
  )
}
