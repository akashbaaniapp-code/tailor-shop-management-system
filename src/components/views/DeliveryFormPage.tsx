'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Truck, Printer, Save } from 'lucide-react'
import { api, formatCurrency, formatDate } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { printChallan } from '@/lib/challan'
import { toast } from 'sonner'

interface FullOrderItem {
  id: string
  qty: number
  deliveredQty: number
  uom: string
  item: { id: string; name: string }
}

interface FullOrder {
  id: string
  orderId: string
  orderDate: string
  deliveryDate?: string | null
  customer: { name: string; phone: string; address?: string | null }
  tailor?: { name: string } | null
  status: string
  salesNote?: string | null
  deliveryInfo?: string | null
  items: FullOrderItem[]
  deliveries: any[]
}

export default function DeliveryFormPage() {
  const setView = useAppStore(s => s.setView)
  const selectedOrderId = useAppStore(s => s.selectedOrderId)
  const [order, setOrder] = useState<FullOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [delivering, setDelivering] = useState<Record<string, number>>({})
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [lastDeliveryId, setLastDeliveryId] = useState<string | null>(null)
  const [lastDeliveryItems, setLastDeliveryItems] = useState<any[]>([])

  useEffect(() => {
    if (!selectedOrderId) {
      setView('delivery')
      return
    }
    api.getSalesOrder(selectedOrderId).then(res => {
      setOrder(res.order)
      // Initialize delivering quantities: default to remaining
      const init: Record<string, number> = {}
      res.order.items.forEach((it: FullOrderItem) => {
        init[it.id] = Math.max(0, it.qty - it.deliveredQty)
      })
      setDelivering(init)
      setLoading(false)
    }).catch(err => {
      toast.error(err.message)
      setLoading(false)
    })
  }, [selectedOrderId, setView])

  async function handleDeliver() {
    if (!order) return
    const items = order.items
      .map(it => ({ orderItemId: it.id, qty: delivering[it.id] || 0 }))
      .filter(it => it.qty > 0)

    if (items.length === 0) {
      toast.error('No quantities to deliver')
      return
    }

    setSaving(true)
    try {
      const res = await api.createDelivery({
        orderId: order.id,
        items,
        note,
        deliveryDate
      })
      toast.success('Delivery recorded')
      setLastDeliveryId(res.delivery.deliveryId)
      setLastDeliveryItems(res.delivery.items)

      // Refresh order
      const refreshed = await api.getSalesOrder(order.id)
      setOrder(refreshed.order)
      // Reset delivering quantities
      const init: Record<string, number> = {}
      refreshed.order.items.forEach((it: FullOrderItem) => {
        init[it.id] = Math.max(0, it.qty - it.deliveredQty)
      })
      setDelivering(init)
      setNote('')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handlePrintChallan() {
    if (!order || !lastDeliveryId) return
    printChallan({
      deliveryId: lastDeliveryId,
      deliveryDate: deliveryDate,
      note,
      order: {
        orderId: order.orderId,
        orderDate: order.orderDate,
        deliveryDate: order.deliveryDate,
        customer: order.customer,
        tailor: order.tailor,
        deliveryInfo: order.deliveryInfo
      },
      items: lastDeliveryItems
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-12 text-slate-500">
        Order not found.{' '}
        <Button variant="link" onClick={() => setView('delivery')}>Back to Delivery</Button>
      </div>
    )
  }

  const allFullyDelivered = order.status === 'full_delivered'

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setView('delivery')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Create Delivery</h2>
            <p className="text-sm text-slate-500">
              Order: <span className="font-mono font-semibold">{order.orderId}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setView('delivery')}>Cancel</Button>
          {!allFullyDelivered && (
            <Button onClick={handleDeliver} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              <Save className="w-4 h-4 mr-1" />
              {saving ? 'Saving...' : 'Confirm Delivery'}
            </Button>
          )}
          {lastDeliveryId && (
            <Button onClick={handlePrintChallan} variant="outline" className="border-emerald-600 text-emerald-700 hover:bg-emerald-50">
              <Printer className="w-4 h-4 mr-1" /> Print Challan
            </Button>
          )}
        </div>
      </div>

      {/* Order summary card */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">Customer</p>
              <p className="font-medium">{order.customer.name}</p>
              <p className="text-xs text-slate-500">{order.customer.phone}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Order Date</p>
              <p className="font-medium">{formatDate(order.orderDate)}</p>
              {order.deliveryDate && (
                <p className="text-xs text-slate-500">Expected: {formatDate(order.deliveryDate)}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-500">Tailor</p>
              <p className="font-medium">{order.tailor?.name || 'Not assigned'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Status</p>
              <DeliveryStatusBadge status={order.status} />
            </div>
          </div>
          {order.deliveryInfo && (
            <div className="mt-3 p-2 bg-amber-50 rounded text-sm">
              <p className="text-xs text-amber-700 font-medium">Delivery Information:</p>
              <p className="text-slate-700">{order.deliveryInfo}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery form */}
      {!allFullyDelivered ? (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Items to Deliver</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Delivery date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Delivery Date *</Label>
                  <Input
                    type="date"
                    value={deliveryDate}
                    onChange={e => setDeliveryDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Items table */}
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">Item</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-600">Ordered</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-600">Already Delivered</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-600">Remaining</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-600">Deliver Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map(it => {
                      const remaining = it.qty - it.deliveredQty
                      return (
                        <tr key={it.id} className="border-b border-slate-100">
                          <td className="px-3 py-2 font-medium">{it.item.name}</td>
                          <td className="px-3 py-2 text-right">{it.qty} {it.uom}</td>
                          <td className="px-3 py-2 text-right text-emerald-600">{it.deliveredQty}</td>
                          <td className="px-3 py-2 text-right">
                            <span className={remaining > 0 ? 'text-amber-600 font-medium' : 'text-slate-400'}>
                              {remaining}
                            </span>
                          </td>
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

              {/* Note */}
              <div>
                <Label className="text-xs">Delivery Note (optional)</Label>
                <Textarea
                  rows={2}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Note about this delivery..."
                  className="mt-1"
                />
              </div>

              {/* Action buttons at bottom */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setView('delivery')}>Cancel</Button>
                <Button onClick={handleDeliver} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                  <Save className="w-4 h-4 mr-1" />
                  {saving ? 'Saving...' : 'Confirm Delivery'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-8 text-center">
            <Truck className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-emerald-900">All items delivered</h3>
            <p className="text-sm text-emerald-700 mt-1">
              This order has been fully delivered. No further deliveries can be created.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Last delivery confirmation + print */}
      {lastDeliveryId && (
        <Card className="border-emerald-300 bg-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-emerald-900">✓ Delivery Created Successfully</p>
                <p className="text-xs text-emerald-700 mt-1">
                  Delivery ID: <span className="font-mono font-semibold">{lastDeliveryId}</span>
                </p>
                <p className="text-xs text-emerald-700">
                  Items delivered: {lastDeliveryItems.map((di: any) => `${di.orderItem.item.name}: ${di.qty}`).join(', ')}
                </p>
              </div>
              <Button onClick={handlePrintChallan} className="bg-emerald-600 hover:bg-emerald-700">
                <Printer className="w-4 h-4 mr-1" /> Print Challan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delivery history */}
      {order.deliveries.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Delivery History ({order.deliveries.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
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
                        deliveryInfo: order.deliveryInfo
                      },
                      items: d.items
                    })}
                  >
                    <Printer className="w-3 h-3 mr-1" /> Print
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function DeliveryStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    full_pending: { label: 'Full Pending', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100' },
    partial_pending: { label: 'Partial Pending', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
    full_delivered: { label: 'Full Delivered', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' }
  }
  const v = map[status] || { label: status, className: 'bg-slate-100 text-slate-700' }
  return <Badge variant="secondary" className={v.className}>{v.label}</Badge>
}
