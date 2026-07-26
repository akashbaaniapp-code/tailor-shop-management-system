import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { getMonthName } from '@/lib/utils-server'
import { _getClient } from '@/lib/db'

export const revalidate = 60

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'monthly'
  const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear()
  const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : new Date().getMonth()

  const client = _getClient()

  // Single query per data source using GROUP BY period
  // Use strftime to extract the period bucket
  let periodFormat: string
  if (period === 'daily') {
    // Group by date within the month: 'YYYY-MM-DD'
    periodFormat = '%Y-%m-%d'
  } else if (period === 'yearly') {
    // Single bucket for the year: 'YYYY'
    periodFormat = '%Y'
  } else {
    // Group by month: 'YYYY-MM'
    periodFormat = '%Y-%m'
  }

  // Determine date range
  let startISO: string, endISO: string
  if (period === 'daily') {
    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
    startISO = start.toISOString()
    endISO = end.toISOString()
  } else {
    const start = new Date(year, 0, 1)
    const end = new Date(year, 11, 31, 23, 59, 59, 999)
    startISO = start.toISOString()
    endISO = end.toISOString()
  }

  // Run all 5 GROUP BY queries in parallel — much faster than sequential
  const [salesRes, collectedRes, expensesRes, incomesRes, payablesRes] = await Promise.all([
    client.execute({
      sql: `SELECT strftime('${periodFormat}', orderDate) as bucket,
                   COALESCE(SUM(grandTotal), 0) as sales
            FROM "SalesOrder"
            WHERE orderDate >= ? AND orderDate <= ?
            GROUP BY bucket`,
      args: [startISO, endISO]
    }),
    client.execute({
      sql: `SELECT strftime('${periodFormat}', collectDate) as bucket,
                   COALESCE(SUM(amount), 0) as collected
            FROM "BillCollection"
            WHERE collectDate >= ? AND collectDate <= ?
            GROUP BY bucket`,
      args: [startISO, endISO]
    }),
    client.execute({
      sql: `SELECT strftime('${periodFormat}', expenseDate) as bucket,
                   COALESCE(SUM(amount), 0) as expense
            FROM "Expense"
            WHERE expenseDate >= ? AND expenseDate <= ?
            GROUP BY bucket`,
      args: [startISO, endISO]
    }),
    client.execute({
      sql: `SELECT strftime('${periodFormat}', incomeDate) as bucket,
                   COALESCE(SUM(amount), 0) as income
            FROM "Income"
            WHERE incomeDate >= ? AND incomeDate <= ?
            GROUP BY bucket`,
      args: [startISO, endISO]
    }),
    client.execute({
      sql: `SELECT strftime('${periodFormat}', payDate) as bucket,
                   COALESCE(SUM(amount), 0) as payablePaid
            FROM "PayablePayment"
            WHERE payDate >= ? AND payDate <= ?
            GROUP BY bucket`,
      args: [startISO, endISO]
    })
  ])

  // Merge results into a single map keyed by bucket
  type Row = { label: string; sales: number; collected: number; expense: number; otherIncome: number; payablePaid: number; netProfit: number }
  const bucketMap: Record<string, Row> = {}

  function labelFor(bucket: string): string {
    if (!bucket) return ''
    if (period === 'yearly') return `Year ${bucket}`
    if (period === 'monthly') {
      const [y, m] = bucket.split('-')
      return `${getMonthName(parseInt(m) - 1)} ${y}`
    }
    // daily: YYYY-MM-DD
    const [y, m, d] = bucket.split('-')
    return `${d} ${getMonthName(parseInt(m) - 1)} ${y}`
  }

  function ensureRow(bucket: string): Row {
    if (!bucketMap[bucket]) {
      bucketMap[bucket] = {
        label: labelFor(bucket),
        sales: 0, collected: 0, expense: 0, otherIncome: 0, payablePaid: 0, netProfit: 0
      }
    }
    return bucketMap[bucket]
  }

  for (const row of salesRes.rows as any[]) ensureRow(row.bucket).sales = Number(row.sales) || 0
  for (const row of collectedRes.rows as any[]) ensureRow(row.bucket).collected = Number(row.collected) || 0
  for (const row of expensesRes.rows as any[]) ensureRow(row.bucket).expense = Number(row.expense) || 0
  for (const row of incomesRes.rows as any[]) ensureRow(row.bucket).otherIncome = Number(row.income) || 0
  for (const row of payablesRes.rows as any[]) ensureRow(row.bucket).payablePaid = Number(row.payablePaid) || 0

  // Compute netProfit per row
  for (const row of Object.values(bucketMap)) {
    row.netProfit = (row.collected + row.otherIncome) - row.expense - row.payablePaid
  }

  // Build sorted rows array
  let rows: Row[]
  if (period === 'daily') {
    // Show only days that have data, sorted ascending
    rows = Object.entries(bucketMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v)
  } else if (period === 'monthly') {
    // Show all 12 months of the year, even if zero
    rows = []
    for (let m = 0; m < 12; m++) {
      const bucket = `${year}-${String(m + 1).padStart(2, '0')}`
      const row = bucketMap[bucket] || {
        label: `${getMonthName(m)} ${year}`,
        sales: 0, collected: 0, expense: 0, otherIncome: 0, payablePaid: 0, netProfit: 0
      }
      rows.push(row)
    }
  } else {
    // yearly - single row
    rows = Object.values(bucketMap)
  }

  // Totals
  const totals = rows.reduce((acc, r) => {
    acc.sales += r.sales
    acc.collected += r.collected
    acc.expense += r.expense
    acc.otherIncome += r.otherIncome
    acc.payablePaid += r.payablePaid
    return acc
  }, { sales: 0, collected: 0, expense: 0, otherIncome: 0, payablePaid: 0 })
  totals.netProfit = (totals.collected + totals.otherIncome) - totals.expense - totals.payablePaid

  const response = NextResponse.json({ period, year, month, rows, totals })
  response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60')
  return response
}
