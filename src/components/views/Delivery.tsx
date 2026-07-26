'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Truck, ArrowRight, Printer, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { api, formatCurrency, formatDate } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { printChallan } from '@/lib/challan'
import { toast } from 'sonner'

interface FullOrder {
  id: string
  orderId: string
  orderDate: string
  deliveryDate?: string | null
  customer: { name: string; phone: string; address?: string }
  tailor?: { name: string }
  status: string
  items: {
    id: string
    qty: number
    deliveredQty: number
    uom: string
    item: { id: string; name: string }
  }[]
  deliveries: any[]
}

export default function Delivery() {
  const setView = useAppStore(s => s.setView)
  const setSelectedOrderId = useAppStore(s => s.setSelectedOrderId)
  const [search, setSearch] = useState('')
  const [order, setOrder] = useState<FullOrder | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSearch() {
    if (!search.trim()) {
      toast.error('Enter order ID to search')
      return
    }
    setLoading(true)
    setOrder(null)
    try {
      const res = await api.listSalesOrders({ search })
      if (res.orders.length === 0) {
        toast.error('No order found')
        return
      }
      const found = res.orders[0]
      const full = await api.getSalesOrder(found.id)
      setOrder(full.order)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  function openCreateDelivery() {
    if (!order) return
    setSelectedOrderId(order.id)
    setView('delivery-create')
  }

  return (
    <div className="space-y-4">
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <Label className="text-xs text-slate-500">Search by Sales Order ID</Label>
          <div className="flex gap-2 mt-1">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="e.g. SO-20260726-0001"
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch} className="bg-emerald-600 hover:bg-emerald-700">
              <Search className="w-4 h-4 mr-1" /> Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && <Skeleton className="h-64 w-full" />}

      {!loading && !order && (
        <Card className="border-dashed border-slate-300">
          <CardContent className="p-12 text-center">
            <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Search for a sales order to view items and create delivery</p>
          </CardContent>
        </Card>
      )}

      {order && (
        <>
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold">{order.orderId}</h3>
                    <DeliveryStatusBadge status={order.status} />
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    {order.customer.name} • {order.customer.phone}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Order Date: {formatDate(order.orderDate)}
                    {order.tailor && ` • Tailor: ${order.tailor.name}`}
                  </p>
                </div>
                {order.status !== 'full_delivered' && (
                  <Button onClick={openCreateDelivery} className="bg-emerald-600 hover:bg-emerald-700">
                    <Truck className="w-4 h-4 mr-1" /> Create Delivery
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>

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
                    {order.items.map(it => {
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
            </CardContent>
          </Card>

          {order.deliveries.length > 0 && (
            <Card className="border-slate-200">
              <CardContent className="p-4">
                <h4 className="text-sm font-medium text-slate-700 mb-3">Delivery History ({order.deliveries.length})</h4>
                <div className="space-y-3">
                  {order.deliveries.map((d: any) => (
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
                            orderId: order.orderId,
                            orderDate: order.orderDate,
                            deliveryDate: order.deliveryDate,
                            customer: order.customer,
                            tailor: order.tailor,
                            deliveryInfo: (order as any).deliveryInfo
                          },
                          items: d.items
                        })}
                      >
                        <Printer className="w-3 h-3 mr-1" /> Print Challan
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function DeliveryStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; icon: any; className: string }> = {
    full_pending: { label: 'Full Pending', icon: Clock, className: 'bg-amber-100 text-amber-700 hover:bg-amber-100' },
    partial_pending: { label: 'Partial Pending', icon: AlertCircle, className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
    full_delivered: { label: 'Full Delivered', icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' }
  }
  const v = map[status] || { label: status, icon: AlertCircle, className: 'bg-slate-100 text-slate-700' }
  const Icon = v.icon
  return (
    <Badge variant="secondary" className={v.className}>
      <Icon className="w-3 h-3 mr-1" /> {v.label}
    </Badge>
  )
}
