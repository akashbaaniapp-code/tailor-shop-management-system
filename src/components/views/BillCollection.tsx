'use client'

import { useEffect, useState, useCallback } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Search, Wallet, Trash2, Receipt, ChevronLeft, ChevronRight, X, Eye, Printer
} from 'lucide-react'
import { api, formatCurrency, formatDate } from '@/lib/api'
import { printMoneyReceipt } from '@/lib/money-receipt'
import { toast } from 'sonner'

const PAGE_SIZE = 20

interface Order {
  id: string
  orderId: string
  orderDate: string
  customer: { name: string; phone: string }
  grandTotal: number
  paidAmount: number
  dueAmount: number
  paymentStatus: string
  status: string
}

// Dark theme styles
const darkCard = { background: '#14161a', border: '1px solid #2a2d33', borderRadius: '16px' }
const darkInput = { background: '#0b0d0f', border: '1px solid #2a2d33', color: '#fff', borderRadius: '10px' }
const btnGreen = { background: '#1db954', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600 }
const btnOutline = { background: 'transparent', border: '1px solid #2a2d33', color: '#fff', borderRadius: '8px', fontSize: '14px' }
const darkTextMuted = { color: '#888' }

export default function BillCollection() {
  const [search, setSearch] = useState('')
  const [dueOnly, setDueOnly] = useState('due')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [bills, setBills] = useState<any[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [showCollect, setShowCollect] = useState(false)
  const [collectAmount, setCollectAmount] = useState(0)
  const [collectMethod, setCollectMethod] = useState('cash')
  const [collectNote, setCollectNote] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setPage(1)
    try {
      const res = await api.listSalesOrders({ search: search.trim() || undefined })
      const filtered = dueOnly === 'due'
        ? res.orders.filter((o: Order) => o.dueAmount > 0.01)
        : res.orders
      setOrders(filtered)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [search, dueOnly])

  useEffect(() => { load() }, [load])

  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginatedOrders = orders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  async function openOrderDetail(o: Order) {
    setLoadingDetail(true)
    setSelectedOrder(null)
    setBills([])
    try {
      const res = await api.listBills(o.id)
      setSelectedOrder(o)
      setBills(res.bills)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoadingDetail(false)
    }
  }

  function closeDetail() { setSelectedOrder(null); setBills([]) }

  async function handleCollect() {
    if (!selectedOrder) return
    if (collectAmount <= 0) { toast.error('Amount must be greater than zero'); return }
    if (collectAmount > selectedOrder.dueAmount + 0.01) {
      toast.error(`Amount exceeds due (${formatCurrency(selectedOrder.dueAmount)})`)
      return
    }
    try {
      await api.createBill({ orderId: selectedOrder.id, amount: collectAmount, method: collectMethod, note: collectNote })
      toast.success('Bill collected')
      setShowCollect(false)
      setCollectAmount(0); setCollectNote('')
      const updated = await api.listSalesOrders({ search: selectedOrder.orderId })
      if (updated.orders.length > 0) {
        const u = updated.orders[0]
        setSelectedOrder(u)
        setOrders(prev => {
          if (dueOnly === 'due' && u.dueAmount <= 0.01) return prev.filter(o => o.id !== u.id)
          return prev.map(o => o.id === u.id ? u : o)
        })
      }
      const bres = await api.listBills(selectedOrder.id)
      setBills(bres.bills)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function handleDeleteBill(billId: string) {
    if (!selectedOrder) return
    if (!confirm('Delete this bill collection?')) return
    try {
      await api.deleteBill(billId)
      toast.success('Bill deleted')
      const updated = await api.listSalesOrders({ search: selectedOrder.orderId })
      if (updated.orders.length > 0) {
        const u = updated.orders[0]
        setSelectedOrder(u)
        setOrders(prev => {
          if (dueOnly === 'due' && u.dueAmount <= 0.01) return prev.filter(o => o.id !== u.id)
          return prev.map(o => o.id === u.id ? u : o)
        })
      }
      const bres = await api.listBills(selectedOrder.id)
      setBills(bres.bills)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-5">
      {/* Search + Filters */}
      <div className="p-5" style={darkCard}>
        <p className="text-xs mb-3" style={darkTextMuted}>Search by Order ID, Customer Name, or Phone — leave empty to see all</p>
        <div className="flex flex-wrap gap-3 items-center">
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
          <div className="w-[180px]">
            <Select value={dueOnly} onValueChange={setDueOnly}>
              <SelectTrigger style={darkInput}><SelectValue /></SelectTrigger>
              <SelectContent style={{ background: '#1a1c1e', border: '1px solid #2a2d33' }}>
                <SelectItem value="due">Due Orders Only</SelectItem>
                <SelectItem value="all">All Orders</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <button onClick={load} className="px-6 py-3 flex items-center gap-1.5 transition-all duration-300 hover:opacity-90" style={btnGreen}>
            <Search className="w-4 h-4" /> Search
          </button>
        </div>
        <p className="text-xs mt-3 flex items-center gap-1.5" style={{ color: '#555' }}>
          <span style={{ color: '#d4df3a' }}>✓</span> Click "View" on any order to see payment history and collect bills.
        </p>
      </div>

      {/* Detail panel */}
      {(selectedOrder || loadingDetail) && (
        <div className="p-5" style={darkCard}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ color: '#d4df3a' }}>
              💰 Bill Collection {selectedOrder && <span className="font-mono">— {selectedOrder.orderId}</span>}
            </h3>
            <div className="flex gap-2.5 items-center">
              {selectedOrder && selectedOrder.dueAmount > 0.01 && (
                <button onClick={() => setShowCollect(true)} className="px-5 py-2 flex items-center gap-1.5 transition-all duration-300 hover:opacity-90" style={btnGreen}>
                  <Wallet className="w-4 h-4" /> Collect
                </button>
              )}
              <button onClick={closeDetail} className="p-1.5 rounded-lg transition-colors" style={{ color: '#666' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {loadingDetail && <Skeleton className="h-40 w-full" />}

          {selectedOrder && (
            <>
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold" style={{ color: '#fff' }}>{selectedOrder.orderId}</h3>
                  <PaymentBadge status={selectedOrder.paymentStatus} />
                </div>
                <p className="text-sm mt-1" style={darkTextMuted}>
                  {selectedOrder.customer.name} • {selectedOrder.customer.phone}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#555' }}>Order Date: {formatDate(selectedOrder.orderDate)}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="p-4 rounded-xl" style={{ background: '#0b0d0f', border: '1px solid #2a2d33' }}>
                  <p className="text-xs mb-1" style={{ color: '#666' }}>Grand Total</p>
                  <p className="text-xl font-bold" style={{ color: '#fff' }}>{formatCurrency(selectedOrder.grandTotal)}</p>
                </div>
                <div className="p-4 rounded-xl" style={{ background: '#0b0d0f', border: '1px solid rgba(29,185,84,0.2)' }}>
                  <p className="text-xs mb-1" style={{ color: '#666' }}>Collected</p>
                  <p className="text-xl font-bold" style={{ color: '#1db954' }}>{formatCurrency(selectedOrder.paidAmount)}</p>
                </div>
                <div className="p-4 rounded-xl" style={{ background: '#0b0d0f', border: '1px solid rgba(255,107,107,0.2)' }}>
                  <p className="text-xs mb-1" style={{ color: '#666' }}>Due</p>
                  <p className="text-xl font-bold" style={{ color: '#ff6b6b' }}>{formatCurrency(selectedOrder.dueAmount)}</p>
                </div>
              </div>

              {/* Payment History */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium" style={darkTextMuted}>Payment History</h4>
                  {bills.length > 0 && (
                    <button
                      onClick={async () => {
                        try {
                          const res = await api.createMoneyReceipt({
                            billIds: bills.map(b => b.id),
                            method: bills[0]?.method || 'cash',
                            receiptDate: new Date().toISOString().split('T')[0]
                          })
                          toast.success('Money receipt generated')
                          printMoneyReceipt(res.receipt)
                        } catch (err: any) {
                          toast.error(err.message)
                        }
                      }}
                      className="px-4 py-2 text-sm flex items-center gap-1.5 transition-all duration-300"
                      style={btnOutline}
                    >
                      <Printer className="w-3 h-3" /> Generate Money Receipt
                    </button>
                  )}
                </div>
                {bills.length === 0 ? (
                  <p className="text-sm italic" style={{ color: '#555' }}>No payments yet</p>
                ) : (
                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2a2d33' }}>
                    <table className="w-full text-sm">
                      <thead style={{ borderBottom: '1px solid #2a2d33' }}>
                        <tr>
                          <th className="text-left px-4 py-3 font-medium" style={{ color: '#888' }}>Bill ID</th>
                          <th className="text-left px-4 py-3 font-medium" style={{ color: '#888' }}>Date</th>
                          <th className="text-left px-4 py-3 font-medium" style={{ color: '#888' }}>Method</th>
                          <th className="text-right px-4 py-3 font-medium" style={{ color: '#888' }}>Amount</th>
                          <th className="text-right px-4 py-3 font-medium" style={{ color: '#888' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bills.map(b => (
                          <tr key={b.id} style={{ borderBottom: '1px solid #1f2227' }}>
                            <td className="px-4 py-3 font-mono text-xs font-medium" style={{ color: '#fff' }}>{b.billId}</td>
                            <td className="px-4 py-3" style={darkTextMuted}>{formatDate(b.collectDate)}</td>
                            <td className="px-4 py-3 capitalize" style={darkTextMuted}>{b.method}</td>
                            <td className="px-4 py-3 text-right font-medium" style={{ color: '#1db954' }}>{formatCurrency(b.amount)}</td>
                            <td className="px-4 py-3 text-right">
                              <button onClick={() => handleDeleteBill(b.id)} className="p-1.5 rounded-lg transition-colors" style={{ color: '#666' }} onMouseEnter={e => e.currentTarget.style.color = '#ff6b6b'} onMouseLeave={e => e.currentTarget.style.color = '#666'}>
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Orders list */}
      <div style={darkCard} className="overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : paginatedOrders.length === 0 ? (
          <div className="text-center py-12">
            <Wallet className="w-12 h-12 mx-auto mb-3" style={{ color: '#333' }} />
            <p style={{ color: '#555' }}>No orders found</p>
            <p className="text-xs mt-1" style={{ color: '#444' }}>Try a different search or change the filter</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ borderBottom: '1px solid #2a2d33' }}>
                  <tr>
                    <th className="text-left px-6 py-4 font-medium" style={{ color: '#888' }}>Order ID</th>
                    <th className="text-left px-4 py-4 font-medium" style={{ color: '#888' }}>Date</th>
                    <th className="text-left px-4 py-4 font-medium" style={{ color: '#888' }}>Customer</th>
                    <th className="text-right px-4 py-4 font-medium" style={{ color: '#888' }}>Total</th>
                    <th className="text-right px-4 py-4 font-medium" style={{ color: '#888' }}>Paid</th>
                    <th className="text-right px-4 py-4 font-medium" style={{ color: '#888' }}>Due</th>
                    <th className="text-center px-4 py-4 font-medium" style={{ color: '#888' }}>Status</th>
                    <th className="text-right px-6 py-4 font-medium" style={{ color: '#888' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map(o => (
                    <tr key={o.id} style={{ borderBottom: '1px solid #1f2227' }} className="transition-colors hover:bg-[rgba(255,255,255,0.02)]">
                      <td className="px-6 py-4 font-mono text-xs font-semibold" style={{ color: '#fff' }}>{o.orderId}</td>
                      <td className="px-4 py-4" style={darkTextMuted}>{formatDate(o.orderDate)}</td>
                      <td className="px-4 py-4">
                        <span className="font-medium" style={{ color: '#fff' }}>{o.customer.name}</span>
                        <span className="block text-xs mt-0.5" style={{ color: '#666' }}>{o.customer.phone}</span>
                      </td>
                      <td className="px-4 py-4 text-right" style={{ color: '#1db954' }}>{formatCurrency(o.grandTotal)}</td>
                      <td className="px-4 py-4 text-right" style={{ color: '#1db954' }}>{formatCurrency(o.paidAmount)}</td>
                      <td className="px-4 py-4 text-right">
                        <span style={{ color: o.dueAmount > 0 ? '#ff6b6b' : '#444', fontWeight: o.dueAmount > 0 ? 600 : 400 }}>
                          {formatCurrency(o.dueAmount)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <PaymentBadge status={o.paymentStatus} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => openOrderDetail(o)} title="View payment history" className="transition-colors" style={{ color: '#666' }} onMouseEnter={e => e.currentTarget.style.color = '#d4df3a'} onMouseLeave={e => e.currentTarget.style.color = '#666'}>
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: '1px solid #2a2d33' }}>
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
              <div className="px-6 py-3 text-center text-xs" style={{ borderTop: '1px solid #2a2d33', color: '#555' }}>
                Showing {orders.length} order{orders.length === 1 ? '' : 's'}
              </div>
            )}
          </>
        )}
      </div>

      {/* Collect dialog */}
      {showCollect && selectedOrder && (
        <Dialog open onOpenChange={setShowCollect}>
          <DialogContent className="max-w-md" style={{ background: '#1a1c1e', border: '1px solid #2a2d33' }}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2" style={{ color: '#fff' }}>
                <Receipt className="w-5 h-5" style={{ color: '#888' }} /> Collect Bill
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 rounded-xl" style={{ background: '#0b0d0f', border: '1px solid #2a2d33' }}>
                <p className="text-xs mb-1" style={{ color: '#666' }}>Order</p>
                <p className="font-mono font-medium" style={{ color: '#fff' }}>{selectedOrder.orderId}</p>
                <p className="text-sm mt-0.5" style={{ color: '#aaa' }}>{selectedOrder.customer.name}</p>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: '#aaa' }}>Total Due</span>
                <span className="text-lg font-bold" style={{ color: '#ff6b6b' }}>{formatCurrency(selectedOrder.dueAmount)}</span>
              </div>
              <div>
                <label className="text-xs block mb-1.5" style={{ color: '#888' }}>Amount <span style={{ color: '#ff6b6b' }}>*</span></label>
                <input
                  type="number"
                  value={collectAmount}
                  onChange={e => setCollectAmount(parseFloat(e.target.value) || 0)}
                  max={selectedOrder.dueAmount}
                  min={0}
                  className="w-full px-4 py-3 text-sm outline-none"
                  style={darkInput}
                />
                <button type="button" onClick={() => setCollectAmount(selectedOrder.dueAmount)} className="text-xs mt-1.5 font-semibold" style={{ color: '#1db954', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  Set full due amount
                </button>
              </div>
              <div>
                <label className="text-xs block mb-1.5" style={{ color: '#888' }}>Payment Method</label>
                <Select value={collectMethod} onValueChange={setCollectMethod}>
                  <SelectTrigger style={darkInput}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ background: '#1a1c1e', border: '1px solid #2a2d33' }}>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="mobile">Mobile Banking</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs block mb-1.5" style={{ color: '#888' }}>Note (optional)</label>
                <textarea
                  rows={2}
                  value={collectNote}
                  onChange={e => setCollectNote(e.target.value)}
                  className="w-full px-4 py-3 text-sm outline-none resize-vertical"
                  style={darkInput}
                />
              </div>
            </div>
            <DialogFooter>
              <button onClick={() => setShowCollect(false)} className="px-5 py-2.5 transition-all duration-300" style={{ background: 'transparent', border: '1px solid #555', color: '#aaa', borderRadius: '10px', fontSize: '14px' }}>Cancel</button>
              <button onClick={handleCollect} className="px-5 py-2.5 flex items-center gap-1.5 transition-all duration-300 hover:opacity-90" style={btnGreen}>
                <Wallet className="w-4 h-4" /> Confirm Collection
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    unpaid: { label: 'Unpaid', bg: 'rgba(255,107,107,0.15)', color: '#ff6b6b' },
    partial: { label: 'Partial', bg: 'rgba(241,196,15,0.15)', color: '#f1c40f' },
    paid: { label: 'Paid', bg: 'rgba(29,185,84,0.15)', color: '#1db954' }
  }
  const v = map[status] || { label: status, bg: '#2a2d33', color: '#fff' }
  return <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: v.bg, color: v.color }}>{v.label}</span>
}
