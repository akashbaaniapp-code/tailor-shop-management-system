'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, ArrowLeft, Save, UserPlus } from 'lucide-react'
import { api, formatCurrency } from '@/lib/api'
import { useAppStore } from '@/lib/store'
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

export default function SalesOrderFormPage({ orderId }: { orderId?: string }) {
  const setView = useAppStore(s => s.setView)
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
  const [loading, setLoading] = useState(!!orderId)
  const [showNewCustomer, setShowNewCustomer] = useState(false)
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
    }).catch(err => toast.error(err.message))
  }, [])

  useEffect(() => {
    if (orderId) {
      api.getSalesOrder(orderId).then(res => {
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
        setLoading(false)
      }).catch(err => {
        toast.error(err.message)
        setLoading(false)
      })
    } else {
      setItems([{ itemId: '', uom: '', qty: 1, unitPrice: 0, total: 0 }])
    }
  }, [orderId])

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
      if (orderId) {
        await api.updateSalesOrder(orderId, payload)
        toast.success('Sales order updated')
      } else {
        await api.createSalesOrder(payload)
        toast.success('Sales order created')
      }
      setView('sales-orders')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-slate-100 rounded animate-pulse" />
        <div className="h-64 bg-slate-100 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Header with back button */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setView('sales-orders')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {orderId ? 'Edit Sales Order' : 'Create New Sales Order'}
            </h2>
            <p className="text-sm text-slate-500">Fill in the order details below</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setView('sales-orders')}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            <Save className="w-4 h-4 mr-1" />
            {saving ? 'Saving...' : orderId ? 'Update Order' : 'Create Order'}
          </Button>
        </div>
      </div>

      {/* Order info card */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Order Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Order Date *</Label>
              <Input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Delivery Date</Label>
              <Input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Tailor</Label>
              <Select value={tailorId} onValueChange={setTailorId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select tailor" /></SelectTrigger>
                <SelectContent>
                  {tailors.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Customer *</Label>
              <div className="flex gap-2 mt-1">
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name} - {c.phone}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button type="button" size="icon" variant="outline" onClick={() => setShowNewCustomer(true)}>
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div>
              <Label className="text-xs">Sales Note</Label>
              <Textarea value={salesNote} onChange={e => setSalesNote(e.target.value)} rows={2} placeholder="Internal sales note..." className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Delivery Information</Label>
              <Textarea
                value={deliveryInfo}
                onChange={e => setDeliveryInfo(e.target.value)}
                rows={2}
                placeholder="Delivery instructions..."
                className="mt-1"
              />
              {deliveryInfos.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
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
        </CardContent>
      </Card>

      {/* Items card */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-base">Items</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={addItem}>
              <Plus className="w-3 h-3 mr-1" /> Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-slate-600 min-w-[200px]">Item</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600 w-20">Qty</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600 w-20">UoM</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600 w-28">Unit Price</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600 w-32">Total</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="px-3 py-2">
                      <Select value={it.itemId} onValueChange={(v) => updateItem(idx, 'itemId', v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select item" /></SelectTrigger>
                        <SelectContent>
                          {dbItems.map(i => <SelectItem key={i.id} value={i.id}>{i.name} ({i.uom.name})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        value={it.qty}
                        onChange={e => updateItem(idx, 'qty', parseFloat(e.target.value) || 0)}
                        className="h-9 text-right"
                      />
                    </td>
                    <td className="px-3 py-2 text-slate-600">{it.uom || '-'}</td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        value={it.unitPrice}
                        onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="h-9 text-right"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-medium">{formatCurrency(it.total)}</td>
                    <td className="px-3 py-2 text-center">
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
        </CardContent>
      </Card>

      {/* Totals + In Words */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 bg-emerald-50 p-4 rounded-lg">
              <p className="text-xs text-emerald-700">In Words</p>
              <p className="text-base font-medium text-emerald-900 italic mt-1">
                {numberToWords(grandTotal)}
              </p>
            </div>
            <div className="w-full md:w-80 space-y-2 text-sm">
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
                  className="h-8 w-32 text-right"
                />
              </div>
              <div className="flex justify-between text-base border-t border-slate-200 pt-2">
                <span className="font-semibold">Grand Total</span>
                <span className="font-bold">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons at bottom */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={() => setView('sales-orders')}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
          <Save className="w-4 h-4 mr-1" />
          {saving ? 'Saving...' : orderId ? 'Update Order' : 'Create Order'}
        </Button>
      </div>

      {/* New customer dialog (kept as modal — quick add) */}
      {showNewCustomer && (
        <Dialog open onOpenChange={setShowNewCustomer}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Name *</Label>
                <Input value={ncName} onChange={e => setNcName(e.target.value)} autoFocus />
              </div>
              <div>
                <Label className="text-xs">Contact Number * (unique)</Label>
                <Input
                  value={ncPhone}
                  onChange={e => setNcPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                />
                <p className="text-xs text-slate-500 mt-1">Duplicates will be blocked automatically</p>
              </div>
              <div>
                <Label className="text-xs">Address</Label>
                <Textarea rows={2} value={ncAddress} onChange={e => setNcAddress(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewCustomer(false)}>Cancel</Button>
              <Button onClick={handleCreateCustomer} className="bg-emerald-600 hover:bg-emerald-700">Add Customer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
