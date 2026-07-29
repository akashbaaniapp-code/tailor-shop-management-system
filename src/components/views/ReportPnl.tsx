'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Lightbulb } from 'lucide-react'
import { api, formatCurrency } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

export default function ReportPnl() {
  const setView = useAppStore((s) => s.setView)
  const now = new Date()
  const [period, setPeriod] = useState('monthly')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await api.pnl({ period, year, month })
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

  const selectStyle: React.CSSProperties = {
    background: '#0b0d0f',
    border: '1px solid #2a2d33',
    borderRadius: 10,
    padding: '10px 14px',
    color: '#e8eae9',
    fontSize: 14,
    outline: 'none',
    cursor: 'pointer',
    transition: '0.3s',
    appearance: 'none',
    minWidth: 180,
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
    minWidth: 120,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 25 }}>
      {/* Filter Section */}
      <div
        style={{
          background: '#14161a',
          border: '1px solid #2a2d33',
          borderRadius: 16,
          padding: 25,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>Period</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                style={selectStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
              >
                <option value="daily" style={{ background: '#0b0d0f' }}>Daily (one month)</option>
                <option value="monthly" style={{ background: '#0b0d0f' }}>Monthly (one year)</option>
                <option value="yearly" style={{ background: '#0b0d0f' }}>Yearly</option>
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
                  style={selectStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
                >
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                    <option key={i} value={String(i)} style={{ background: '#0b0d0f' }}>
                      {m}
                    </option>
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
              padding: '10px 24px',
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
        <div
          style={{
            fontSize: 13,
            color: '#666',
            marginTop: 15,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <Lightbulb size={14} color="#d4df3a" />
          <span>
            Tip: To record expenses, use the{' '}
            <button
              onClick={() => setView('expense-entry')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#1db954',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: 13,
                padding: 0,
              }}
            >
              Expense Entry
            </button>{' '}
            page. To create expense heads (categories), go to{' '}
            <button
              onClick={() => setView('setup-expense-head')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#1db954',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: 13,
                padding: 0,
              }}
            >
              Setup &gt; Expense Heads
            </button>
            .
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 15 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ height: 100, background: '#1f2227', borderRadius: 14 }} />
          ))}
        </div>
      ) : data ? (
        <>
          {/* Stats Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: 15,
            }}
          >
            <StatCard label="Sales" value={data.totals.sales} color="#1db954" />
            <StatCard label="Collected" value={data.totals.collected} color="#3498db" />
            <StatCard label="Other Income" value={data.totals.otherIncome} color="#1db954" />
            <StatCard label="Expense" value={data.totals.expense} color="#ff6b6b" />
            <StatCard label="Payable Paid" value={data.totals.payablePaid} color="#ff6b6b" />
            <StatCard
              label="Net Profit"
              value={data.totals.netProfit}
              color={data.totals.netProfit >= 0 ? '#1db954' : '#ff6b6b'}
            />
          </div>

          {/* Data Table */}
          <div
            style={{
              background: '#14161a',
              border: '1px solid #2a2d33',
              borderRadius: 16,
              padding: '0 0 25px 0',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '25px 25px 0' }}>
              <div style={{ fontSize: 16, fontWeight: 500, color: '#e8eae9' }}>
                Breakdown - {period === 'daily' ? 'Daily' : period === 'monthly' ? 'Monthly' : 'Yearly'}
              </div>
            </div>
            <div style={{ overflowX: 'auto', marginTop: 20 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#ffffff' }}>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '16px 10px 16px 25px',
                        color: '#333',
                        fontWeight: 600,
                        borderBottom: '1px solid #e0e0e0',
                      }}
                    >
                      Period
                    </th>
                    <th style={headerCellRight}>Sales</th>
                    <th style={headerCellRight}>Collected</th>
                    <th style={headerCellRight}>Other Income</th>
                    <th style={headerCellRight}>Expense</th>
                    <th style={headerCellRight}>Payable Paid</th>
                    <th
                      style={{
                        textAlign: 'right',
                        padding: '16px 25px 16px 10px',
                        color: '#333',
                        fontWeight: 600,
                        borderBottom: '1px solid #e0e0e0',
                      }}
                    >
                      Net Profit
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        style={{ textAlign: 'center', padding: '32px 0', color: '#888' }}
                      >
                        No data for this period
                      </td>
                    </tr>
                  ) : (
                    data.rows.map((r: any, idx: number) => {
                      const hasData =
                        r.sales || r.collected || r.otherIncome || r.expense || r.payablePaid
                      const isHighlight = !!hasData
                      const cellBg = isHighlight ? '#1f2227' : 'transparent'
                      const periodColor = isHighlight ? '#fff' : '#888'
                      const periodWeight = isHighlight ? 700 : 400
                      const valueWeight = isHighlight ? 700 : 400

                      return (
                        <tr
                          key={idx}
                          style={{ borderBottom: '1px solid #1f2227' }}
                          onMouseEnter={(e) => {
                            if (!isHighlight) {
                              Array.from(e.currentTarget.children).forEach((td) => {
                                ;(td as HTMLElement).style.background = 'rgba(255,255,255,0.02)'
                              })
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isHighlight) {
                              Array.from(e.currentTarget.children).forEach((td) => {
                                ;(td as HTMLElement).style.background = 'transparent'
                              })
                            }
                          }}
                        >
                          <td
                            style={{
                              padding: '14px 10px 14px 25px',
                              color: periodColor,
                              fontWeight: periodWeight,
                              background: cellBg,
                            }}
                          >
                            {r.label}
                          </td>
                          <td
                            style={{
                              ...cellRight,
                              color: '#1db954',
                              fontWeight: valueWeight,
                              background: cellBg,
                            }}
                          >
                            {formatCurrency(r.sales)}
                          </td>
                          <td
                            style={{
                              ...cellRight,
                              color: '#3498db',
                              fontWeight: valueWeight,
                              background: cellBg,
                            }}
                          >
                            {formatCurrency(r.collected)}
                          </td>
                          <td
                            style={{
                              ...cellRight,
                              color: '#1db954',
                              fontWeight: valueWeight,
                              background: cellBg,
                            }}
                          >
                            {formatCurrency(r.otherIncome)}
                          </td>
                          <td
                            style={{
                              ...cellRight,
                              color: '#ff6b6b',
                              fontWeight: valueWeight,
                              background: cellBg,
                            }}
                          >
                            {formatCurrency(r.expense)}
                          </td>
                          <td
                            style={{
                              ...cellRight,
                              color: '#ff6b6b',
                              fontWeight: valueWeight,
                              background: cellBg,
                            }}
                          >
                            {formatCurrency(r.payablePaid)}
                          </td>
                          <td
                            style={{
                              padding: '14px 25px 14px 10px',
                              textAlign: 'right',
                              color: r.netProfit >= 0 ? '#1db954' : '#ff6b6b',
                              fontWeight: valueWeight,
                              background: cellBg,
                            }}
                          >
                            {formatCurrency(r.netProfit)}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
                {data.rows.length > 0 && (
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #2a2d33', background: '#1f2227' }}>
                      <td
                        style={{
                          padding: '14px 10px 14px 25px',
                          color: '#fff',
                          fontWeight: 700,
                        }}
                      >
                        Total
                      </td>
                      <td style={{ ...cellRight, color: '#1db954', fontWeight: 700 }}>
                        {formatCurrency(data.totals.sales)}
                      </td>
                      <td style={{ ...cellRight, color: '#3498db', fontWeight: 700 }}>
                        {formatCurrency(data.totals.collected)}
                      </td>
                      <td style={{ ...cellRight, color: '#1db954', fontWeight: 700 }}>
                        {formatCurrency(data.totals.otherIncome)}
                      </td>
                      <td style={{ ...cellRight, color: '#ff6b6b', fontWeight: 700 }}>
                        {formatCurrency(data.totals.expense)}
                      </td>
                      <td style={{ ...cellRight, color: '#ff6b6b', fontWeight: 700 }}>
                        {formatCurrency(data.totals.payablePaid)}
                      </td>
                      <td
                        style={{
                          padding: '14px 25px 14px 10px',
                          textAlign: 'right',
                          color: data.totals.netProfit >= 0 ? '#1db954' : '#ff6b6b',
                          fontWeight: 700,
                        }}
                      >
                        {formatCurrency(data.totals.netProfit)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

const headerCellRight: React.CSSProperties = {
  textAlign: 'right',
  padding: '16px 10px',
  color: '#333',
  fontWeight: 600,
  borderBottom: '1px solid #e0e0e0',
}

const cellRight: React.CSSProperties = {
  padding: '14px 10px',
  textAlign: 'right',
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
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
      <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.4)', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{formatCurrency(value)}</div>
    </div>
  )
}
