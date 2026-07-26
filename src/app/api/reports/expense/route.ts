import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { _getClient } from '@/lib/db'
import { getMonthName } from '@/lib/utils-server'

export const revalidate = 60

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const headId = searchParams.get('headId')
  const groupBy = searchParams.get('groupBy') || 'date' // 'date' | 'head' | 'month'

  const client = _getClient()

  // Build WHERE clause
  const conditions: string[] = []
  const args: any[] = []
  if (from) {
    conditions.push('e.expenseDate >= ?')
    args.push(new Date(from).toISOString())
  }
  if (to) {
    conditions.push('e.expenseDate <= ?')
    args.push(new Date(to).toISOString())
  }
  if (headId && headId !== 'all') {
    conditions.push('e.expenseHeadId = ?')
    args.push(headId)
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  // Get all expenses with head info — single query with JOIN
  const expensesRes = await client.execute({
    sql: `SELECT e.id, e.title, e.amount, e.expenseDate, e.note,
            eh.id as "head.id", eh.name as "head.name"
          FROM "Expense" e
          LEFT JOIN "ExpenseHead" eh ON eh.id = e.expenseHeadId
          ${whereClause}
          ORDER BY e.expenseDate DESC`,
    args
  })

  // Transform flat rows into nested objects
  const expenses = expensesRes.rows.map((raw: any) => {
    const exp: any = {}
    const head: any = {}
    for (const k of Object.keys(raw)) {
      if (/^\d+$/.test(k)) continue
      if (k.startsWith('head.')) head[k.slice('head.'.length)] = raw[k]
      else exp[k] = raw[k]
    }
    exp.head = head.id ? head : null
    return exp
  })

  // Compute totals
  const totalAmount = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0)

  // Group breakdown
  let groups: any[] = []
  if (groupBy === 'head') {
    // Group by expense head
    const headMap: Record<string, { name: string; count: number; amount: number }> = {}
    for (const e of expenses) {
      const headName = e.head?.name || 'No Head'
      if (!headMap[headName]) headMap[headName] = { name: headName, count: 0, amount: 0 }
      headMap[headName].count++
      headMap[headName].amount += Number(e.amount || 0)
    }
    groups = Object.values(headMap).sort((a, b) => b.amount - a.amount)
  } else if (groupBy === 'month') {
    // Group by YYYY-MM
    const monthMap: Record<string, { label: string; count: number; amount: number }> = {}
    for (const e of expenses) {
      const d = new Date(e.expenseDate)
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = `${getMonthName(d.getMonth())} ${d.getFullYear()}`
      if (!monthMap[ym]) monthMap[ym] = { label, count: 0, amount: 0 }
      monthMap[ym].count++
      monthMap[ym].amount += Number(e.amount || 0)
    }
    groups = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v)
  } else {
    // Group by date
    const dateMap: Record<string, { label: string; count: number; amount: number }> = {}
    for (const e of expenses) {
      const d = new Date(e.expenseDate)
      const label = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      if (!dateMap[label]) dateMap[label] = { label, count: 0, amount: 0 }
      dateMap[label].count++
      dateMap[label].amount += Number(e.amount || 0)
    }
    groups = Object.values(dateMap)
  }

  const response = NextResponse.json({
    expenses,
    totalAmount,
    count: expenses.length,
    groups,
    groupBy
  })
  response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60')
  return response
}
