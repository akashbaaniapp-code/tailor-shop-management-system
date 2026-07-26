'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Truck, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { api, formatCurrency, formatDate, formatDateTime } from '@/lib/api'
import { toast } from 'sonner'

interface FullOrder {
  id: string
  orderId: string
  orderDate: string
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
  const [search, setSearch] = useState('')
  const [order, setOrder] = useState<FullOrder | null>(null)
  const [loading, setLoading] = useState(false)
  const [showDeliver, setShowDeliver] = useState(false)
  const [delivering, setDelivering] = useState<Record<string, number>>({})

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

  function openDeliver() {
    if (!order) return
    const init: Record<string, number> = {}
    order.items.forEach(it => {
      init[it.id] = Math.max(0, it.qty - it.deliveredQty)
    })
    setDelivering(init)
    setShowDeliver(true)
  }

  async function handleDeliver() {
    if (!order) return
    const items = order.items
      .map(it => ({ orderItemId: it.id, qty: delivering[it.id] || 0 }))
      .filter(it => it.qty > 0)

    if (items.length === 0) {
      toast.error('No quantities to deliver')
      return
    }
    try {
      await api.createDelivery({ orderId: order.id, items })
      toast.success('Delivery recorded')
      setShowDeliver(false)
      // refresh
      const full = await api.getSalesOrder(order.id)
      setOrder(full.order)
    } catch (err: any) {
      toast.error(err.message)
    }
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
                    <h3 className="text-lg font-bold text-slate-900">{order.orderId}</h3>
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
                  <Button onClick={openDeliver} className="bg-emerald-600 hover:bg-emerald-700">
                    <Truck className="w-4 h-4 mr-1" /> Create Delivery
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
                <h4 className="text-sm font-medium text-slate-700 mb-3">Delivery History</h4>
                <div className="space-y-3">
                  {order.deliveries.map((d: any) => (
                    <div key={d.id} className="border border-slate-200 rounded-lg p-3">
                      <div className="flex flex-wrap justify-between gap-2 mb-2">
                        <span className="font-mono text-xs font-semibold text-slate-900">{d.deliveryId}</span>
                        <span className="text-xs text-slate-500">{formatDateTime(d.deliveryDate)}</span>
                      </div>
                      {d.note && <p className="text-xs text-slate-600 mb-1">{d.note}</p>}
                      <div className="text-xs text-slate-700">
                        {d.items.map((di: any, idx: number) => (
                          <span key={di.id} className="inline-block mr-3">
                            {di.orderItem.item.name}: <span className="font-medium">{di.qty}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Delivery dialog */}
      {showDeliver && order && (
        <Dialog open onOpenChange={setShowDeliver}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Delivery - {order.orderId}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Enter quantities to deliver. System will not allow over-delivery.</p>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">Item</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-600">Ordered</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-600">Already Delivered</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-600">Deliver Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map(it => {
                      const remaining = it.qty - it.deliveredQty
                      return (
                        <tr key={it.id} className="border-b border-slate-100">
                          <td className="px-3 py-2 font-medium">{it.item.name}</td>
                          <td className="px-3 py-2 text-right">{it.qty}</td>
                          <td className="px-3 py-2 text-right">{it.deliveredQty}</td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              min={0}
                              max={remaining}
                              value={delivering[it.id]}
                              onChange={e => {
                                const val = Math.min(remaining, Math.max(0, parseFloat(e.target.value) || 0))
                                setDelivering({ ...delivering, [it.id]: val })
                              }}
                              disabled={remaining === 0}
                              className="h-8 w-24 ml-auto text-right"
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div>
                <Label className="text-xs">Delivery Note (optional)</Label>
                <Textarea rows={2} placeholder="Note about this delivery..." id="delivery-note" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeliver(false)}>Cancel</Button>
              <Button onClick={handleDeliver} className="bg-emerald-600 hover:bg-emerald-700">
                <Truck className="w-4 h-4 mr-1" /> Confirm Delivery
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
