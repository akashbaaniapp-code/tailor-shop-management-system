'use client'

import { useEffect, useState } from 'react'
import {
  ArrowDown, ArrowUp, FileSpreadsheet, FileText, Coins,
  CircleCheck, Calendar
} from 'lucide-react'
import { api, formatCurrency } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

const inputStyle: React.CSSProperties = {
  background: '#14161a',
  border: '1px solid #2a2d33',
  borderRadius: 8,
  padding: '6px 12px',
  color: '#e8eae9',
  fontSize: 13,
  outline: 'none',
  transition: '0.3s',
  width: 130,
}

export default function ReportCashFlow() {
  const { selectedEntity, selectedSubEntity } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const today = now.toISOString().split('T')[0]
  const [from, setFrom] = useState(firstDayOfMonth)
  const [to, setTo] = useState(today)

  // Signature fields
  const [preparedBy, setPreparedBy] = useState('')
  const [checkedBy, setCheckedBy] = useState('')
  const [approvedBy, setApprovedBy] = useState('')

  const entityName = selectedSubEntity?.name || selectedEntity?.name || 'Entity'

  // Fetch detailed transactions for the date range
  async function loadDetails() {
    setLoading(true)
    try {
      const [billsRes, incomesRes, expensesRes, depositsRes, openingRes, payablesRes] = await Promise.all([
        api.listBills(),
        api.listIncomes(),
        api.listExpenses(),
        api.listDeposits(),
        api.listOpeningBalances(),
        api.listPayables(),
      ])

      // Filter incomes, expenses, deposits by date range
      const fromD = new Date(from)
      const toD = new Date(to + 'T23:59:59')

      const incomes = (incomesRes.items || []).filter((i: any) => {
        const d = new Date(i.incomeDate)
        return d >= fromD && d <= toD
      })

      const expenses = (expensesRes.items || []).filter((e: any) => {
        const d = new Date(e.expenseDate)
        return d >= fromD && d <= toD
      })

      const deposits = (depositsRes.items || []).filter((d: any) => {
        const d2 = new Date(d.depositDate)
        return d2 >= fromD && d2 <= toD
      })

      // Payable payments (Advances) — extract individual payment entries from payables
      const advances: any[] = []
      ;(payablesRes.items || []).forEach((p: any) => {
        if (p.payments) {
          p.payments.forEach((pay: any) => {
            const d = new Date(pay.payDate)
            if (d >= fromD && d <= toD) {
              advances.push({
                title: `Advance: ${p.partyName}`,
                amount: Number(pay.amount || 0),
                date: pay.payDate,
                note: pay.note,
              })
            }
          })
        }
      })

      // Bill collections
      const bills = (billsRes.items || []).filter((b: any) => {
        const d = new Date(b.collectDate)
        return d >= fromD && d <= toD
      })

      // Opening balance — sum all entries
      const openingBalance = (openingRes.items || []).reduce((s: number, ob: any) => s + Number(ob.amount || 0), 0)

      // Sales order income — sum grandTotal of orders in date range
      const ordersRes = await api.listSalesOrders({})
      const salesOrders = (ordersRes.orders || []).filter((o: any) => {
        const d = new Date(o.orderDate)
        return d >= fromD && d <= toD
      })

      setData({
        salesOrders,
        incomes,
        expenses,
        deposits,
        advances,
        bills,
        openingBalance,
      })
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDetails()
  }, [])

  function handleApplyFilter() {
    if (!from || !to) {
      toast.error('Please select both From Date and To Date')
      return
    }
    loadDetails()
  }

  // Compute totals
  const collectedBills = (data?.bills || []).reduce((s: number, b: any) => s + Number(b.amount || 0), 0)
  const salesIncome = (data?.salesOrders || []).reduce((s: number, o: any) => s + Number(o.grandTotal || 0), 0)
  const otherIncome = (data?.incomes || []).reduce((s: number, i: any) => s + Number(i.amount || 0), 0)
  const totalIncome = salesIncome + otherIncome + collectedBills
  const openingBalance = data?.openingBalance || 0

  const expenses = (data?.expenses || []).reduce((s: number, e: any) => s + Number(e.amount || 0), 0)
  const deposits = (data?.deposits || []).reduce((s: number, d: any) => s + Number(d.amount || 0), 0)
  const advances = (data?.advances || []).reduce((s: number, a: any) => s + Number(a.amount || 0), 0)
  const totalExpense = expenses + deposits + advances

  const netBalance = openingBalance + totalIncome - totalExpense

  // Export to Excel (CSV)
  function exportToExcel() {
    let csv = ''
    csv += `${entityName} Financial Flow Report\n`
    csv += `Date From ${from} to ${to}\n\n`
    csv += 'Receipts / Income\n'
    csv += `Description,Amount (BDT)\n`
    csv += `Sales order wise income,${salesIncome.toFixed(2)}\n`
    csv += `Bill Collection (collected),${collectedBills.toFixed(2)}\n`
    csv += `Other income entries,${otherIncome.toFixed(2)}\n`
    csv += `Total Income,${totalIncome.toFixed(2)}\n\n`
    csv += 'Payments / Expenses\n'
    csv += `Description,Amount (BDT)\n`
    ;(data?.expenses || []).forEach((e: any) => {
      csv += `${e.title},${Number(e.amount || 0).toFixed(2)}\n`
    })
    ;(data?.deposits || []).forEach((d: any) => {
      csv += `${d.title} (Deposit),${Number(d.amount || 0).toFixed(2)}\n`
    })
    ;(data?.advances || []).forEach((a: any) => {
      csv += `${a.title} (Advance),${Number(a.amount || 0).toFixed(2)}\n`
    })
    csv += `Total Expense,${totalExpense.toFixed(2)}\n\n`
    csv += `Opening Balance,${openingBalance.toFixed(2)}\n`
    csv += `Net Balance,${netBalance.toFixed(2)}\n\n`
    csv += `Prepared by,${preparedBy}\n`
    csv += `Checked by,${checkedBy}\n`
    csv += `Approved by,${approvedBy}\n`

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${entityName}_Financial_Report.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Export to PDF (print)
  function printToPDF() {
    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) return

    const incomeRows = [
      { desc: 'Sales order wise income (Sales order entry)', amount: salesIncome },
      { desc: 'Bill Collection (collected)', amount: collectedBills },
      { desc: 'Other income entries', amount: otherIncome },
    ]

    const expenseRows = [
      ...(data?.expenses || []).map((e: any) => ({ desc: e.title, amount: Number(e.amount || 0) })),
      ...(data?.deposits || []).map((d: any) => ({ desc: `${d.title} (Deposit)`, amount: Number(d.amount || 0) })),
      ...(data?.advances || []).map((a: any) => ({ desc: `${a.title} (Advance)`, amount: Number(a.amount || 0) })),
    ]

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${entityName} Financial Report</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; font-family:'Space Grotesk',sans-serif; }
  body { background:#fff; color:#000; padding:20px; }
  .container { max-width:900px; margin:0 auto; }
  h2 { font-size:22px; margin-bottom:5px; }
  .date-range { font-size:13px; color:#666; margin-bottom:20px; }
  .opening { margin-bottom:20px; font-size:14px; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:30px; margin-bottom:25px; }
  .col-header { text-align:center; padding:12px; border-radius:8px; margin-bottom:15px; border:1px solid #ccc; }
  .col-header.income { background:#f0fdf4; border-color:#86efac; }
  .col-header.expense { background:#fef2f2; border-color:#fca5a5; }
  .col-header h3 { font-size:16px; }
  .col-header.income h3 { color:#16a34a; }
  .col-header.expense h3 { color:#dc2626; }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  th { text-align:left; padding:8px 10px; color:#666; font-weight:500; border-bottom:1px solid #ddd; }
  td { padding:8px 10px; border-bottom:1px solid #eee; }
  .text-right { text-align:right; }
  .text-green { color:#16a34a; }
  .text-red { color:#dc2626; }
  .text-muted { color:#666; }
  .total-row td { background:#f5f5f5; font-weight:600; border-top:1px solid #ddd; padding-top:12px; }
  .net-result { margin-top:25px; padding:18px 22px; border-radius:12px; border:1px solid #ddd; background:#f9f9f9; display:flex; justify-content:space-between; align-items:center; }
  .net-result .label { font-size:15px; color:#666; }
  .net-result .amount { font-size:24px; font-weight:700; }
  .net-result .amount.positive { color:#16a34a; }
  .net-result .amount.negative { color:#dc2626; }
  .signatures { margin-top:35px; padding-top:20px; border-top:1px solid #ddd; display:grid; grid-template-columns:1fr 1fr 1fr; gap:25px; }
  .sig-box .label { font-size:11px; color:#888; text-transform:uppercase; font-weight:600; margin-bottom:6px; }
  .sig-box .field { border:1px solid #ddd; border-radius:6px; padding:8px 12px; font-size:13px; min-height:20px; }
</style></head><body>
<div class="container">
  <h2>${entityName} — Financial Flow Report</h2>
  <div class="date-range">Date From ${from} to ${to}</div>
  <div class="opening"><strong>Opening Balance:</strong> ${formatCurrency(openingBalance)}</div>
  <div class="grid">
    <div>
      <div class="col-header income"><h3>↓ Receipts / Income</h3></div>
      <table>
        <thead><tr><th width="60%">Description</th><th width="40%" class="text-right">Amount (BDT)</th></tr></thead>
        <tbody>
          ${incomeRows.map(r => `<tr><td class="text-muted">${r.desc}</td><td class="text-right text-green">${formatCurrency(r.amount)}</td></tr>`).join('')}
          <tr class="total-row"><td>Total Income</td><td class="text-right text-green">${formatCurrency(totalIncome)}</td></tr>
        </tbody>
      </table>
    </div>
    <div>
      <div class="col-header expense"><h3>↑ Payments / Expenses</h3></div>
      <table>
        <thead><tr><th width="60%">Description</th><th width="40%" class="text-right">Amount (BDT)</th></tr></thead>
        <tbody>
          ${expenseRows.length > 0 ? expenseRows.map(r => `<tr><td class="text-muted">${r.desc}</td><td class="text-right text-red">${formatCurrency(r.amount)}</td></tr>`).join('') : '<tr><td class="text-muted" colspan="2">No expenses</td></tr>'}
          <tr class="total-row"><td>Total Expense</td><td class="text-right text-red">${formatCurrency(totalExpense)}</td></tr>
        </tbody>
      </table>
    </div>
  </div>
  <div class="net-result">
    <span class="label">✓ Net Balance (Opening + Income - Expense)</span>
    <span class="amount ${netBalance >= 0 ? 'positive' : 'negative'}">${netBalance >= 0 ? '' : '-'}${formatCurrency(Math.abs(netBalance))} BDT</span>
  </div>
  <div class="signatures">
    <div class="sig-box"><div class="label">Prepared by</div><div class="field">${preparedBy || '&nbsp;'}</div></div>
    <div class="sig-box"><div class="label">Checked by</div><div class="field">${checkedBy || '&nbsp;'}</div></div>
    <div class="sig-box"><div class="label">Approved by</div><div class="field">${approvedBy || '&nbsp;'}</div></div>
  </div>
</div>
<script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
</body></html>`

    printWindow.document.write(html)
    printWindow.document.close()
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '0', minHeight: '100vh' }}>
      <div
        style={{
          maxWidth: 1000,
          width: '100%',
          background: '#14161a',
          border: '1px solid #2a2d33',
          borderRadius: 20,
          padding: '35px 40px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 30,
            paddingBottom: 20,
            borderBottom: '1px solid #2a2d33',
            flexWrap: 'wrap',
            gap: 15,
          }}
        >
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#e8eae9', margin: 0 }}>
              <span style={{ color: '#d4df3a' }}>{entityName}</span> Chart
            </h2>
          </div>
          {/* Date Filter Panel */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 15,
              flexWrap: 'wrap',
              background: '#0b0d0f',
              padding: '12px 18px',
              borderRadius: 14,
              border: '1px solid #2a2d33',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>From Date</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>To Date</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
              />
            </div>
            <button
              onClick={handleApplyFilter}
              style={{
                background: '#1db954',
                color: '#fff',
                border: 'none',
                padding: '8px 20px',
                borderRadius: 8,
                fontWeight: 600,
                cursor: 'pointer',
                transition: '0.3s',
                height: 35,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#1aa34a'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#1db954'; e.currentTarget.style.transform = 'none' }}
            >
              <Calendar size={14} /> Apply Filter
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginBottom: 25, flexWrap: 'wrap' }}>
          <button
            onClick={exportToExcel}
            style={{
              background: '#0b0d0f',
              border: '1px solid #2a2d33',
              color: '#e8eae9',
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: '0.3s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#1db954'; e.currentTarget.style.color = '#1db954' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2d33'; e.currentTarget.style.color = '#e8eae9' }}
          >
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button
            onClick={printToPDF}
            style={{
              background: '#0b0d0f',
              border: '1px solid #2a2d33',
              color: '#e8eae9',
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: '0.3s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ff6b6b'; e.currentTarget.style.color = '#ff6b6b' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2d33'; e.currentTarget.style.color = '#e8eae9' }}
          >
            <FileText size={14} /> PDF
          </button>
        </div>

        {/* Opening Balance */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 25, gap: 20 }}>
          <div
            style={{
              background: '#0b0d0f',
              border: '1px solid #2a2d33',
              borderRadius: 10,
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 13, color: '#888', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Coins size={14} color="#d4df3a" /> Opening Balance
            </span>
            <span style={{ fontSize: 16, fontWeight: 600, color: '#e8eae9' }}>
              {loading ? '...' : formatCurrency(openingBalance)}
            </span>
          </div>
        </div>

        {/* Main Side-by-Side Flow */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#888' }}>
            <div style={{ display: 'inline-block', width: 30, height: 30, border: '2px solid #2a2d33', borderTopColor: '#d4df3a', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ marginTop: 10 }}>Loading data...</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 }}>
              {/* LEFT: Receipts / Income */}
              <div>
                <div
                  style={{
                    textAlign: 'center',
                    padding: 15,
                    borderRadius: 12,
                    marginBottom: 20,
                    border: '1px solid rgba(29,185,84,0.2)',
                    background: 'rgba(29,185,84,0.05)',
                  }}
                >
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1db954', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <ArrowDown size={18} /> Receipts / Income
                  </h3>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '10px 12px', color: '#666', fontWeight: 500, borderBottom: '1px solid #2a2d33', width: '60%' }}>Description</th>
                      <th style={{ textAlign: 'right', padding: '10px 12px', color: '#666', fontWeight: 500, borderBottom: '1px solid #2a2d33', width: '40%' }}>Amount (BDT)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #1f2227' }}>
                      <td style={{ padding: '10px 12px', color: '#888' }}>Sales order wise income (Sales order entry)</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#1db954' }}>{formatCurrency(salesIncome)}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #1f2227' }}>
                      <td style={{ padding: '10px 12px', color: '#888' }}>Bill Collection (collected)</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#1db954' }}>{formatCurrency(collectedBills)}</td>
                    </tr>
                    {(data?.incomes || []).map((inc: any, idx: number) => (
                      <tr key={`inc-${idx}`} style={{ borderBottom: '1px solid #1f2227' }}>
                        <td style={{ padding: '10px 12px', color: '#888' }}>{inc.title || 'Income entry'}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#1db954' }}>{formatCurrency(Number(inc.amount || 0))}</td>
                      </tr>
                    ))}
                    {(data?.incomes || []).length === 0 && (
                      <tr style={{ borderBottom: '1px solid #1f2227' }}>
                        <td style={{ padding: '10px 12px', color: '#888' }}>Income will appear here, if data entry by income menu</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#1db954' }}>0.00</td>
                      </tr>
                    )}
                    <tr style={{ background: '#1f2227', borderTop: '1px solid #2a2d33', fontWeight: 600 }}>
                      <td style={{ padding: '15px 12px', fontWeight: 600 }}>Total Income</td>
                      <td style={{ padding: '15px 12px', textAlign: 'right', fontWeight: 600, color: '#1db954' }}>{formatCurrency(totalIncome)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* RIGHT: Payments / Expenses */}
              <div>
                <div
                  style={{
                    textAlign: 'center',
                    padding: 15,
                    borderRadius: 12,
                    marginBottom: 20,
                    border: '1px solid rgba(255,107,107,0.2)',
                    background: 'rgba(255,107,107,0.05)',
                  }}
                >
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: '#ff6b6b', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <ArrowUp size={18} /> Payments / Expenses
                  </h3>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '10px 12px', color: '#666', fontWeight: 500, borderBottom: '1px solid #2a2d33', width: '60%' }}>Description</th>
                      <th style={{ textAlign: 'right', padding: '10px 12px', color: '#666', fontWeight: 500, borderBottom: '1px solid #2a2d33', width: '40%' }}>Amount (BDT)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.expenses || []).length > 0 ? (
                      (data?.expenses || []).map((exp: any, idx: number) => (
                        <tr key={`exp-${idx}`} style={{ borderBottom: '1px solid #1f2227' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                        >
                          <td style={{ padding: '10px 12px', color: '#888' }}>{exp.title}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#ff6b6b' }}>{formatCurrency(Number(exp.amount || 0))}</td>
                        </tr>
                      ))
                    ) : (
                      <tr style={{ borderBottom: '1px solid #1f2227' }}>
                        <td style={{ padding: '10px 12px', color: '#888' }}>No expenses for this period</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#ff6b6b' }}>0.00</td>
                      </tr>
                    )}
                    {(data?.deposits || []).map((dep: any, idx: number) => (
                      <tr key={`dep-${idx}`} style={{ borderBottom: '1px solid #1f2227' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                      >
                        <td style={{ padding: '10px 12px', color: '#888' }}>{dep.title} (Deposit)</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#ff6b6b' }}>{formatCurrency(Number(dep.amount || 0))}</td>
                      </tr>
                    ))}
                    {(data?.advances || []).map((adv: any, idx: number) => (
                      <tr key={`adv-${idx}`} style={{ borderBottom: '1px solid #1f2227' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                      >
                        <td style={{ padding: '10px 12px', color: '#888' }}>{adv.title} (Advance)</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#ff6b6b' }}>{formatCurrency(Number(adv.amount || 0))}</td>
                      </tr>
                    ))}
                    <tr style={{ background: '#1f2227', borderTop: '1px solid #2a2d33', fontWeight: 600 }}>
                      <td style={{ padding: '15px 12px', fontWeight: 600 }}>Total Expense</td>
                      <td style={{ padding: '15px 12px', textAlign: 'right', fontWeight: 600, color: '#ff6b6b' }}>{formatCurrency(totalExpense)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Net Balance */}
            <div
              style={{
                marginTop: 35,
                padding: '20px 25px',
                borderRadius: 16,
                border: '1px solid #2a2d33',
                background: '#0b0d0f',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 16, color: '#888', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CircleCheck size={18} color="#d4df3a" /> Net Balance (Opening + Income - Expense)
              </span>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: netBalance >= 0 ? '#1db954' : '#ff6b6b',
                }}
              >
                {netBalance < 0 ? '-' : ''}
                {formatCurrency(Math.abs(netBalance))} BDT
              </span>
            </div>

            {/* Signature Section */}
            <div
              style={{
                marginTop: 40,
                paddingTop: 25,
                borderTop: '1px solid #2a2d33',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 30,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Prepared by</span>
                <input
                  type="text"
                  value={preparedBy}
                  onChange={(e) => setPreparedBy(e.target.value)}
                  placeholder="Enter name..."
                  style={{
                    background: '#0b0d0f',
                    border: '1px solid #2a2d33',
                    borderRadius: 6,
                    padding: '8px 12px',
                    color: '#e8eae9',
                    fontSize: 14,
                    outline: 'none',
                    width: '100%',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Checked by</span>
                <input
                  type="text"
                  value={checkedBy}
                  onChange={(e) => setCheckedBy(e.target.value)}
                  placeholder="Enter name..."
                  style={{
                    background: '#0b0d0f',
                    border: '1px solid #2a2d33',
                    borderRadius: 6,
                    padding: '8px 12px',
                    color: '#e8eae9',
                    fontSize: 14,
                    outline: 'none',
                    width: '100%',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Approved by</span>
                <input
                  type="text"
                  value={approvedBy}
                  onChange={(e) => setApprovedBy(e.target.value)}
                  placeholder="Enter name..."
                  style={{
                    background: '#0b0d0f',
                    border: '1px solid #2a2d33',
                    borderRadius: 6,
                    padding: '8px 12px',
                    color: '#e8eae9',
                    fontSize: 14,
                    outline: 'none',
                    width: '100%',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
