'use client'

import { useEffect, useState } from 'react'
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

// Dark theme styles
const darkCard = { background: '#14161a', border: '1px solid #2a2d33', borderRadius: '16px' }
const darkInput = { background: '#0b0d0f', border: '1px solid #2a2d33', color: '#fff', borderRadius: '8px' }
const btnGreen = { background: '#1db954', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600 }
const btnWhite = { background: '#fff', color: '#000', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600 }
const btnOutline = { background: 'transparent', border: '1px solid #2a2d33', color: '#fff', borderRadius: '8px', fontSize: '14px' }

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
    if (items.length === 0) { toast.error('No quantities to deliver'); return }
    setSaving(true)
    try {
      const res = await api.createDelivery({ orderId: order.id, items, note, deliveryDate })
      toast.success('Delivery recorded')
      setLastDeliveryId(res.delivery.deliveryId)
      setLastDeliveryItems(res.delivery.items)
      const refreshed = await api.getSalesOrder(order.id)
      setOrder(refreshed.order)
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
      <div className="text-center py-12" style={{ color: '#555' }}>
        Order not found.{' '}
        <button onClick={() => setView('delivery')} style={{ color: '#d4df3a', textDecoration: 'underline' }}>Back to Delivery</button>
      </div>
    )
  }

  const allFullyDelivered = order.status === 'full_delivered'

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#1f2227' }}>
            <ArrowLeft className="w-4 h-4" style={{ color: '#888' }} />
          </div>
          <div>
            <p className="text-sm" style={{ color: '#aaa' }}>Order: <span className="font-mono font-semibold" style={{ color: '#fff' }}>{order.orderId}</span></p>
          </div>
        </div>
        <div className="flex gap-2.5">
          <button onClick={() => setView('delivery')} className="px-5 py-2.5 transition-all duration-300" style={btnWhite}>Cancel</button>
          {!allFullyDelivered && (
            <button onClick={handleDeliver} disabled={saving} className="px-5 py-2.5 flex items-center gap-1.5 transition-all duration-300 hover:opacity-90 disabled:opacity-50" style={btnGreen}>
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Confirm Delivery'}
            </button>
          )}
          {lastDeliveryId && (
            <button onClick={handlePrintChallan} className="px-5 py-2.5 flex items-center gap-1.5 transition-all duration-300" style={btnOutline}>
              <Printer className="w-4 h-4" /> Print Challan
            </button>
          )}
        </div>
      </div>

      {/* Order summary card */}
      <div className="p-5" style={darkCard}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <div>
            <h4 className="text-xs mb-1" style={{ color: '#888' }}>Customer</h4>
            <p className="font-medium text-sm" style={{ color: '#fff' }}>{order.customer.name}</p>
            <p className="text-xs" style={{ color: '#aaa' }}>{order.customer.phone}</p>
          </div>
          <div>
            <h4 className="text-xs mb-1" style={{ color: '#888' }}>Order Date</h4>
            <p className="font-medium text-sm" style={{ color: '#fff' }}>{formatDate(order.orderDate)}</p>
            {order.deliveryDate && <p className="text-xs" style={{ color: '#aaa' }}>Expected: {formatDate(order.deliveryDate)}</p>}
          </div>
          <div>
            <h4 className="text-xs mb-1" style={{ color: '#888' }}>Tailor</h4>
            <p className="font-medium text-sm" style={{ color: '#fff' }}>{order.tailor?.name || 'Not assigned'}</p>
          </div>
          <div className="flex items-start justify-end">
            <DeliveryStatusBadge status={order.status} />
          </div>
        </div>
        {order.deliveryInfo && (
          <div className="mt-4 p-3.5 rounded-xl" style={{ background: '#fcf9e8', border: '1px solid #efecc8' }}>
            <h4 className="text-xs mb-1" style={{ color: '#555' }}>Delivery Information</h4>
            <p className="text-sm" style={{ color: '#333' }}>{order.deliveryInfo}</p>
          </div>
        )}
      </div>

      {/* Delivery form */}
      {!allFullyDelivered ? (
        <div className="p-5" style={darkCard}>
          <h3 className="text-base font-medium mb-5" style={{ color: '#fff' }}>Items to Deliver</h3>
          <div className="space-y-5">
            {/* Delivery date */}
            <div>
              <h4 className="text-xs mb-1.5" style={{ color: '#888' }}>Delivery Date <span style={{ color: '#ff6b6b' }}>*</span></h4>
              <input
                type="date"
                value={deliveryDate}
                onChange={e => setDeliveryDate(e.target.value)}
                className="px-3 py-2 text-sm outline-none"
                style={darkInput}
              />
            </div>

            {/* Items table */}
            <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid #222' }}>
              <table className="w-full text-sm">
                <thead style={{ borderBottom: '1px solid #2a2d33' }}>
                  <tr>
                    <th className="text-left px-4 py-3 font-medium" style={{ color: '#888', fontSize: '13px' }}>Item</th>
                    <th className="text-right px-4 py-3 font-medium" style={{ color: '#888', fontSize: '13px' }}>Ordered</th>
                    <th className="text-right px-4 py-3 font-medium" style={{ color: '#888', fontSize: '13px' }}>Already Delivered</th>
                    <th className="text-right px-4 py-3 font-medium" style={{ color: '#888', fontSize: '13px' }}>Remaining</th>
                    <th className="text-right px-4 py-3 font-medium" style={{ color: '#888', fontSize: '13px' }}>Deliver Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map(it => {
                    const remaining = it.qty - it.deliveredQty
                    return (
                      <tr key={it.id} style={{ borderBottom: '1px solid #222' }}>
                        <td className="px-4 py-3 font-medium" style={{ color: '#fff' }}>{it.item.name}</td>
                        <td className="px-4 py-3 text-right" style={{ color: '#888' }}>{it.qty} {it.uom}</td>
                        <td className="px-4 py-3 text-right font-medium" style={{ color: '#1db954' }}>{it.deliveredQty}</td>
                        <td className="px-4 py-3 text-right">
                          <span style={{ color: remaining > 0 ? '#f1c40f' : '#444', fontWeight: remaining > 0 ? 500 : 400 }}>
                            {remaining}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            min={0}
                            max={remaining}
                            value={delivering[it.id]}
                            onChange={e => {
                              const val = Math.min(remaining, Math.max(0, parseFloat(e.target.value) || 0))
                              setDelivering({ ...delivering, [it.id]: val })
                            }}
                            disabled={remaining === 0}
                            className="px-2 py-1.5 text-sm text-center outline-none disabled:opacity-30"
                            style={{ ...darkInput, width: '60px' }}
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
              <h4 className="text-xs mb-1.5" style={{ color: '#888' }}>Delivery Note (Optional)</h4>
              <textarea
                rows={2}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Note about this delivery..."
                className="w-full px-3 py-2.5 text-sm outline-none resize-vertical"
                style={darkInput}
              />
            </div>

            {/* Action footer */}
            <div className="flex justify-end gap-2.5 pt-1">
              <button onClick={() => setView('delivery')} className="px-5 py-2.5 transition-all duration-300" style={btnWhite}>Cancel</button>
              <button onClick={handleDeliver} disabled={saving} className="px-5 py-2.5 flex items-center gap-1.5 transition-all duration-300 hover:opacity-90 disabled:opacity-50" style={btnGreen}>
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Confirm Delivery'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center" style={darkCard}>
          <Truck className="w-12 h-12 mx-auto mb-3" style={{ color: '#1db954' }} />
          <h3 className="text-lg font-semibold" style={{ color: '#1db954' }}>All items delivered</h3>
          <p className="text-sm mt-1" style={{ color: '#888' }}>This order has been fully delivered. No further deliveries can be created.</p>
        </div>
      )}

      {/* Last delivery confirmation */}
      {lastDeliveryId && (
        <div className="p-5" style={{ ...darkCard, borderColor: 'rgba(29,185,84,0.3)' }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: '#1db954' }}>✓ Delivery Created Successfully</p>
              <p className="text-xs mt-1" style={{ color: '#888' }}>
                Delivery ID: <span className="font-mono font-semibold" style={{ color: '#fff' }}>{lastDeliveryId}</span>
              </p>
              <p className="text-xs" style={{ color: '#888' }}>
                Items delivered: {lastDeliveryItems.map((di: any) => `${di.orderItem.item.name}: ${di.qty}`).join(', ')}
              </p>
            </div>
            <button onClick={handlePrintChallan} className="px-5 py-2.5 flex items-center gap-1.5 transition-all duration-300 hover:opacity-90" style={btnGreen}>
              <Printer className="w-4 h-4" /> Print Challan
            </button>
          </div>
        </div>
      )}

      {/* Delivery history */}
      {order.deliveries.length > 0 && (
        <div className="p-5" style={darkCard}>
          <h3 className="text-sm font-medium mb-4" style={{ color: '#fff' }}>Delivery History ({order.deliveries.length})</h3>
          <div className="space-y-3">
            {order.deliveries.map((d: any) => (
              <div key={d.id} className="p-4 rounded-xl flex flex-wrap justify-between items-start gap-2" style={{ background: '#0b0d0f', border: '1px solid #2a2d33' }}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-semibold" style={{ color: '#fff' }}>{d.deliveryId}</span>
                    <span className="text-xs" style={{ color: '#888' }}>{formatDate(d.deliveryDate)}</span>
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
                      orderId: order.orderId,
                      orderDate: order.orderDate,
                      deliveryDate: order.deliveryDate,
                      customer: order.customer,
                      tailor: order.tailor,
                      deliveryInfo: order.deliveryInfo
                    },
                    items: d.items
                  })}
                  className="px-4 py-2 text-sm flex items-center gap-1.5 transition-all duration-300"
                  style={btnOutline}
                >
                  <Printer className="w-3 h-3" /> Print
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DeliveryStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    full_pending: { label: 'Full Pending', bg: 'rgba(241,196,15,0.15)', color: '#f1c40f' },
    partial_pending: { label: 'Partial Pending', bg: 'rgba(52,152,219,0.2)', color: '#3498db' },
    full_delivered: { label: 'Full Delivered', bg: 'rgba(29,185,84,0.2)', color: '#1db954' },
    closed: { label: 'Closed', bg: '#2a2d33', color: '#fff' }
  }
  const v = map[status] || { label: status, bg: '#2a2d33', color: '#fff' }
  return (
    <span className="text-xs font-semibold px-3.5 py-1.5 rounded-full" style={{ background: v.bg, color: v.color }}>
      {v.label}
    </span>
  )
}
