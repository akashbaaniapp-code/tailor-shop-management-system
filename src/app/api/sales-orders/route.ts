import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { numberToWords, generateOrderId } from '@/lib/utils-server'
import { _getClient } from '@/lib/db'
import { getEntityContext, buildEntityFilter } from '@/lib/entity-context'

export const revalidate = 0

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status')

  // Get entity context for filtering
  const ctx = await getEntityContext(request)

  // Direct SQL with JOINs — much faster than nested includes
  const client = _getClient()

  let sql = `SELECT
              so.*,
              c.name as "customer.name",
              c.phone as "customer.phone",
              c.address as "customer.address",
              t.name as "tailor.name",
              t.phone as "tailor.phone"
            FROM "SalesOrder" so
            LEFT JOIN "Customer" c ON c.id = so.customerId
            LEFT JOIN "Tailor" t ON t.id = so.tailorId`

  const conditions: string[] = []
  const args: any[] = []

  if (search) {
    conditions.push(`(so.orderId LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)`)
    args.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }
  if (status && status !== 'all') {
    conditions.push(`so.status = ?`)
    args.push(status)
  }

  // Entity filter — only show transactions for the user's entity
  const entityFilter = buildEntityFilter(ctx, 'so')
  if (entityFilter.sql) {
    conditions.push(entityFilter.sql)
    args.push(...entityFilter.args)
  }

  if (conditions.length > 0) {
    sql += ` WHERE ` + conditions.join(' AND ')
  }

  sql += ` ORDER BY so.createdAt DESC LIMIT 200`

  const res = await client.execute({ sql, args })

  // Transform flat rows (with dotted keys) into nested objects
  const dateFields = ['orderDate', 'deliveryDate', 'createdAt', 'updatedAt']
  const orders = res.rows.map((raw: any) => {
    const order: any = {}
    const customer: any = {}
    const tailor: any = {}
    for (const k of Object.keys(raw)) {
      if (/^\d+$/.test(k)) continue
      const val = dateFields.includes(k) && typeof raw[k] === 'string' ? new Date(raw[k]) : raw[k]
      if (k.startsWith('customer.')) customer[k.slice('customer.'.length)] = raw[k]
      else if (k.startsWith('tailor.')) tailor[k.slice('tailor.'.length)] = raw[k]
      else order[k] = val
    }
    order.customer = customer
    order.tailor = tailor.id ? tailor : (order.tailorId ? tailor : null)
    return order
  })

  // BATCH load items + nested item.uom for all orders in a single HTTP round-trip.
  // (Vercel USA ↔ Turso Mumbai: each round trip costs ~250ms.)
  if (orders.length > 0) {
    const orderIds = orders.map(o => o.id)
    const placeholders = orderIds.map(() => '?').join(',')

    // Get all SalesOrderItem rows for these orders (single query)
    const itemsRes = await client.execute({
      sql: `SELECT soi.*, i.name as "item.name", i.unitPrice as "item.unitPrice",
                   i.uomId as "item.uomId", u.name as "item.uom.name", u.id as "item.uom.id"
            FROM "SalesOrderItem" soi
            INNER JOIN "Item" i ON i.id = soi.itemId
            INNER JOIN "UoM" u ON u.id = i.uomId
            WHERE soi.orderId IN (${placeholders})`,
      args: orderIds
    })

    // Group items by orderId
    const itemsByOrder: Record<string, any[]> = {}
    for (const raw of itemsRes.rows as any[]) {
      const orderId = raw.orderId
      if (!itemsByOrder[orderId]) itemsByOrder[orderId] = []
      const item: any = {}
      const itemData: any = { uom: {} }
      for (const k of Object.keys(raw)) {
        if (/^\d+$/.test(k)) continue
        if (k.startsWith('item.uom.')) {
          itemData.uom[k.slice('item.uom.'.length)] = raw[k]
        } else if (k.startsWith('item.')) {
          itemData[k.slice('item.'.length)] = raw[k]
        } else {
          item[k] = k === 'createdAt' && typeof raw[k] === 'string' ? new Date(raw[k]) : raw[k]
        }
      }
      item.item = itemData
      itemsByOrder[orderId].push(item)
    }

    // Assign items to orders
    for (const order of orders) {
      order.items = itemsByOrder[order.id] || []
    }
  }

  const response = NextResponse.json({ orders })
  response.headers.set('Cache-Control', 'no-store')
  return response
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response

  const body = await request.json()
  const {
    orderDate,
    deliveryDate,
    tailorId,
    customerId,
    salesNote,
    deliveryInfo,
    deliveryName,
    deliveryContact,
    deliveryAddress,
    items,
    discount
  } = body

  if (!customerId || !orderDate) {
    return NextResponse.json({ error: 'Customer and order date required' }, { status: 400 })
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'At least one item required' }, { status: 400 })
  }

  // Get entity context — tag this transaction with the user's entity
  const ctx = await getEntityContext(request)

  // Generate auto order ID
  const today = new Date()
  const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
  const todayCount = await db.salesOrder.count({
    where: {
      orderId: { startsWith: `SO-${ymd}` }
    }
  })
  const orderId = await generateOrderId('SO', todayCount)

  // Calculate totals
  const subTotal = items.reduce((sum: number, it: any) => sum + (Number(it.total) || 0), 0)
  const discountAmount = Number(discount) || 0
  const grandTotal = subTotal - discountAmount

  // Create sales order first (items will be inserted in a single batch for speed)
  const order = await db.salesOrder.create({
    data: {
      orderId,
      orderDate: new Date(orderDate),
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
      tailorId: tailorId || null,
      customerId,
      salesNote: salesNote || null,
      deliveryInfo: deliveryInfo || null,
      deliveryName: deliveryName || null,
      deliveryContact: deliveryContact || null,
      deliveryAddress: deliveryAddress || null,
      subTotal,
      discount: discountAmount,
      grandTotal,
      dueAmount: grandTotal,
      status: 'full_pending',
      paymentStatus: 'unpaid',
      entityId: ctx.entityId,
      subEntityId: ctx.subEntityId
    }
  })

  // Batch-insert all line items in a single round-trip (much faster than sequential create)
  let savedItems: any[] = []
  if (items.length > 0) {
    const { _getClient } = await import('@/lib/db')
    const client = _getClient()
    const now = new Date().toISOString()
    const rowsToInsert = items.map((it: any) => {
      const id = crypto.randomUUID()
      const qtyFeet = it.qtyFeet !== undefined && it.qtyFeet !== null && it.qtyFeet !== '' ? Number(it.qtyFeet) : null
      const qtyPiece = it.qtyPiece !== undefined && it.qtyPiece !== null && it.qtyPiece !== '' ? Number(it.qtyPiece) : null
      return {
        id,
        itemId: it.itemId,
        qty: Number(it.qty) || 0,
        qtyFeet,
        qtyPiece,
        uom: it.uom,
        unitPrice: Number(it.unitPrice) || 0,
        total: Number(it.total) || 0,
        deliveredQty: 0
      }
    })
    const stmts = rowsToInsert.map((r) => ({
      sql: `INSERT INTO "SalesOrderItem" (id, orderId, itemId, qty, qtyFeet, qtyPiece, uom, unitPrice, total, deliveredQty, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      args: [r.id, order.id, r.itemId, r.qty, r.qtyFeet, r.qtyPiece, r.uom, r.unitPrice, r.total, now]
    }))
    await client.batch(stmts)
    savedItems = rowsToInsert
  }

  // Build response order without an extra DB round-trip.
  // We already have the order object from create() and the items we just inserted;
  // we just need to attach customer/tailor/item names for printing.
  const [customer, tailor, dbItemsLookup] = await Promise.all([
    db.customer.findUnique({ where: { id: customerId } }),
    tailorId ? db.tailor.findUnique({ where: { id: tailorId } }) : Promise.resolve(null),
    // Fetch all items in a single query (instead of one-per-item)
    db.item.findMany({ where: { id: { in: savedItems.map((r: any) => r.itemId) } }, include: { uom: true } })
  ])

  // Build items array in the same shape the client expects for invoice printing
  const itemsForResponse = savedItems.map((r: any) => {
    const dbItem = dbItemsLookup.find((i: any) => i.id === r.itemId)
    return {
      ...r,
      item: dbItem ? { name: dbItem.name, uom: dbItem.uom } : { name: '', uom: { name: r.uom } }
    }
  })

  const orderWithItems = {
    ...order,
    customer,
    tailor,
    items: itemsForResponse,
    deliveries: [],
    bills: []
  }

  const inWords = numberToWords(grandTotal)

  return NextResponse.json({ order: orderWithItems, inWords })
}
