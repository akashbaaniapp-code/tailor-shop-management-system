import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { getEntityContext, buildEntityWhere } from '@/lib/entity-context'
import { generateOrderId } from '@/lib/utils-server'

// GET — list all money receipts (with optional filters)
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const search = searchParams.get('search') || ''

  const ctx = await getEntityContext(request)
  const entityWhere = buildEntityWhere(ctx)

  let where: any = { ...entityWhere }
  if (from || to) {
    where.receiptDate = {}
    if (from) where.receiptDate.gte = new Date(from)
    if (to) where.receiptDate.lte = new Date(to)
  }
  if (search) {
    where.OR = [
      { receiptId: { contains: search } },
      { customerName: { contains: search } },
      { customerPhone: { contains: search } }
    ]
  }

  const receipts = await db.moneyReceipt.findMany({
    where,
    orderBy: { receiptDate: 'desc' },
    take: 200
  })

  // For each receipt, fetch its bill collections
  const receiptsBills = await Promise.all(
    receipts.map(async (r: any) => {
      const bills = await db.billCollection.findMany({
        where: { moneyReceiptId: r.id },
        include: { order: { include: { customer: true } } }
      })
      return { ...r, bills }
    })
  )

  return NextResponse.json({ receipts: receiptsBills })
}

// POST — create a money receipt that groups multiple bill collections
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response

  const body = await request.json()
  const { billIds, method, note, receiptDate } = body

  if (!billIds || !Array.isArray(billIds) || billIds.length === 0) {
    return NextResponse.json({ error: 'At least one bill ID required' }, { status: 400 })
  }

  // Fetch all bill collections
  const bills = await Promise.all(
    billIds.map((id: string) => db.billCollection.findUnique({
      where: { id },
      include: { order: { include: { customer: true } } }
    }))
  )

  // Validate all bills exist
  if (bills.some(b => !b)) {
    return NextResponse.json({ error: 'One or more bills not found' }, { status: 400 })
  }

  // Get customer info from first bill's order
  const firstBill = bills[0] as any
  const customer = firstBill.order?.customer
  if (!customer) {
    return NextResponse.json({ error: 'Customer not found on bills' }, { status: 400 })
  }

  // Verify all bills belong to the same customer
  const customerIds = new Set(bills.map((b: any) => b.order?.customerId))
  if (customerIds.size > 1) {
    return NextResponse.json({ error: 'All bills must belong to the same customer' }, { status: 400 })
  }

  // Calculate total
  const totalAmount = bills.reduce((sum: number, b: any) => sum + Number(b.amount), 0)

  // Get entity context
  const ctx = await getEntityContext(request)

  // Generate receipt ID
  const today = new Date()
  const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
  const todayCount = await db.moneyReceipt.count({
    where: { receiptId: { startsWith: `MR-${ymd}` } }
  })
  const receiptId = await generateOrderId('MR', todayCount)

  // Create money receipt
  const receipt = await db.moneyReceipt.create({
    data: {
      receiptId,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: customer.address || null,
      receiptDate: receiptDate ? new Date(receiptDate) : new Date(),
      totalAmount,
      method: method || 'cash',
      note: note || null,
      entityId: ctx.entityId,
      subEntityId: ctx.subEntityId
    }
  })

  // Link all bill collections to this receipt
  for (const billId of billIds) {
    await db.billCollection.update({
      where: { id: billId },
      data: { moneyReceiptId: receipt.id }
    })
  }

  // Fetch the receipt with bills for the response
  const bills2 = await db.billCollection.findMany({
    where: { moneyReceiptId: receipt.id },
    include: { order: { include: { customer: true } } }
  })

  return NextResponse.json({ receipt: { ...receipt, bills: bills2 } })
}
