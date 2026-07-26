'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Truck, Search, ChevronRight, ChevronDown, MapPin, Phone, User,
  CheckCircle2, Clock, AlertCircle, Package, Calendar
} from 'lucide-react'
import { api, formatCurrency, formatDate } from '@/lib/api'
import { toast } from 'sonner'

const PAGE_SIZE = 20

interface OrderItem {
  id: string
  qty: number
  uom: string
  unitPrice: number
  total: number
  deliveredQty: number
  remainingQty: number
  item: { name: string }
}

interface DeliveryRecord {
  id: string
  deliveryId: string
  deliveryDate: string
  note?: string | null
  items: { qty: number; itemName: string }[]
}

interface DeliveryOrder {
  id: string
  orderId: string
  orderDate: string
  deliveryDate?: string | null
  status: string
  paymentStatus: string
  grandTotal: number
  deliveryName?: string | null
  deliveryContact?: string | null
  deliveryAddress?: string | null
  customer: { name: string; phone: string; address?: string }
  tailor?: { name: string } | null
  itemCount: number
  totalOrderedQty: number
  totalDeliveredQty: number
  totalRemainingQty: number
  deliveryCount: number
  items: OrderItem[]
  deliveries: DeliveryRecord[]
}

export default function ReportDelivery() {
  const now = new Date()
  const [from, setFrom] = useState(new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0])
  const [to, setTo] = useState(now.toISOString().split('T')[0])
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    setPage(1)
    try {
      const res = await api.deliveryReport({
        from: from || undefined,
        to: to || undefined,
        status: status !== 'all' ? status : undefined,
        search: search.trim() || undefined
      })
      setData(res)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [from, to, status, search])

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

  const orders: DeliveryOrder[] = data?.orders || []
  const summary = data?.summary

  // Pagination
  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginatedOrders = orders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

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
            <div className="w-40">
              <Label className="text-xs text-slate-500">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="full_pending">Full Pending</SelectItem>
                  <SelectItem value="partial_pending">Partial Pending</SelectItem>
                  <SelectItem value="full_delivered">Full Delivered</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-slate-500">Search</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && load()}
                  placeholder="Order ID, customer name, phone..."
                  className="pl-9"
                />
              </div>
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <SummaryCard label="Total Orders" value={String(summary.totalOrders)} icon={<Truck className="w-5 h-5" />} color="emerald" />
          <SummaryCard label="Delivered" value={String(summary.totalDelivered)} icon={<CheckCircle2 className="w-5 h-5" />} color="emerald" />
          <SummaryCard label="Partial" value={String(summary.totalPartial)} icon={<AlertCircle className="w-5 h-5" />} color="blue" />
          <SummaryCard label="Pending" value={String(summary.totalPending)} icon={<Clock className="w-5 h-5" />} color="amber" />
          <SummaryCard label="Delivered Qty" value={String(summary.totalDeliveredQty)} icon={<Package className="w-5 h-5" />} color="emerald" />
          <SummaryCard label="Remaining Qty" value={String(summary.totalRemainingQty)} icon={<AlertCircle className="w-5 h-5" />} color="red" />
        </div>
      ) : null}

      {/* Detailed table */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-600" /> Delivery Details
            {summary && (
              <span className="text-xs text-slate-500 ml-2">
                ({summary.totalDeliveries} total deliveries)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : paginatedOrders.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No delivery data found for this period</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {paginatedOrders.map(o => {
                const isExpanded = expandedIds.has(o.id)
                return (
                  <div key={o.id} className="p-4">
                    {/* Order summary row */}
                    <div
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => toggleExpand(o.id)}
                    >
                      <button className="p-1 rounded hover:bg-slate-100 shrink-0">
                        {isExpanded
                          ? <ChevronDown className="w-4 h-4" />
                          : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-semibold text-slate-900">{o.orderId}</span>
                          <DeliveryStatusBadge status={o.status} />
                          <span className="text-xs text-slate-500">
                            {formatDate(o.orderDate)}
                          </span>
                        </div>
                        <div className="text-sm mt-0.5">
                          <span className="font-medium text-slate-800">{o.customer.name}</span>
                          <span className="text-slate-400 mx-1">•</span>
                          <span className="text-xs text-slate-500">{o.customer.phone}</span>
                        </div>
                      </div>
                      <div className="hidden md:flex items-center gap-4 text-xs text-slate-600">
                        <div className="text-center">
                          <p className="text-slate-400">Items</p>
                          <p className="font-semibold text-slate-800">{o.itemCount}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-slate-400">Ordered</p>
                          <p className="font-semibold text-slate-800">{o.totalOrderedQty}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-slate-400">Delivered</p>
                          <p className="font-semibold text-emerald-600">{o.totalDeliveredQty}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-slate-400">Remaining</p>
                          <p className="font-semibold text-amber-600">{o.totalRemainingQty}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-slate-400">Deliveries</p>
                          <p className="font-semibold text-slate-800">{o.deliveryCount}</p>
                        </div>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="mt-3 ml-7 space-y-4">
                        {/* Customer + Delivery contact info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Bill To (Customer) */}
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
                              <User className="w-3 h-3" /> Bill To (Customer)
                            </p>
                            <div className="space-y-1 text-sm">
                              <p className="font-medium text-slate-900">{o.customer.name}</p>
                              <p className="text-xs text-slate-600 flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {o.customer.phone}
                              </p>
                              {o.customer.address && (
                                <p className="text-xs text-slate-600 flex items-start gap-1">
                                  <MapPin className="w-3 h-3 mt-0.5 shrink-0" /> {o.customer.address}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Delivery To (Actual recipient) */}
                          <div className="p-3 bg-amber-50 rounded-lg">
                            <p className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1">
                              <Truck className="w-3 h-3" /> Delivery To (Actual Recipient)
                            </p>
                            <div className="space-y-1 text-sm">
                              <p className="font-medium text-slate-900">{o.deliveryName || o.customer.name}</p>
                              <p className="text-xs text-slate-600 flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {o.deliveryContact || o.customer.phone}
                              </p>
                              <p className="text-xs text-slate-600 flex items-start gap-1">
                                <MapPin className="w-3 h-3 mt-0.5 shrink-0" /> {o.deliveryAddress || o.customer.address || '-'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Order + Tailor info */}
                        <div className="flex flex-wrap gap-4 text-xs">
                          <div>
                            <span className="text-slate-400">Order Date:</span>{' '}
                            <span className="font-medium text-slate-700">{formatDate(o.orderDate)}</span>
                          </div>
                          {o.deliveryDate && (
                            <div>
                              <span className="text-slate-400">Expected Delivery:</span>{' '}
                              <span className="font-medium text-slate-700">{formatDate(o.deliveryDate)}</span>
                            </div>
                          )}
                          {o.tailor?.name && (
                            <div>
                              <span className="text-slate-400">Tailor:</span>{' '}
                              <span className="font-medium text-slate-700">{o.tailor.name}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-slate-400">Grand Total:</span>{' '}
                            <span className="font-medium text-slate-700">{formatCurrency(o.grandTotal)}</span>
                          </div>
                        </div>

                        {/* Items table */}
                        <div>
                          <p className="text-xs font-semibold text-slate-700 mb-2">Items & Delivery Status</p>
                          <div className="border border-slate-200 rounded-lg overflow-x-auto">
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
                                {o.items.map((it, idx) => {
                                  const itemStatus = it.deliveredQty === 0 ? 'pending'
                                    : it.deliveredQty >= it.qty ? 'delivered' : 'partial'
                                  return (
                                    <tr key={idx} className="border-b border-slate-100">
                                      <td className="px-3 py-2 font-medium text-slate-800">{it.item.name}</td>
                                      <td className="px-3 py-2 text-right">{it.qty} {it.uom}</td>
                                      <td className="px-3 py-2 text-right text-emerald-600 font-medium">{it.deliveredQty}</td>
                                      <td className="px-3 py-2 text-right">
                                        <span className={it.remainingQty > 0 ? 'text-amber-600 font-medium' : 'text-slate-400'}>
                                          {it.remainingQty}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 text-center">
                                        {itemStatus === 'pending' && <Badge variant="secondary" className="bg-amber-100 text-amber-700">Pending</Badge>}
                                        {itemStatus === 'partial' && <Badge variant="secondary" className="bg-blue-100 text-blue-700">Partial</Badge>}
                                        {itemStatus === 'delivered' && <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">Delivered</Badge>}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Delivery history */}
                        {o.deliveries.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-700 mb-2">
                              Delivery History ({o.deliveries.length})
                            </p>
                            <div className="space-y-2">
                              {o.deliveries.map((d, di) => (
                                <div key={di} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                                  <div className="flex flex-wrap justify-between items-start gap-2 mb-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs font-semibold text-slate-900">{d.deliveryId}</span>
                                      <span className="text-xs text-slate-500 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> {formatDate(d.deliveryDate)}
                                      </span>
                                    </div>
                                  </div>
                                  {d.note && <p className="text-xs text-slate-600 mb-1">{d.note}</p>}
                                  <div className="flex flex-wrap gap-2">
                                    {d.items.map((di, i) => (
                                      <Badge key={i} variant="secondary" className="bg-white text-slate-700 text-xs">
                                        {di.itemName}: {di.qty}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {o.deliveries.length === 0 && (
                          <p className="text-xs text-slate-400 italic">No deliveries yet for this order.</p>
                        )}
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
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, orders.length)} of {orders.length} orders
              </p>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                  Prev
                </Button>
                <span className="text-sm px-2">Page {currentPage} of {totalPages}</span>
                <Button size="sm" variant="outline" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({ label, value, icon, color }: {
  label: string; value: string; icon: React.ReactNode; color: 'emerald' | 'blue' | 'amber' | 'red'
}) {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600'
  }
  return (
    <Card className="border-slate-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{value}</p>
          </div>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DeliveryStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    full_pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100' },
    partial_pending: { label: 'Partial', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
    full_delivered: { label: 'Delivered', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' },
    closed: { label: 'Closed', className: 'bg-slate-800 text-white hover:bg-slate-800' }
  }
  const v = map[status] || { label: status, className: 'bg-slate-100 text-slate-700' }
  return <Badge variant="secondary" className={v.className}>{v.label}</Badge>
}
