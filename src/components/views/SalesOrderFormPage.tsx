'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, ArrowLeft, Save, UserPlus, Printer, CheckCircle2, Search, ChevronDown } from 'lucide-react'
import { api, formatCurrency } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'
import { printInvoice } from '@/lib/invoice'

interface SalesOrderItem {
  id?: string
  itemId: string
  itemName?: string
  uom: string
  qty: number
  qtyFeet?: number | null
  qtyPiece?: number | null
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
  const [deliveryName, setDeliveryName] = useState('')
  const [deliveryContact, setDeliveryContact] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [discount, setDiscount] = useState(0)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!!orderId)
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [ncName, setNcName] = useState('')
  const [ncPhone, setNcPhone] = useState('')
  const [ncAddress, setNcAddress] = useState('')

  // Customer combobox state
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false)

  // When customer is selected, auto-fill delivery fields if they're empty
  function selectCustomer(c: Customer) {
    setCustomerId(c.id)
    setCustomerPopoverOpen(false)
    setCustomerSearch('')
    // Auto-fill delivery contact info from customer (only if empty)
    if (!deliveryName) setDeliveryName(c.name || '')
    if (!deliveryContact) setDeliveryContact(c.phone || '')
    if (!deliveryAddress) setDeliveryAddress(c.address || '')
  }

  const [savedOrderId, setSavedOrderId] = useState<string | null>(null)
  const [savedOrderData, setSavedOrderData] = useState<any>(null)

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
        setDeliveryName(o.deliveryName || '')
        setDeliveryContact(o.deliveryContact || '')
        setDeliveryAddress(o.deliveryAddress || '')
        setDiscount(o.discount)
        setItems(o.items.map((it: any) => ({
          id: it.id,
          itemId: it.itemId,
          itemName: it.item.name,
          uom: it.uom,
          qty: it.qty,
          qtyFeet: it.qtyFeet ?? null,
          qtyPiece: it.qtyPiece ?? null,
          unitPrice: it.unitPrice,
          total: it.total
        })))
        setLoading(false)
      }).catch(err => {
        toast.error(err.message)
        setLoading(false)
      })
    } else {
      setItems([{ itemId: '', uom: '', qty: 0, qtyFeet: null, qtyPiece: null, unitPrice: 0, total: 0 }])
    }
  }, [orderId])

  function addItem() {
    setItems([...items, { itemId: '', uom: '', qty: 0, qtyFeet: null, qtyPiece: null, unitPrice: 0, total: 0 }])
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
        // Reset qty split fields when item changes (they depend on UoM)
        next[idx].qtyFeet = null
        next[idx].qtyPiece = null
        next[idx].qty = 0
      }
    }
    // Recompute effective qty + total.
    // For Feet UoM: unit price is per foot, so total = qtyFeet × unitPrice.
    // qtyPiece is recorded for reference only — it does NOT multiply with unit price.
    // The "qty" field stored in DB = qtyFeet (used for invoice line total).
    // For other UoMs: qty stays as the single input value.
    const isFeet = (next[idx].uom || '').toLowerCase() === 'feet'
    if (isFeet) {
      const feet = Number(next[idx].qtyFeet) || 0
      next[idx].qty = feet
      next[idx].total = feet * (Number(next[idx].unitPrice) || 0)
    } else {
      next[idx].qty = Number(next[idx].qty) || 0
      next[idx].total = (Number(next[idx].qty) || 0) * (Number(next[idx].unitPrice) || 0)
    }
    setItems(next)
  }

  const subTotal = items.reduce((s, it) => s + (Number(it.total) || 0), 0)
  const grandTotal = subTotal - (Number(discount) || 0)

  // Whether ANY row in the items list currently has UoM = "Feet"
  // (case-insensitive). When true, the table renders two qty columns
  // (Feet Qty + Piece Qty) so users can record how many feet AND how many
  // loose pieces were ordered for fabric-like items.
  const anyFeetItem = items.some((it) => it.itemId && (it.uom || '').toLowerCase() === 'feet')

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

    // Validate items: each must have an item selected and at least one qty filled.
    // For Feet UoM: at least one of qtyFeet/qtyPiece must be > 0 (either can be blank).
    // For other UoMs: qty must be > 0.
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (!it.itemId) continue // skip empty rows
      const isFeet = (it.uom || '').toLowerCase() === 'feet'
      if (isFeet) {
        const feet = Number(it.qtyFeet) || 0
        const piece = Number(it.qtyPiece) || 0
        if (feet <= 0 && piece <= 0) {
          toast.error(`Row ${i + 1}: Fill at least one of Feet or Piece quantity`)
          return
        }
      } else {
        if ((Number(it.qty) || 0) <= 0) {
          toast.error(`Row ${i + 1}: Quantity required`)
          return
        }
      }
    }

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
        deliveryName,
        deliveryContact,
        deliveryAddress,
        items: validItems.map(it => ({
          itemId: it.itemId,
          qty: it.qty,
          qtyFeet: it.qtyFeet,
          qtyPiece: it.qtyPiece,
          uom: it.uom,
          unitPrice: it.unitPrice,
          total: it.total
        })),
        discount: Number(discount) || 0
      }
      if (orderId) {
        const updateRes = await api.updateSalesOrder(orderId, payload)
        toast.success('Sales order updated')
        // PUT response already returns the full order with items/deliveries/bills included
        setSavedOrderId(orderId)
        setSavedOrderData(updateRes.order)
      } else {
        const res = await api.createSalesOrder(payload)
        toast.success('Sales order created')
        // Server returns order without customer/tailor/item names (to skip a DB round-trip).
        // We enrich it client-side using data we already have in state.
        const enrichedOrder = {
          ...res.order,
          customer: customers.find((c) => c.id === customerId) || null,
          tailor: tailors.find((t) => t.id === tailorId) || null,
          items: (res.order.items || []).map((it: any) => {
            const dbItem = dbItems.find((i) => i.id === it.itemId)
            return {
              ...it,
              item: dbItem ? { name: dbItem.name, uom: dbItem.uom } : { name: it.itemName || '', uom: { name: it.uom } }
            }
          })
        }
        setSavedOrderId(res.order.id)
        setSavedOrderData(enrichedOrder)
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handlePrintSaved() {
    if (savedOrderData) {
      printInvoice(savedOrderData)
    }
  }

  function handleBackToList() {
    setView('sales-orders')
  }

  function handleCreateAnother() {
    setSavedOrderId(null)
    setSavedOrderData(null)
    setItems([{ itemId: '', uom: '', qty: 0, qtyFeet: null, qtyPiece: null, unitPrice: 0, total: 0 }])
    setCustomerId('')
    setTailorId('')
    setSalesNote('')
    setDeliveryInfo('')
    setDiscount(0)
    setDeliveryDate('')
    setView('sales-order-create')
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-slate-100 rounded animate-pulse" />
        <div className="h-64 bg-slate-100 rounded animate-pulse" />
      </div>
    )
  }

  // Success state — show after save with print option
  if (savedOrderId && savedOrderData) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto pt-8">
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: 'rgba(212, 223, 58, 0.05)',
            border: '1px solid rgba(212, 223, 58, 0.15)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(212, 223, 58, 0.1)' }}>
            <CheckCircle2 className="w-10 h-10" style={{ color: '#d4df3a' }} />
          </div>
          <h2 className="text-2xl font-bold" style={{ color: '#d4df3a' }}>
            {orderId ? 'Order Updated Successfully!' : 'Order Created Successfully!'}
          </h2>
          <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Order ID: <span className="font-mono font-bold" style={{ color: '#fff' }}>{savedOrderData.orderId}</span>
          </p>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Customer: <span className="font-semibold" style={{ color: '#fff' }}>{savedOrderData.customer?.name}</span>
          </p>
          <p className="text-lg font-bold mt-3" style={{ color: '#d4df3a' }}>
            Grand Total: {formatCurrency(savedOrderData.grandTotal)}
          </p>
          <p className="text-xs italic mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {savedOrderData.inWords || ''}
          </p>

          <div className="flex flex-wrap justify-center gap-2 mt-6">
            <button
              onClick={handlePrintSaved}
              className="px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 hover:-translate-y-0.5"
              style={{ background: '#d4df3a', color: '#0b0d0f', fontSize: '14px' }}
            >
              <Printer className="w-4 h-4 inline mr-1" /> Print Invoice
            </button>
            {!orderId && (
              <button
                onClick={handleCreateAnother}
                className="px-6 py-2.5 rounded-xl font-medium transition-all duration-300"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '14px',
                }}
              >
                <Plus className="w-4 h-4 inline mr-1" /> Create Another
              </button>
            )}
            <button
              onClick={handleBackToList}
              className="px-6 py-2.5 rounded-xl font-medium transition-all duration-300"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '14px',
              }}
            >
              Back to Orders
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Dark theme styles for reuse
  const darkCard = {
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '16px',
  }
  const darkInput = {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#ffffff',
    borderRadius: '10px',
  }
  const darkLabel = { color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px', fontWeight: 500 }
  const darkText = { color: '#ffffff' }
  const darkTextMuted = { color: 'rgba(255, 255, 255, 0.4)' }
  const btnPrimary = { background: '#d4df3a', color: '#0b0d0f', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600 }
  const btnSecondary = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', borderRadius: '10px', fontSize: '14px', fontWeight: 500 }

  return (
    <div className="space-y-4 pb-8">
      {/* Header with back button */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('sales-orders')}
            className="p-2 rounded-xl transition-all duration-300"
            style={btnSecondary}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold" style={darkText}>
              {orderId ? 'Edit Sales Order' : 'Create New Sales Order'}
            </h2>
            <p className="text-sm" style={darkTextMuted}>Fill in the order details below</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('sales-orders')}
            className="px-5 py-2 transition-all duration-300"
            style={btnSecondary}
          >Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 flex items-center gap-1.5 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50"
            style={btnPrimary}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : orderId ? 'Update Order' : 'Create Order'}
          </button>
        </div>
      </div>

      {/* Order info card */}
      <div className="p-6" style={darkCard}>
        <p className="text-sm font-medium mb-5" style={darkText}>Order Information</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label className="text-xs" style={darkLabel}>Order Date *</Label>
            <Input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} className="mt-1.5" style={darkInput} />
          </div>
          <div>
            <Label className="text-xs" style={darkLabel}>Delivery Date</Label>
            <Input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="mt-1.5" style={darkInput} />
          </div>
          <div>
            <Label className="text-xs" style={darkLabel}>Tailor</Label>
            <Select value={tailorId} onValueChange={setTailorId}>
              <SelectTrigger className="mt-1.5" style={darkInput}><SelectValue placeholder="Select tailor" /></SelectTrigger>
              <SelectContent style={{ background: '#1a1c1e', border: '1px solid rgba(255,255,255,0.08)' }}>
                {tailors.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs" style={darkLabel}>Customer * (search & select)</Label>
            <div className="flex gap-2 mt-1.5">
              <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-normal"
                    style={darkInput}
                  >
                    {customerId
                      ? (() => {
                          const c = customers.find(c => c.id === customerId)
                          return c ? `${c.name} — ${c.phone}` : 'Select customer'
                        })()
                      : 'Select customer...'}
                    <ChevronDown className="w-4 h-4 ml-2 shrink-0 opacity-30" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start" style={{ background: '#1a1c1e', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="p-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.2)' }} />
                      <Input
                        placeholder="Search by name or phone..."
                        value={customerSearch}
                        onChange={e => setCustomerSearch(e.target.value)}
                        className="pl-8"
                        style={darkInput}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {customers
                      .filter(c => {
                        if (!customerSearch) return true
                        const q = customerSearch.toLowerCase()
                        return c.name.toLowerCase().includes(q) || c.phone.includes(q)
                      })
                      .length === 0 ? (
                      <p className="p-3 text-sm text-center" style={darkTextMuted}>No customers found</p>
                    ) : (
                      customers
                        .filter(c => {
                          if (!customerSearch) return true
                          const q = customerSearch.toLowerCase()
                          return c.name.toLowerCase().includes(q) || c.phone.includes(q)
                        })
                        .map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => selectCustomer(c)}
                            className="w-full text-left px-3 py-2 border-b transition-colors"
                            style={{
                              borderColor: 'rgba(255,255,255,0.04)',
                              background: c.id === customerId ? 'rgba(212,223,58,0.08)' : 'transparent',
                            }}
                            onMouseEnter={(e) => { if (c.id !== customerId) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                            onMouseLeave={(e) => { if (c.id !== customerId) e.currentTarget.style.background = 'transparent' }}
                          >
                            <p className="text-sm font-medium" style={darkText}>{c.name}</p>
                            <p className="text-xs" style={darkTextMuted}>{c.phone}</p>
                            {c.address && <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.2)' }}>{c.address}</p>}
                          </button>
                        ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              <button
                type="button"
                onClick={() => setShowNewCustomer(true)}
                title="Add new customer"
                className="p-2.5 rounded-xl shrink-0 transition-all duration-300"
                style={btnSecondary}
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <Label className="text-xs" style={darkLabel}>Sales Note</Label>
            <Textarea value={salesNote} onChange={e => setSalesNote(e.target.value)} rows={2} placeholder="Internal sales note..." className="mt-1.5" style={darkInput} />
          </div>
          <div>
            <Label className="text-xs" style={darkLabel}>Delivery Instructions (optional)</Label>
            <Textarea
              value={deliveryInfo}
              onChange={e => setDeliveryInfo(e.target.value)}
              rows={2}
              placeholder="Any special delivery instructions..."
              className="mt-1.5"
              style={darkInput}
            />
            {deliveryInfos.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {deliveryInfos.map(d => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDeliveryInfo(d.note)}
                    className="text-xs px-2 py-0.5 rounded-full transition-colors"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Delivery Contact Info — glow box */}
        <div
          className="mt-4 p-5 rounded-2xl"
          style={{
            background: 'rgba(212, 223, 58, 0.05)',
            border: '1px solid rgba(212, 223, 58, 0.15)',
            boxShadow: 'inset 0 0 30px rgba(212, 223, 58, 0.02)',
          }}
        >
          <p className="text-sm font-medium mb-4" style={{ color: 'rgba(212, 223, 58, 0.8)' }}>
            📦 Delivery Contact Information (actual recipient details)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs" style={darkLabel}>Delivery Name</Label>
              <Input value={deliveryName} onChange={e => setDeliveryName(e.target.value)} placeholder="Recipient name" className="mt-1.5" style={darkInput} />
            </div>
            <div>
              <Label className="text-xs" style={darkLabel}>Contact Number</Label>
              <Input value={deliveryContact} onChange={e => setDeliveryContact(e.target.value)} placeholder="01XXXXXXXXX" className="mt-1.5" style={darkInput} />
            </div>
            <div>
              <Label className="text-xs" style={darkLabel}>Delivery Address</Label>
              <Textarea value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} rows={1} placeholder="Full delivery address" className="mt-1.5" style={darkInput} />
            </div>
          </div>
          <p className="text-xs mt-3" style={{ color: 'rgba(212, 223, 58, 0.5)' }}>
            💡 Auto-filled from customer when selected. Edit if delivery is to a different person/address.
          </p>
        </div>
      </div>

      {/* Items card */}
      <div className="p-6" style={darkCard}>
        <div className="flex justify-between items-center mb-5">
          <p className="text-sm font-medium" style={darkText}>Items</p>
          <button
            type="button"
            onClick={addItem}
            className="px-4 py-1.5 rounded-full text-sm flex items-center gap-1.5 transition-all duration-300"
            style={btnSecondary}
          >
            <Plus className="w-3 h-3" /> Add Item
          </button>
        </div>
        <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
          <table className="w-full text-sm">
            <thead style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <tr>
                <th className="text-left px-3 py-2.5 font-medium min-w-[200px]" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>Item</th>
                {anyFeetItem ? (
                  <>
                    <th className="text-right px-3 py-2.5 font-medium w-24" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>Feet Qty</th>
                    <th className="text-right px-3 py-2.5 font-medium w-24" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>Piece Qty</th>
                  </>
                ) : (
                  <th className="text-right px-3 py-2.5 font-medium w-20" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>Qty</th>
                )}
                <th className="text-left px-3 py-2.5 font-medium w-20" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>UoM</th>
                <th className="text-right px-3 py-2.5 font-medium w-28" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>Unit Price</th>
                <th className="text-right px-3 py-2.5 font-medium w-32" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>Total</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => {
                const isFeet = (it.uom || '').toLowerCase() === 'feet'
                return (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td className="px-3 py-2">
                    <Select value={it.itemId} onValueChange={(v) => updateItem(idx, 'itemId', v)}>
                      <SelectTrigger className="h-9" style={darkInput}><SelectValue placeholder="Select item" /></SelectTrigger>
                      <SelectContent style={{ background: '#1a1c1e', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {dbItems.map(i => <SelectItem key={i.id} value={i.id}>{i.name} ({i.uom.name})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  {anyFeetItem ? (
                    <>
                      <td className="px-3 py-2">
                        {isFeet ? (
                          <Input
                            type="number"
                            value={it.qtyFeet ?? ''}
                            onChange={e => updateItem(idx, 'qtyFeet', e.target.value === '' ? null : parseFloat(e.target.value))}
                            placeholder="0"
                            className="h-9 text-right"
                            style={darkInput}
                          />
                        ) : (
                          <Input
                            type="number"
                            value={it.qty}
                            onChange={e => updateItem(idx, 'qty', parseFloat(e.target.value) || 0)}
                            className="h-9 text-right"
                            style={darkInput}
                          />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {isFeet ? (
                          <Input
                            type="number"
                            value={it.qtyPiece ?? ''}
                            onChange={e => updateItem(idx, 'qtyPiece', e.target.value === '' ? null : parseFloat(e.target.value))}
                            placeholder="0"
                            className="h-9 text-right"
                            style={darkInput}
                          />
                        ) : (
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>
                        )}
                      </td>
                    </>
                  ) : (
                    <td className="px-3 py-2">
                      <Input type="number" value={it.qty} onChange={e => updateItem(idx, 'qty', parseFloat(e.target.value) || 0)} className="h-9 text-right" style={darkInput} />
                    </td>
                  )}
                  <td className="px-3 py-2" style={darkTextMuted}>{it.uom || '-'}</td>
                  <td className="px-3 py-2">
                    <Input type="number" value={it.unitPrice} onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)} className="h-9 text-right" style={darkInput} />
                  </td>
                  <td className="px-3 py-2 text-right font-semibold" style={darkText}>{formatCurrency(it.total)}</td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="p-1 transition-colors"
                      style={{ color: 'rgba(255,100,100,0.4)' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#ff6b6b'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,100,100,0.4)'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {anyFeetItem && (
          <p className="text-xs mt-3" style={{ color: 'rgba(212, 223, 58, 0.5)' }}>
            💡 For Feet items: enter Feet Qty (priced) and Piece Qty (reference only — not priced). Unit price multiplies with Feet Qty only. At least one of the two must be filled.
          </p>
        )}
      </div>

      {/* Totals + In Words */}
      <div className="p-6" style={darkCard}>
        <div className="flex flex-col md:flex-row gap-5">
          <div className="flex-1 p-4 rounded-xl" style={{ background: 'rgba(212, 223, 58, 0.05)', border: '1px solid rgba(212, 223, 58, 0.1)' }}>
            <p className="text-xs" style={{ color: 'rgba(212, 223, 58, 0.6)' }}>In Words</p>
            <p className="text-sm font-medium italic mt-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {numberToWords(grandTotal)}
            </p>
          </div>
          <div className="w-full md:w-80 space-y-3 text-sm">
            <div className="flex justify-between">
              <span style={darkTextMuted}>Sub Total</span>
              <span className="font-medium" style={darkText}>{formatCurrency(subTotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span style={darkTextMuted}>Discount</span>
              <Input
                type="number"
                value={discount}
                onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                className="h-8 w-32 text-right"
                style={darkInput}
              />
            </div>
            <div className="flex justify-between text-lg pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="font-bold" style={darkText}>Grand Total</span>
              <span className="font-bold text-xl" style={{ color: '#d4df3a' }}>{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons at bottom */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={() => setView('sales-orders')}
          className="px-5 py-2 transition-all duration-300"
          style={btnSecondary}
        >Cancel</button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 flex items-center gap-1.5 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50"
          style={btnPrimary}
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : orderId ? 'Update Order' : 'Create Order'}
        </button>
      </div>

      {/* New customer dialog (kept as modal — quick add) */}
      {showNewCustomer && (
        <Dialog open onOpenChange={setShowNewCustomer}>
          <DialogContent className="max-w-md" style={{ background: '#1a1c1e', border: '1px solid rgba(255,255,255,0.08)' }}>
            <DialogHeader>
              <DialogTitle style={darkText}>Add New Customer</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs" style={darkLabel}>Name *</Label>
                <Input value={ncName} onChange={e => setNcName(e.target.value)} autoFocus className="mt-1.5" style={darkInput} />
              </div>
              <div>
                <Label className="text-xs" style={darkLabel}>Contact Number * (unique)</Label>
                <Input value={ncPhone} onChange={e => setNcPhone(e.target.value)} placeholder="01XXXXXXXXX" className="mt-1.5" style={darkInput} />
                <p className="text-xs mt-1" style={darkTextMuted}>Duplicates will be blocked automatically</p>
              </div>
              <div>
                <Label className="text-xs" style={darkLabel}>Address</Label>
                <Textarea rows={2} value={ncAddress} onChange={e => setNcAddress(e.target.value)} className="mt-1.5" style={darkInput} />
              </div>
            </div>
            <DialogFooter>
              <button onClick={() => setShowNewCustomer(false)} className="px-5 py-2" style={btnSecondary}>Cancel</button>
              <button onClick={handleCreateCustomer} className="px-5 py-2" style={btnPrimary}>Add Customer</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
