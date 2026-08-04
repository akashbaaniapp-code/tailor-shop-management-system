'use client'

import { useEffect, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { CircleDollarSign, RefreshCw, ShoppingCart, TrendingUp } from 'lucide-react'
import { api, formatCurrency, formatDate } from '@/lib/api'
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
}

export default function ReportIncome() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Filters — default to current month
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const today = now.toISOString().split('T')[0]
  const [from, setFrom] = useState(firstDayOfMonth)
  const [to, setTo] = useState(today)
  const [source, setSource] = useState('all') // 'all' | 'sales' | 'other'
  const [groupBy, setGroupBy] = useState('date') // 'date' | 'month' | 'source'

  async function load() {
    setLoading(true)
    try {
      const res = await api.incomeReport({ from, to, source, groupBy })
      setData(res)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [from, to, source, groupBy])

  function handlePreset(kind: 'today' | 'thisMonth' | 'thisYear' | 'lastMonth') {
    const n = new Date()
    if (kind === 'today') {
      const t = n.toISOString().split('T')[0]
      setFrom(t)
      setTo(t)
    } else if (kind === 'thisMonth') {
      setFrom(new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split('T')[0])
      setTo(n.toISOString().split('T')[0])
    } else if (kind === 'thisYear') {
      setFrom(new Date(n.getFullYear(), 0, 1).toISOString().split('T')[0])
      setTo(n.toISOString().split('T')[0])
    } else if (kind === 'lastMonth') {
      setFrom(new Date(n.getFullYear(), n.getMonth() - 1, 1).toISOString().split('T')[0])
      setTo(new Date(n.getFullYear(), n.getMonth(), 0).toISOString().split('T')[0])
    }
  }

  const rows = data?.rows || []
  const totals = data?.totals || { sales: 0, otherIncome: 0, total: 0, count: 0 }
  const groups = data?.groups || []

  // Export column definitions
  const exportColumns = [
    { key: 'date', label: 'Date', format: (v: any) => formatDate(v) },
    { key: 'source', label: 'Source', format: (v: any) => (v === 'sales' ? 'Sales Order' : 'Other Income') },
    { key: 'title', label: 'Title' },
    { key: 'customerName', label: 'Customer', format: (v: any) => v || '-' },
    { key: 'headName', label: 'Income Head', format: (v: any) => v || '-' },
    { key: 'amount', label: 'Amount', format: (v: any) => formatCurrency(Number(v || 0)) },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 25 }}>
      {/* Filter Card */}
      <div style={darkCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>From Date</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>To Date</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                style={{ ...inputStyle, appearance: 'none', minWidth: 160 }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
              >
                <option value="all" style={{ background: '#0b0d0f' }}>All Sources</option>
                <option value="sales" style={{ background: '#0b0d0f' }}>Sales Orders</option>
                <option value="other" style={{ background: '#0b0d0f' }}>Other Income</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>Group By</label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                style={{ ...inputStyle, appearance: 'none', minWidth: 130 }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
              >
                <option value="date" style={{ background: '#0b0d0f' }}>Date</option>
                <option value="month" style={{ background: '#0b0d0f' }}>Month</option>
                <option value="source" style={{ background: '#0b0d0f' }}>Source</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
            {/* Quick presets */}
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { label: 'Today', kind: 'today' as const },
                { label: 'Month', kind: 'thisMonth' as const },
                { label: 'Year', kind: 'thisYear' as const },
              ].map((p) => (
                <button
                  key={p.kind}
                  onClick={() => handlePreset(p.kind)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #2a2d33',
                    color: '#888',
                    padding: '8px 12px',
                    borderRadius: 8,
                    fontSize: 12,
                    cursor: 'pointer',
                    transition: '0.3s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#d4df3a'
                    e.currentTarget.style.color = '#d4df3a'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#2a2d33'
                    e.currentTarget.style.color = '#888'
                  }}
                >
                  {p.label}
                </button>
              ))}
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
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 15 }}>
        <StatCard label="Sales Income" value={totals.sales} color="#1db954" icon={<ShoppingCart size={16} />} />
        <StatCard label="Other Income" value={totals.otherIncome} color="#d4df3a" icon={<TrendingUp size={16} />} />
        <StatCard label="Total Income" value={totals.total} color="#3498db" icon={<CircleDollarSign size={16} />} />
      </div>

      {/* Groups breakdown */}
      {groups.length > 0 && (
        <div style={{ ...darkCard, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 25px 0' }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#e8eae9' }}>
              Breakdown — {groupBy === 'date' ? 'by Date' : groupBy === 'month' ? 'by Month' : 'by Source'}
            </div>
          </div>
          <div style={{ overflowX: 'auto', marginTop: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#ffffff' }}>
                  <th style={{ textAlign: 'left', padding: '14px 10px 14px 25px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0' }}>
                    {groupBy === 'source' ? 'Source' : 'Period'}
                  </th>
                  <th style={{ textAlign: 'right', padding: '14px 10px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0' }}>Count</th>
                  {groupBy !== 'source' && (
                    <>
                      <th style={{ textAlign: 'right', padding: '14px 10px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0' }}>Sales</th>
                      <th style={{ textAlign: 'right', padding: '14px 10px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0' }}>Other</th>
                    </>
                  )}
                  <th style={{ textAlign: 'right', padding: '14px 25px 14px 10px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g: any, idx: number) => (
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
                    <td style={{ padding: '14px 10px 14px 25px', color: '#fff', fontWeight: 500 }}>{g.label || g.name}</td>
                    <td style={{ padding: '14px 10px', textAlign: 'right', color: '#888' }}>{g.count}</td>
                    {groupBy !== 'source' && (
                      <>
                        <td style={{ padding: '14px 10px', textAlign: 'right', color: '#1db954' }}>{formatCurrency(g.sales || 0)}</td>
                        <td style={{ padding: '14px 10px', textAlign: 'right', color: '#d4df3a' }}>{formatCurrency(g.other || 0)}</td>
                      </>
                    )}
                    <td style={{ padding: '14px 25px 14px 10px', textAlign: 'right', color: '#3498db', fontWeight: 600 }}>{formatCurrency(g.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Table with Export */}
      <div style={{ ...darkCard, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 25px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#e8eae9' }}>
            Income Details ({totals.count} records)
          </div>
          {!loading && rows.length > 0 && (
            <ExportButtons
              filename={`income-report-${from}-to-${to}`}
              title={`Income Report (${formatDate(from)} to ${formatDate(to)})`}
              columns={exportColumns}
              rows={rows}
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
          ) : rows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 56,
                  height: 56,
                  border: '2px solid #2a2d33',
                  borderRadius: 12,
                  marginBottom: 8,
                }}
              >
                <CircleDollarSign size={24} color="#666" />
              </div>
              <p style={{ color: '#888' }}>No income data for this period</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#ffffff' }}>
                  <th style={{ textAlign: 'left', padding: '14px 10px 14px 25px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '14px 10px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0' }}>Source</th>
                  <th style={{ textAlign: 'left', padding: '14px 10px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0' }}>Title</th>
                  <th style={{ textAlign: 'left', padding: '14px 10px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0' }}>Customer / Head</th>
                  <th style={{ textAlign: 'right', padding: '14px 25px 14px 10px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any, idx: number) => (
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
                    <td style={{ padding: '14px 10px 14px 25px', color: '#888' }}>{formatDate(r.date)}</td>
                    <td style={{ padding: '14px 10px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '3px 10px',
                          borderRadius: 50,
                          border: r.source === 'sales' ? '1px solid #1db954' : '1px solid #d4df3a',
                          color: r.source === 'sales' ? '#1db954' : '#d4df3a',
                          background: r.source === 'sales' ? 'rgba(29,185,84,0.1)' : 'rgba(212,223,58,0.1)',
                        }}
                      >
                        {r.source === 'sales' ? 'Sales' : 'Other'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 10px', color: '#fff', fontWeight: 500 }}>{r.title}</td>
                    <td style={{ padding: '14px 10px', color: '#888' }}>
                      {r.source === 'sales' ? (r.customerName || '-') : (r.headName || '-')}
                    </td>
                    <td style={{ padding: '14px 25px 14px 10px', textAlign: 'right', color: '#1db954', fontWeight: 600 }}>
                      {formatCurrency(r.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #2a2d33', background: '#1f2227' }}>
                  <td colSpan={4} style={{ padding: '14px 10px 14px 25px', fontWeight: 700, textAlign: 'right', color: '#fff' }}>
                    Total
                  </td>
                  <td style={{ padding: '14px 25px 14px 10px', textAlign: 'right', fontWeight: 700, color: '#1db954' }}>
                    {formatCurrency(totals.total)}
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
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#444'
        e.currentTarget.style.background = '#1a1c1e'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#2a2d33'
        e.currentTarget.style.background = '#14161a'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.4)' }}>{label}</div>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: '#0b0d0f',
            border: '1px solid #2a2d33',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color,
          }}
        >
          {icon}
        </div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{formatCurrency(value)}</div>
    </div>
  )
}
