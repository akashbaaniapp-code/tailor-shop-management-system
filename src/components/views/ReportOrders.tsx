'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { BarChart3 } from 'lucide-react'
import { api, formatCurrency, formatDate } from '@/lib/api'
import { toast } from 'sonner'

export default function ReportOrders() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState('all')

  async function load() {
    setLoading(true)
    try {
      const res = await api.orderReport({
        from: from || undefined,
        to: to || undefined,
        status: status !== 'all' ? status : undefined
      })
      setData(res)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) return <Skeleton className="h-80 w-full" />
  if (!data) return null

  return (
    <div className="space-y-4">
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
            <div className="w-44">
              <Label className="text-xs text-slate-500">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="full_pending">Full Pending</SelectItem>
                  <SelectItem value="partial_pending">Partial Pending</SelectItem>
                  <SelectItem value="full_delivered">Full Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={load} className="bg-emerald-600 hover:bg-emerald-700">Apply Filter</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Total Orders</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{data.count}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Total Sales</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(data.totalSales)}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Collected</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(data.totalCollected)}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Due</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(data.totalDue)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-600" /> Orders
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.rows.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No orders found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-3 py-2.5 font-medium text-slate-600">Order ID</th>
                    <th className="text-left px-3 py-2.5 font-medium text-slate-600">Date</th>
                    <th className="text-left px-3 py-2.5 font-medium text-slate-600">Delivery Date</th>
                    <th className="text-left px-3 py-2.5 font-medium text-slate-600">Customer</th>
                    <th className="text-left px-3 py-2.5 font-medium text-slate-600">Tailor</th>
                    <th className="text-right px-3 py-2.5 font-medium text-slate-600">Items</th>
                    <th className="text-right px-3 py-2.5 font-medium text-slate-600">Delivered</th>
                    <th className="text-right px-3 py-2.5 font-medium text-slate-600">Total</th>
                    <th className="text-right px-3 py-2.5 font-medium text-slate-600">Due</th>
                    <th className="text-center px-3 py-2.5 font-medium text-slate-600">Status</th>
                    <th className="text-center px-3 py-2.5 font-medium text-slate-600">Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r: any, i: number) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono text-xs font-semibold">{r.orderId}</td>
                      <td className="px-3 py-2 text-slate-600">{formatDate(r.orderDate)}</td>
                      <td className="px-3 py-2 text-slate-600">{r.deliveryDate ? formatDate(r.deliveryDate) : '-'}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{r.customerName}</div>
                        <div className="text-xs text-slate-500">{r.customerPhone}</div>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{r.tailorName || '-'}</td>
                      <td className="px-3 py-2 text-right">{r.totalOrderedQty}</td>
                      <td className="px-3 py-2 text-right text-emerald-600">{r.totalDeliveredQty}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(r.grandTotal)}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={r.dueAmount > 0 ? 'text-red-600 font-medium' : 'text-slate-400'}>
                          {formatCurrency(r.dueAmount)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant="secondary" className={
                          r.status === 'full_delivered' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                          : r.status === 'partial_pending' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100'
                          : 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                        }>
                          {r.status === 'full_delivered' ? 'Delivered' : r.status === 'partial_pending' ? 'Partial' : 'Pending'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant="secondary" className={
                          r.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                          : r.paymentStatus === 'partial' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                          : 'bg-red-100 text-red-700 hover:bg-red-100'
                        }>
                          {r.paymentStatus}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
