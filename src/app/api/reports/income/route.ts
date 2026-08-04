import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { _getClient } from '@/lib/db'
import { getMonthName } from '@/lib/utils-server'
import { getEntityContext, buildEntityFilter } from '@/lib/entity-context'

export const revalidate = 60

/**
 * Income Report — combines two income sources:
 *   1. Sales Orders — the grandTotal of each order counts as sales income
 *   2. Income Entries — manual income entries (other incomes) from the Income table
 *
 * Returns:
 *   - rows: unified list of income items (source: 'sales' | 'other')
 *   - totals: { sales, otherIncome, total }
 *   - groups: breakdown by date | month | source
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const source = searchParams.get('source') // 'all' | 'sales' | 'other'
  const groupBy = searchParams.get('groupBy') || 'date' // 'date' | 'month' | 'source'

  const ctx = await getEntityContext(request)
  const entityFilter = buildEntityFilter(ctx)

  const client = _getClient()

  // ===== 1. Fetch sales orders (sales income) =====
  const salesConditions: string[] = []
  const salesArgs: any[] = []
  if (entityFilter.sql) {
    salesConditions.push(entityFilter.sql)
    salesArgs.push(...entityFilter.args)
  }
  if (from) {
    salesConditions.push('so.orderDate >= ?')
    salesArgs.push(new Date(from).toISOString())
  }
  if (to) {
    salesConditions.push('so.orderDate <= ?')
    salesArgs.push(new Date(to).toISOString())
  }
  const salesWhere = salesConditions.length ? `WHERE ${salesConditions.join(' AND ')}` : ''

  const salesRes = await client.execute({
    sql: `SELECT so.id, so.orderId, so.orderDate, so.grandTotal, so.paymentStatus,
            c.name as "customer.name"
          FROM "SalesOrder" so
          LEFT JOIN "Customer" c ON c.id = so.customerId
          ${salesWhere}
          ORDER BY so.orderDate DESC`,
    args: salesArgs
  })

  const salesRows = salesRes.rows.map((raw: any) => {
    const customer: any = {}
    for (const k of Object.keys(raw)) {
      if (k.startsWith('customer.')) customer[k.slice('customer.'.length)] = raw[k]
    }
    return {
      id: raw.id,
      source: 'sales' as const,
      refId: raw.orderId,
      title: `Sales Order ${raw.orderId}`,
      customerName: customer.name || '',
      amount: Number(raw.grandTotal || 0),
      date: raw.orderDate,
      paymentStatus: raw.paymentStatus,
    }
  })

  // ===== 2. Fetch income entries (other income) =====
  const incomeConditions: string[] = []
  const incomeArgs: any[] = []
  if (entityFilter.sql) {
    incomeConditions.push(entityFilter.sql.replace(/"subEntityId"/g, 'i."subEntityId"').replace(/"entityId"/g, 'i."entityId"'))
    incomeArgs.push(...entityFilter.args)
  }
  if (from) {
    incomeConditions.push('i.incomeDate >= ?')
    incomeArgs.push(new Date(from).toISOString())
  }
  if (to) {
    incomeConditions.push('i.incomeDate <= ?')
    incomeArgs.push(new Date(to).toISOString())
  }
  const incomeWhere = incomeConditions.length ? `WHERE ${incomeConditions.join(' AND ')}` : ''

  const incomeRes = await client.execute({
    sql: `SELECT i.id, i.title, i.amount, i.incomeDate, i.note,
            ih.id as "head.id", ih.name as "head.name"
          FROM "Income" i
          LEFT JOIN "IncomeHead" ih ON ih.id = i.incomeHeadId
          ${incomeWhere}
          ORDER BY i.incomeDate DESC`,
    args: incomeArgs
  })

  const incomeRows = incomeRes.rows.map((raw: any) => {
    const head: any = {}
    for (const k of Object.keys(raw)) {
      if (k.startsWith('head.')) head[k.slice('head.'.length)] = raw[k]
    }
    return {
      id: raw.id,
      source: 'other' as const,
      refId: raw.id,
      title: raw.title,
      customerName: '',
      headName: head.name || '',
      amount: Number(raw.amount || 0),
      date: raw.incomeDate,
      note: raw.note,
    }
  })

  // ===== 3. Combine and filter by source =====
  let allRows = [...salesRows, ...incomeRows]
  if (source === 'sales') allRows = allRows.filter((r) => r.source === 'sales')
  if (source === 'other') allRows = allRows.filter((r) => r.source === 'other')

  // Sort combined list by date desc
  allRows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // ===== 4. Totals =====
  const totalSales = salesRows.reduce((s, r) => s + r.amount, 0)
  const totalOtherIncome = incomeRows.reduce((s, r) => s + r.amount, 0)
  const total = totalSales + totalOtherIncome

  // ===== 5. Groups =====
  let groups: any[] = []
  if (groupBy === 'source') {
    const sourceMap: Record<string, { name: string; count: number; amount: number }> = {
      sales: { name: 'Sales Orders', count: 0, amount: 0 },
      other: { name: 'Other Income', count: 0, amount: 0 },
    }
    for (const r of allRows) {
      sourceMap[r.source].count++
      sourceMap[r.source].amount += r.amount
    }
    groups = Object.values(sourceMap).filter((g) => g.count > 0)
  } else if (groupBy === 'month') {
    const monthMap: Record<string, { label: string; count: number; amount: number; sales: number; other: number }> = {}
    for (const r of allRows) {
      const d = new Date(r.date)
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = `${getMonthName(d.getMonth())} ${d.getFullYear()}`
      if (!monthMap[ym]) monthMap[ym] = { label, count: 0, amount: 0, sales: 0, other: 0 }
      monthMap[ym].count++
      monthMap[ym].amount += r.amount
      if (r.source === 'sales') monthMap[ym].sales += r.amount
      else monthMap[ym].other += r.amount
    }
    groups = Object.entries(monthMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([, v]) => v)
  } else {
    // Group by date
    const dateMap: Record<string, { label: string; count: number; amount: number; sales: number; other: number }> = {}
    for (const r of allRows) {
      const d = new Date(r.date)
      const label = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      if (!dateMap[label]) dateMap[label] = { label, count: 0, amount: 0, sales: 0, other: 0 }
      dateMap[label].count++
      dateMap[label].amount += r.amount
      if (r.source === 'sales') dateMap[label].sales += r.amount
      else dateMap[label].other += r.amount
    }
    groups = Object.values(dateMap)
  }

  const response = NextResponse.json({
    rows: allRows,
    totals: {
      sales: totalSales,
      otherIncome: totalOtherIncome,
      total,
      count: allRows.length,
    },
    groups,
    groupBy,
  })
  response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60')
  return response
}
