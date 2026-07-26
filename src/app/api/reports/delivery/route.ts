import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getEntityContext, buildEntityFilter } from '@/lib/entity-context'
import { _getClient } from '@/lib/db'

export const revalidate = 60

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const status = searchParams.get('status')
    const search = searchParams.get('search') || ''

    const ctx = await getEntityContext(request)
    const client = _getClient()

  // Build the main query — one big JOIN that gets everything:
  // Order + Customer + Tailor + each item in the order + how much was delivered
  const conditions: string[] = []
  const args: any[] = []

  if (from) {
    conditions.push('so.orderDate >= ?')
    args.push(new Date(from).toISOString())
  }
  if (to) {
    conditions.push('so.orderDate <= ?')
    args.push(new Date(to).toISOString())
  }
  if (status && status !== 'all') {
    conditions.push('so.status = ?')
    args.push(status)
  }
  if (search) {
    conditions.push('(so.orderId LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)')
    args.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }

  // Entity filter
  const entityFilter = buildEntityFilter(ctx, 'so')
  if (entityFilter.sql) {
    conditions.push(entityFilter.sql)
    args.push(...entityFilter.args)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Query 1: Order summary with customer + tailor + item counts
  const ordersRes = await client.execute({
    sql: `SELECT
            so.id, so.orderId, so.orderDate, so.deliveryDate,
            so.status, so.paymentStatus, so.grandTotal,
            so.deliveryName, so.deliveryContact, so.deliveryAddress,
            c.name as "customer.name", c.phone as "customer.phone", c.address as "customer.address",
            t.name as "tailor.name",
            (SELECT COUNT(*) FROM "SalesOrderItem" soi WHERE soi.orderId = so.id) as itemCount,
            (SELECT COALESCE(SUM(qty), 0) FROM "SalesOrderItem" soi WHERE soi.orderId = so.id) as totalOrderedQty,
            (SELECT COALESCE(SUM(deliveredQty), 0) FROM "SalesOrderItem" soi WHERE soi.orderId = so.id) as totalDeliveredQty,
            (SELECT COUNT(*) FROM "Delivery" d WHERE d.orderId = so.id) as deliveryCount
          FROM "SalesOrder" so
          LEFT JOIN "Customer" c ON c.id = so.customerId
          LEFT JOIN "Tailor" t ON t.id = so.tailorId
          ${whereClause}
          ORDER BY so.orderDate DESC
          LIMIT 200`,
    args
  })

  // Transform flat rows into nested objects
  // Convert BigInt values to Number to avoid JSON serialization errors
  const orders = ordersRes.rows.map((raw: any) => {
    const order: any = {}
    const customer: any = {}
    const tailor: any = {}
    for (const k of Object.keys(raw)) {
      if (/^\d+$/.test(k)) continue
      // Convert BigInt to Number (libSQL returns BigInt for COUNT/SUM)
      let val = raw[k]
      if (typeof val === 'bigint') val = Number(val)
      if (k.startsWith('customer.')) {
        customer[k.slice('customer.'.length)] = val
      } else if (k.startsWith('tailor.')) {
        tailor[k.slice('tailor.'.length)] = val
      } else {
        order[k] = val
      }
    }
    order.customer = customer
    order.tailor = tailor.name ? tailor : null
    order.totalRemainingQty = Number(order.totalOrderedQty || 0) - Number(order.totalDeliveredQty || 0)
    return order
  })

  // Query 2: If we have orders, fetch all their items + deliveries in ONE batch query
  let itemsByOrder: Record<string, any[]> = {}
  let deliveriesByOrder: Record<string, any[]> = {}

  if (orders.length > 0) {
    const orderIds = orders.map(o => o.id)

    // Items with their delivered quantities
    const placeholders = orderIds.map(() => '?').join(',')
    const itemsRes = await client.execute({
      sql: `SELECT
              soi.id, soi.orderId, soi.qty, soi.uom, soi.unitPrice, soi.total,
              soi.deliveredQty,
              i.name as "item.name",
              (soi.qty - soi.deliveredQty) as remainingQty
            FROM "SalesOrderItem" soi
            INNER JOIN "Item" i ON i.id = soi.itemId
            WHERE soi.orderId IN (${placeholders})
            ORDER BY soi.createdAt ASC`,
      args: orderIds
    })

    for (const raw of itemsRes.rows as any[]) {
      const orderId = raw.orderId
      if (!itemsByOrder[orderId]) itemsByOrder[orderId] = []
      const item: any = {}
      for (const k of Object.keys(raw)) {
        if (/^\d+$/.test(k)) continue
        let val = raw[k]
        if (typeof val === 'bigint') val = Number(val)
        if (k.startsWith('item.')) {
          if (!item.item) item.item = {}
          item.item[k.slice('item.'.length)] = val
        } else {
          item[k] = val
        }
      }
      itemsByOrder[orderId].push(item)
    }

    // Deliveries with their items
    const deliveriesRes = await client.execute({
      sql: `SELECT
              d.id, d.deliveryId, d.orderId, d.deliveryDate, d.note,
              di.qty as "di.qty",
              i.name as "di.item.name"
            FROM "Delivery" d
            LEFT JOIN "DeliveryItem" di ON di.deliveryId = d.id
            LEFT JOIN "SalesOrderItem" soi ON soi.id = di.orderItemId
            LEFT JOIN "Item" i ON i.id = soi.itemId
            WHERE d.orderId IN (${placeholders})
            ORDER BY d.deliveryDate DESC, d.createdAt DESC`,
      args: orderIds
    })

    for (const raw of deliveriesRes.rows as any[]) {
      const orderId = raw.orderId
      if (!deliveriesByOrder[orderId]) deliveriesByOrder[orderId] = []
      // Find or create delivery entry
      let del = deliveriesByOrder[orderId].find(d => d.id === raw.id)
      if (!del) {
        del = {
          id: raw.id,
          deliveryId: raw.deliveryId,
          orderId: raw.orderId,
          deliveryDate: raw.deliveryDate,
          note: raw.note,
          items: []
        }
        deliveriesByOrder[orderId].push(del)
      }
      // Add delivery item if exists (convert BigInt qty to Number)
      const diQty = raw['di.qty']
      if (diQty !== null && diQty !== undefined) {
        del.items.push({
          qty: typeof diQty === 'bigint' ? Number(diQty) : diQty,
          itemName: raw['di.item.name']
        })
      }
    }
  }

  // Attach items + deliveries to each order
  for (const order of orders) {
    order.items = itemsByOrder[order.id] || []
    order.deliveries = deliveriesByOrder[order.id] || []
  }

  // Compute summary
  const totalOrders = orders.length
  const totalDelivered = orders.filter(o => o.status === 'full_delivered').length
  const totalPartial = orders.filter(o => o.status === 'partial_pending').length
  const totalPending = orders.filter(o => o.status === 'full_pending').length
  const totalClosed = orders.filter(o => o.status === 'closed').length
  const totalDeliveredQty = orders.reduce((s, o) => s + Number(o.totalDeliveredQty || 0), 0)
  const totalRemainingQty = orders.reduce((s, o) => s + Number(o.totalRemainingQty || 0), 0)
  const totalDeliveries = orders.reduce((s, o) => s + Number(o.deliveryCount || 0), 0)

  const response = NextResponse.json({
    orders,
    summary: {
      totalOrders,
      totalDelivered,
      totalPartial,
      totalPending,
      totalClosed,
      totalDeliveredQty,
      totalRemainingQty,
      totalDeliveries
    }
  })
  response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60')
  return response

  } catch (err: any) {
    console.error('Delivery report error:', err)
    return NextResponse.json(
      { error: 'Failed to load delivery report', detail: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
