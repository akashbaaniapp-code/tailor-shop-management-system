'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Receipt } from 'lucide-react'
import { api, formatCurrency, formatDate } from '@/lib/api'
import ExportButtons from '@/components/ExportButtons'
import { toast } from 'sonner'

export default function ReportReceivable() {
  const [data, setData] = useState<{ rows: any[]; totalDue: number; count: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.receivable().then(setData).catch(err => toast.error(err.message)).finally(() => setLoading(false))
  }, [])

  if (loading) return <Skeleton className="h-80 w-full" />

  if (!data) return null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Total Receivable</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(data.totalDue)}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Pending Orders</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{data.count}</p>
          </CardContent>
        </Card>
      </div>

      {data && data.rows.length > 0 && (
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <ExportButtons
            filename="receivable-report"
            title="Receivable Report"
            columns={[
              { key: 'orderId', label: 'Order ID' },
              { key: 'customerName', label: 'Customer' },
              { key: 'customerPhone', label: 'Phone' },
              { key: 'grandTotal', label: 'Total', format: (v: any) => formatCurrency(Number(v || 0)) },
              { key: 'paidAmount', label: 'Paid', format: (v: any) => formatCurrency(Number(v || 0)) },
              { key: 'dueAmount', label: 'Due', format: (v: any) => formatCurrency(Number(v || 0)) },
            ]}
            rows={data.rows}
          />
        </div>
      )}

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-600" /> Orders with Due
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.rows.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No receivables. All bills collected!</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-slate-600">Order ID</th>
                    <th className="text-left px-4 py-2.5 font-medium text-slate-600">Date</th>
                    <th className="text-left px-4 py-2.5 font-medium text-slate-600">Customer</th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-600">Total</th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-600">Paid</th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-600">Due</th>
                    <th className="text-center px-4 py-2.5 font-medium text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono text-xs font-semibold">{r.orderId}</td>
                      <td className="px-4 py-2.5 text-slate-600">{formatDate(r.orderDate)}</td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{r.customerName}</div>
                        <div className="text-xs text-slate-500">{r.customerPhone}</div>
                      </td>
                      <td className="px-4 py-2.5 text-right">{formatCurrency(r.grandTotal)}</td>
                      <td className="px-4 py-2.5 text-right text-emerald-600">{formatCurrency(r.paidAmount)}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-red-600">{formatCurrency(r.dueAmount)}</td>
                      <td className="px-4 py-2.5 text-center">
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
