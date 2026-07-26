import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { getMonthName } from '@/lib/utils-server'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'monthly' // daily, monthly, yearly
  const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear()
  const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : new Date().getMonth()

  let startDate: Date
  let endDate: Date

  if (period === 'daily') {
    startDate = new Date(year, month, 1)
    endDate = new Date(year, month + 1, 0, 23, 59, 59)
  } else if (period === 'yearly') {
    startDate = new Date(year, 0, 1)
    endDate = new Date(year, 11, 31, 23, 59, 59)
  } else {
    // monthly - whole year broken by month
    startDate = new Date(year, 0, 1)
    endDate = new Date(year, 11, 31, 23, 59, 59)
  }

  // Get sales (income from sales orders), bill collections, expenses, and other incomes
  const salesOrders = await db.salesOrder.findMany({
    where: { orderDate: { gte: startDate, lte: endDate } },
    include: { customer: true, items: true }
  })

  const billCollections = await db.billCollection.findMany({
    where: { collectDate: { gte: startDate, lte: endDate } },
    include: { order: { include: { customer: true } } }
  })

  const expenses = await db.expense.findMany({
    where: { expenseDate: { gte: startDate, lte: endDate } }
  })

  const incomes = await db.income.findMany({
    where: { incomeDate: { gte: startDate, lte: endDate } }
  })

  const payablePayments = await db.payablePayment.findMany({
    where: { payDate: { gte: startDate, lte: endDate } },
    include: { payable: true }
  })

  // Build report based on period
  let rows: any[] = []
  let totalSales = 0
  let totalCollected = 0
  let totalExpense = 0
  let totalOtherIncome = 0
  let totalPayablePaid = 0

  if (period === 'monthly') {
    // Show each month of the year
    for (let m = 0; m < 12; m++) {
      const mStart = new Date(year, m, 1)
      const mEnd = new Date(year, m + 1, 0, 23, 59, 59)

      const mSales = salesOrders
        .filter(o => o.orderDate >= mStart && o.orderDate <= mEnd)
        .reduce((s, o) => s + o.grandTotal, 0)
      const mCollected = billCollections
        .filter(b => b.collectDate >= mStart && b.collectDate <= mEnd)
        .reduce((s, b) => s + b.amount, 0)
      const mExpense = expenses
        .filter(e => e.expenseDate >= mStart && e.expenseDate <= mEnd)
        .reduce((s, e) => s + e.amount, 0)
      const mIncome = incomes
        .filter(i => i.incomeDate >= mStart && i.incomeDate <= mEnd)
        .reduce((s, i) => s + i.amount, 0)
      const mPayable = payablePayments
        .filter(p => p.payDate >= mStart && p.payDate <= mEnd)
        .reduce((s, p) => s + p.amount, 0)

      totalSales += mSales
      totalCollected += mCollected
      totalExpense += mExpense
      totalOtherIncome += mIncome
      totalPayablePaid += mPayable

      const netProfit = (mCollected + mIncome) - mExpense - mPayable
      rows.push({
        label: `${getMonthName(m)} ${year}`,
        sales: mSales,
        collected: mCollected,
        expense: mExpense,
        otherIncome: mIncome,
        payablePaid: mPayable,
        netProfit
      })
    }
  } else if (period === 'daily') {
    // Show each day of the month
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    for (let d = 1; d <= daysInMonth; d++) {
      const dStart = new Date(year, month, d, 0, 0, 0)
      const dEnd = new Date(year, month, d, 23, 59, 59)

      const dSales = salesOrders
        .filter(o => o.orderDate >= dStart && o.orderDate <= dEnd)
        .reduce((s, o) => s + o.grandTotal, 0)
      const dCollected = billCollections
        .filter(b => b.collectDate >= dStart && b.collectDate <= dEnd)
        .reduce((s, b) => s + b.amount, 0)
      const dExpense = expenses
        .filter(e => e.expenseDate >= dStart && e.expenseDate <= dEnd)
        .reduce((s, e) => s + e.amount, 0)
      const dIncome = incomes
        .filter(i => i.incomeDate >= dStart && i.incomeDate <= dEnd)
        .reduce((s, i) => s + i.amount, 0)
      const dPayable = payablePayments
        .filter(p => p.payDate >= dStart && p.payDate <= dEnd)
        .reduce((s, p) => s + p.amount, 0)

      totalSales += dSales
      totalCollected += dCollected
      totalExpense += dExpense
      totalOtherIncome += dIncome
      totalPayablePaid += dPayable

      const netProfit = (dCollected + dIncome) - dExpense - dPayable
      if (dSales > 0 || dCollected > 0 || dExpense > 0 || dIncome > 0 || dPayable > 0) {
        rows.push({
          label: `${String(d).padStart(2, '0')} ${getMonthName(month)} ${year}`,
          sales: dSales,
          collected: dCollected,
          expense: dExpense,
          otherIncome: dIncome,
          payablePaid: dPayable,
          netProfit
        })
      }
    }
  } else {
    // yearly - single row summary
    totalSales = salesOrders.reduce((s, o) => s + o.grandTotal, 0)
    totalCollected = billCollections.reduce((s, b) => s + b.amount, 0)
    totalExpense = expenses.reduce((s, e) => s + e.amount, 0)
    totalOtherIncome = incomes.reduce((s, i) => s + i.amount, 0)
    totalPayablePaid = payablePayments.reduce((s, p) => s + p.amount, 0)
    rows.push({
      label: `Year ${year}`,
      sales: totalSales,
      collected: totalCollected,
      expense: totalExpense,
      otherIncome: totalOtherIncome,
      payablePaid: totalPayablePaid,
      netProfit: (totalCollected + totalOtherIncome) - totalExpense - totalPayablePaid
    })
  }

  return NextResponse.json({
    period,
    year,
    month,
    rows,
    totals: {
      sales: totalSales,
      collected: totalCollected,
      expense: totalExpense,
      otherIncome: totalOtherIncome,
      payablePaid: totalPayablePaid,
      netProfit: (totalCollected + totalOtherIncome) - totalExpense - totalPayablePaid
    }
  })
}
