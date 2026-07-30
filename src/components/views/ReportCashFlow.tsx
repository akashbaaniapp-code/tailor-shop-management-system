'use client'

import { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { RefreshCw, TrendingUp, TrendingDown, ArrowLeftRight, Wallet } from 'lucide-react'
import { api, formatCurrency } from '@/lib/api'
import { toast } from 'sonner'
import ExportButtons from '@/components/ExportButtons'

const darkCard: React.CSSProperties = {
  background: '#14161a',
  border: '1px solid #2a2d33',
  borderRadius: 16,
  padding: 25,
}

const inputStyle: React.CSSProperties = {
  background: '#0b0d0f',
  border: '1px solid #2a2d33',
  borderRadius: 10,
  padding: '10px 14px',
  color: '#e8eae9',
  fontSize: 14,
  outline: 'none',
  cursor: 'pointer',
  transition: '0.3s',
  minWidth: 140,
  appearance: 'none',
}

export default function ReportCashFlow() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const [period, setPeriod] = useState('monthly')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  async function load() {
    setLoading(true)
    try {
      const res = await api.cashFlowReport({ period, year, month })
      setData(res)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [period, year, month])

  const chartData = data?.chartData || []
  const totals = data?.totals || { receipts: 0, payments: 0, net: 0, collected: 0, otherIncome: 0, expense: 0, payablePaid: 0, deposit: 0 }

  const exportColumns = [
    { key: 'label', label: 'Period' },
    { key: 'receipts', label: 'Receipts', format: (v: any) => formatCurrency(Number(v || 0)) },
    { key: 'collected', label: 'Collected', format: (v: any) => formatCurrency(Number(v || 0)) },
    { key: 'otherIncome', label: 'Other Income', format: (v: any) => formatCurrency(Number(v || 0)) },
    { key: 'payments', label: 'Payments', format: (v: any) => formatCurrency(Number(v || 0)) },
    { key: 'expense', label: 'Expense', format: (v: any) => formatCurrency(Number(v || 0)) },
    { key: 'payablePaid', label: 'Payable Paid', format: (v: any) => formatCurrency(Number(v || 0)) },
    { key: 'deposit', label: 'Deposit', format: (v: any) => formatCurrency(Number(v || 0)) },
    { key: 'net', label: 'Net', format: (v: any) => formatCurrency(Number(v || 0)) },
  ]

  const title =
    period === 'daily'
      ? `Cash Flow — Daily (${['January','February','March','April','May','June','July','August','September','October','November','December'][month]} ${year})`
      : period === 'yearly'
      ? `Cash Flow — Yearly (${year - 4} to ${year})`
      : `Cash Flow — Monthly (${year})`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 25 }}>
      {/* Filter Card */}
      <div style={darkCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>Period</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
              >
                <option value="daily" style={{ background: '#0b0d0f' }}>Daily (one month)</option>
                <option value="monthly" style={{ background: '#0b0d0f' }}>Monthly (one year)</option>
                <option value="yearly" style={{ background: '#0b0d0f' }}>Yearly (5 years)</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value) || now.getFullYear())}
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
              />
            </div>
            {period === 'daily' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>Month</label>
                <select
                  value={String(month)}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
                >
                  {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                    <option key={i} value={String(i)} style={{ background: '#0b0d0f' }}>{m}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <button
            onClick={load}
            style={{
              background: '#1db954',
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: 10,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              height: 42,
              fontSize: 14,
              transition: '0.3s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#1aa34a')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#1db954')}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 15 }}>
        <StatCard label="Total Receipts" value={totals.receipts} color="#1db954" icon={<TrendingUp size={16} />} />
        <StatCard label="Total Payments" value={totals.payments} color="#ff6b6b" icon={<TrendingDown size={16} />} />
        <StatCard label="Net Cash Flow" value={totals.net} color={totals.net >= 0 ? '#1db954' : '#ff6b6b'} icon={<ArrowLeftRight size={16} />} />
      </div>

      {/* Chart */}
      <div style={{ ...darkCard, minHeight: 450 }}>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#e8eae9', marginBottom: 20 }}>{title}</div>
        {loading ? (
          <div style={{ height: 350, background: '#1f2227', borderRadius: 12 }} />
        ) : chartData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#888' }}>No data for this period</div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d33" />
              <XAxis dataKey="label" stroke="#888" fontSize={12} />
              <YAxis stroke="#888" fontSize={12} tickFormatter={(v) => formatCurrency(v).replace('.00', '')} />
              <Tooltip
                contentStyle={{
                  background: '#14161a',
                  border: '1px solid #2a2d33',
                  borderRadius: 10,
                  color: '#e8eae9',
                }}
                labelStyle={{ color: '#d4df3a', fontWeight: 600 }}
                formatter={(value: any, name: string) => [formatCurrency(Number(value)), name]}
              />
              <Legend wrapperStyle={{ paddingTop: 10 }} />
              <Bar dataKey="receipts" name="Receipts" fill="#1db954" radius={[4, 4, 0, 0]} />
              <Bar dataKey="payments" name="Payments" fill="#ff6b6b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Breakdown Table */}
      <div style={{ ...darkCard, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 25px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#e8eae9' }}>Breakdown Details</div>
          {!loading && chartData.length > 0 && (
            <ExportButtons
              filename={`cash-flow-${period}-${year}`}
              title={title}
              columns={exportColumns}
              rows={chartData}
            />
          )}
        </div>
        <div style={{ overflowX: 'auto', marginTop: 16 }}>
          {loading ? (
            <div style={{ padding: 25, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ height: 40, background: '#1f2227', borderRadius: 8 }} />
              ))}
            </div>
          ) : chartData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <p style={{ color: '#888' }}>No data for this period</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#ffffff' }}>
                  <th style={{ textAlign: 'left', padding: '12px 10px 12px 25px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0' }}>Period</th>
                  <th style={{ textAlign: 'right', padding: '12px 10px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0' }}>Collected</th>
                  <th style={{ textAlign: 'right', padding: '12px 10px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0' }}>Other Income</th>
                  <th style={{ textAlign: 'right', padding: '12px 10px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0' }}>Receipts</th>
                  <th style={{ textAlign: 'right', padding: '12px 10px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0' }}>Expense</th>
                  <th style={{ textAlign: 'right', padding: '12px 10px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0' }}>Payable</th>
                  <th style={{ textAlign: 'right', padding: '12px 10px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0' }}>Deposit</th>
                  <th style={{ textAlign: 'right', padding: '12px 10px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0' }}>Payments</th>
                  <th style={{ textAlign: 'right', padding: '12px 25px 12px 10px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0' }}>Net</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((r: any, idx: number) => (
                  <tr
                    key={idx}
                    style={{ borderBottom: '1px solid #2a2d33' }}
                    onMouseEnter={(e) => {
                      Array.from(e.currentTarget.children).forEach((td) => {
                        ;(td as HTMLElement).style.background = 'rgba(255,255,255,0.02)'
                      })
                    }}
                    onMouseLeave={(e) => {
                      Array.from(e.currentTarget.children).forEach((td) => {
                        ;(td as HTMLElement).style.background = 'transparent'
                      })
                    }}
                  >
                    <td style={{ padding: '12px 10px 12px 25px', color: '#fff', fontWeight: 500 }}>{r.label}</td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', color: '#1db954' }}>{formatCurrency(r.collected)}</td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', color: '#1db954' }}>{formatCurrency(r.otherIncome)}</td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', color: '#1db954', fontWeight: 600 }}>{formatCurrency(r.receipts)}</td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', color: '#ff6b6b' }}>{formatCurrency(r.expense)}</td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', color: '#ff6b6b' }}>{formatCurrency(r.payablePaid)}</td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', color: '#ff6b6b' }}>{formatCurrency(r.deposit)}</td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', color: '#ff6b6b', fontWeight: 600 }}>{formatCurrency(r.payments)}</td>
                    <td style={{ padding: '12px 25px 12px 10px', textAlign: 'right', color: r.net >= 0 ? '#1db954' : '#ff6b6b', fontWeight: 700 }}>
                      {formatCurrency(r.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #2a2d33', background: '#1f2227' }}>
                  <td style={{ padding: '14px 10px 14px 25px', fontWeight: 700, color: '#fff' }}>Total</td>
                  <td style={{ padding: '14px 10px', textAlign: 'right', fontWeight: 700, color: '#1db954' }}>{formatCurrency(totals.collected)}</td>
                  <td style={{ padding: '14px 10px', textAlign: 'right', fontWeight: 700, color: '#1db954' }}>{formatCurrency(totals.otherIncome)}</td>
                  <td style={{ padding: '14px 10px', textAlign: 'right', fontWeight: 700, color: '#1db954' }}>{formatCurrency(totals.receipts)}</td>
                  <td style={{ padding: '14px 10px', textAlign: 'right', fontWeight: 700, color: '#ff6b6b' }}>{formatCurrency(totals.expense)}</td>
                  <td style={{ padding: '14px 10px', textAlign: 'right', fontWeight: 700, color: '#ff6b6b' }}>{formatCurrency(totals.payablePaid)}</td>
                  <td style={{ padding: '14px 10px', textAlign: 'right', fontWeight: 700, color: '#ff6b6b' }}>{formatCurrency(totals.deposit)}</td>
                  <td style={{ padding: '14px 10px', textAlign: 'right', fontWeight: 700, color: '#ff6b6b' }}>{formatCurrency(totals.payments)}</td>
                  <td style={{ padding: '14px 25px 14px 10px', textAlign: 'right', fontWeight: 700, color: totals.net >= 0 ? '#1db954' : '#ff6b6b' }}>
                    {formatCurrency(totals.net)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#14161a',
        border: '1px solid #2a2d33',
        borderRadius: 14,
        padding: '20px 25px',
        textAlign: 'left',
        transition: '0.3s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#444'; e.currentTarget.style.background = '#1a1c1e' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2d33'; e.currentTarget.style.background = '#14161a' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.4)' }}>{label}</div>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#0b0d0f', border: '1px solid #2a2d33', display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{formatCurrency(value)}</div>
    </div>
  )
}
