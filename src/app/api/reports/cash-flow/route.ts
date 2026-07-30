import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { _getClient } from '@/lib/db'
import { getEntityContext, buildEntityFilter } from '@/lib/entity-context'

export const revalidate = 60

/**
 * Cash Flow Chart Report — shows Receipts (left) vs Payments (right) over time.
 *
 * Receipts (income/cash-in):
 *   - Bill Collections (collected amount from customers)
 *   - Income Entries (other income)
 *
 * Payments (expense/cash-out):
 *   - Expenses
 *   - Payable Payments (paid to suppliers)
 *   - Deposits (bank deposits — cash moved to bank)
 *
 * Supports daily / monthly / yearly granularity.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'monthly' // daily | monthly | yearly
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth()))

  const ctx = await getEntityContext(request)
  const entityFilter = buildEntityFilter(ctx)
  const client = _getClient()

  // Determine date range and bucket format
  let startDate: Date
  let endDate: Date
  let bucketFormat: string
  let labels: string[] = []

  if (period === 'daily') {
    // Daily for one month
    startDate = new Date(year, month, 1)
    endDate = new Date(year, month + 1, 0, 23, 59, 59)
    bucketFormat = '%d' // day of month
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    for (let d = 1; d <= daysInMonth; d++) {
      labels.push(String(d))
    }
  } else if (period === 'yearly') {
    // Yearly for last 5 years
    startDate = new Date(year - 4, 0, 1)
    endDate = new Date(year, 11, 31, 23, 59, 59)
    bucketFormat = '%Y'
    for (let y = year - 4; y <= year; y++) {
      labels.push(String(y))
    }
  } else {
    // Monthly for one year
    startDate = new Date(year, 0, 1)
    endDate = new Date(year, 11, 31, 23, 59, 59)
    bucketFormat = '%m'
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    labels = monthNames
  }

  const startIso = startDate.toISOString()
  const endIso = endDate.toISOString()

  // Helper to build WHERE clause with entity filter
  function buildWhere(dateCol: string, extraTableAlias?: string) {
    const conditions: string[] = []
    const args: any[] = []
    if (entityFilter.sql) {
      // entityFilter.sql uses unqualified column names; prefix with alias if provided
      if (extraTableAlias) {
        const prefixed = entityFilter.sql
          .replace(/"subEntityId"/g, `"${extraTableAlias}"."subEntityId"`)
          .replace(/"entityId"/g, `"${extraTableAlias}"."entityId"`)
        conditions.push(prefixed)
      } else {
        conditions.push(entityFilter.sql)
      }
      args.push(...entityFilter.args)
    }
    conditions.push(`${dateCol} >= ?`)
    args.push(startIso)
    conditions.push(`${dateCol} <= ?`)
    args.push(endIso)
    return { sql: conditions.join(' AND '), args }
  }

  // 1. Bill Collections (Receipts)
  const billWhere = buildWhere('"collectDate"')
  const billRes = await client.execute({
    sql: `SELECT strftime('${bucketFormat}', "collectDate") as bucket, COALESCE(SUM("amount"), 0) as total
          FROM "BillCollection"
          WHERE ${billWhere.sql}
          GROUP BY bucket`,
    args: billWhere.args
  })

  // 2. Income Entries (Receipts)
  const incomeWhere = buildWhere('"incomeDate"')
  const incomeRes = await client.execute({
    sql: `SELECT strftime('${bucketFormat}', "incomeDate") as bucket, COALESCE(SUM("amount"), 0) as total
          FROM "Income"
          WHERE ${incomeWhere.sql}
          GROUP BY bucket`,
    args: incomeWhere.args
  })

  // 3. Expenses (Payments)
  const expenseWhere = buildWhere('"expenseDate"')
  const expenseRes = await client.execute({
    sql: `SELECT strftime('${bucketFormat}', "expenseDate") as bucket, COALESCE(SUM("amount"), 0) as total
          FROM "Expense"
          WHERE ${expenseWhere.sql}
          GROUP BY bucket`,
    args: expenseWhere.args
  })

  // 4. Payable Payments (Payments)
  const payableWhere = buildWhere('pp."payDate"', 'pp')
  const payableRes = await client.execute({
    sql: `SELECT strftime('${bucketFormat}', pp."payDate") as bucket, COALESCE(SUM(pp."amount"), 0) as total
          FROM "PayablePayment" pp
          WHERE ${payableWhere.sql}
          GROUP BY bucket`,
    args: payableWhere.args
  })

  // 5. Deposits (Payments — cash moved to bank)
  const depositWhere = buildWhere('"depositDate"')
  const depositRes = await client.execute({
    sql: `SELECT strftime('${bucketFormat}', "depositDate") as bucket, COALESCE(SUM("amount"), 0) as total
          FROM "Deposit"
          WHERE ${depositWhere.sql}
          GROUP BY bucket`,
    args: depositWhere.args
  })

  // Build lookup maps
  function toMap(rows: any[]): Record<string, number> {
    const m: Record<string, number> = {}
    for (const r of rows) {
      m[r.bucket as string] = Number(r.total) || 0
    }
    return m
  }

  const billMap = toMap(billRes.rows)
  const incomeMap = toMap(incomeRes.rows)
  const expenseMap = toMap(expenseRes.rows)
  const payableMap = toMap(payableRes.rows)
  const depositMap = toMap(depositRes.rows)

  // Build chart data rows
  const chartData = labels.map((label, idx) => {
    const bucketKey =
      period === 'daily' ? String(idx + 1).padStart(2, '0') :
      period === 'yearly' ? label :
      String(idx + 1).padStart(2, '0') // monthly

    const collected = billMap[bucketKey] || 0
    const otherIncome = incomeMap[bucketKey] || 0
    const expense = expenseMap[bucketKey] || 0
    const payablePaid = payableMap[bucketKey] || 0
    const deposit = depositMap[bucketKey] || 0

    const receipts = collected + otherIncome
    const payments = expense + payablePaid + deposit

    return {
      label,
      receipts,
      payments,
      collected,
      otherIncome,
      expense,
      payablePaid,
      deposit,
      net: receipts - payments,
    }
  })

  // Totals
  const totals = chartData.reduce(
    (acc, r) => ({
      receipts: acc.receipts + r.receipts,
      payments: acc.payments + r.payments,
      collected: acc.collected + r.collected,
      otherIncome: acc.otherIncome + r.otherIncome,
      expense: acc.expense + r.expense,
      payablePaid: acc.payablePaid + r.payablePaid,
      deposit: acc.deposit + r.deposit,
      net: acc.net + r.net,
    }),
    { receipts: 0, payments: 0, collected: 0, otherIncome: 0, expense: 0, payablePaid: 0, deposit: 0, net: 0 }
  )

  const response = NextResponse.json({
    period,
    year,
    month,
    chartData,
    totals,
  })
  response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60')
  return response
}
