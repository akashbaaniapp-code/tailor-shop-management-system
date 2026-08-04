import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { getEntityContext, buildEntityWhere } from '@/lib/entity-context'

/**
 * Stock Records API
 *
 * GET: Returns all stock records for a given date (or date range).
 *      For each item that has NO record on the requested date, we auto-create
 *      a "virtual" record whose `opening` is the closing of the most recent
 *      previous record for that item (auto-carry).
 *
 * POST: Creates or updates a stock record for a specific item + date.
 *       - If a record already exists for (itemId, recordDate), it's updated.
 *       - `closing` is auto-calculated: opening + received - outQty - wasted.
 *       - After saving, the NEXT day's record (if it exists) gets its `opening`
 *         updated to match this record's `closing` (cascade update).
 *
 * DELETE: Deletes a stock record by id.
 */

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

  const ctx = await getEntityContext(request)
  const entityWhere = buildEntityWhere(ctx)

  // Fetch all stock records for this date
  const records = await db.stockRecord.findMany({
    where: { ...entityWhere, recordDate: new Date(date + 'T00:00:00') },
    include: { item: { include: { uom: true } } },
    orderBy: { createdAt: 'asc' as const },
  })

  // Fetch all items (entity-scoped) so we can show entries for items
  // that don't have a record yet on this date
  const allItems = await db.item.findMany({
    where: entityWhere,
    include: { uom: true },
    orderBy: { name: 'asc' as const },
  })

  // Build a map of itemId → record
  const recordMap: Record<string, any> = {}
  for (const r of records) {
    recordMap[r.itemId] = r
  }

  // For items without a record on this date, find the most recent closing
  // from a previous date to use as the auto-carry opening.
  const itemsNeedingCarry = allItems.filter((it: any) => !recordMap[it.id])
  if (itemsNeedingCarry.length > 0) {
    // Fetch the latest record before this date for each item
    const beforeDate = new Date(date + 'T00:00:00')
    for (const item of itemsNeedingCarry) {
      const prevRecords = await db.stockRecord.findMany({
        where: {
          ...entityWhere,
          itemId: item.id,
          recordDate: { lt: beforeDate },
        },
        orderBy: { recordDate: 'desc' as const },
        take: 1,
      })
      const prevClosing = prevRecords.length > 0 ? Number(prevRecords[0].closing) || 0 : 0
      // Create a virtual record (not saved to DB, just for display)
      recordMap[item.id] = {
        id: null, // null means "virtual" — not yet saved
        itemId: item.id,
        item,
        recordDate: date,
        opening: prevClosing,
        received: 0,
        outQty: 0,
        wasted: 0,
        closing: prevClosing, // closing = opening when no transactions
        note: null,
        virtual: true,
      }
    }
  }

  // Build final list in item-name order
  const result = allItems.map((it: any) => recordMap[it.id]).filter(Boolean)

  return NextResponse.json({ items: result, date })
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response

  const body = await request.json()
  const { id, itemId, recordDate, received, outQty, wasted, closing, note } = body

  if (!itemId || !recordDate) {
    return NextResponse.json({ error: 'Item and date required' }, { status: 400 })
  }

  const ctx = await getEntityContext(request)
  const entityWhere = buildEntityWhere(ctx)

  // Find existing record for this item + date (or previous closing for opening)
  const dateObj = new Date(recordDate + 'T00:00:00')

  // Check if a record already exists for this item + date
  const existing = await db.stockRecord.findMany({
    where: { ...entityWhere, itemId, recordDate: dateObj },
    take: 1,
  })

  // Determine opening: if existing record, use its opening; otherwise find previous closing
  let opening = 0
  if (existing.length > 0 && existing[0].id !== id) {
    // There's already a record for this date — update it
    opening = Number(existing[0].opening) || 0
  } else {
    // Find previous day's closing
    const prevRecords = await db.stockRecord.findMany({
      where: {
        ...entityWhere,
        itemId,
        recordDate: { lt: dateObj },
      },
      orderBy: { recordDate: 'desc' as const },
      take: 1,
    })
    opening = prevRecords.length > 0 ? Number(prevRecords[0].closing) || 0 : 0
  }

  // Auto-calculate closing if not provided
  const receivedNum = Number(received) || 0
  const outNum = Number(outQty) || 0
  const wastedNum = Number(wasted) || 0
  const closingNum = closing !== undefined && closing !== null && closing !== ''
    ? Number(closing)
    : opening + receivedNum - outNum - wastedNum

  const recordId = id || (existing.length > 0 ? existing[0].id : null)

  if (recordId) {
    // Update existing
    const updated = await db.stockRecord.update({
      where: { id: recordId },
      data: {
        opening,
        received: receivedNum,
        outQty: outNum,
        wasted: wastedNum,
        closing: closingNum,
        note: note || null,
      },
    })

    // Cascade: update next day's opening to match this closing
    await updateNextDayOpening(itemId, dateObj, closingNum, entityWhere)

    return NextResponse.json({ item: updated })
  } else {
    // Create new
    const created = await db.stockRecord.create({
      data: {
        itemId,
        recordDate: dateObj,
        opening,
        received: receivedNum,
        outQty: outNum,
        wasted: wastedNum,
        closing: closingNum,
        note: note || null,
        entityId: ctx.entityId,
        subEntityId: ctx.subEntityId,
      },
    })

    // Cascade: update next day's opening
    await updateNextDayOpening(itemId, dateObj, closingNum, entityWhere)

    return NextResponse.json({ item: created })
  }
}

/**
 * Helper: Find the next day's stock record for this item and update its opening
 * to match the current record's closing. This ensures the chain stays consistent.
 */
async function updateNextDayOpening(itemId: string, currentDate: Date, closing: number, entityWhere: any) {
  const nextDay = new Date(currentDate)
  nextDay.setDate(nextDay.getDate() + 1)

  const nextRecords = await db.stockRecord.findMany({
    where: {
      ...entityWhere,
      itemId,
      recordDate: { gte: nextDay },
    },
    orderBy: { recordDate: 'asc' as const },
    take: 1,
  })

  if (nextRecords.length > 0) {
    const next = nextRecords[0]
    const newOpening = closing
    const newClosing = newOpening + Number(next.received) - Number(next.outQty) - Number(next.wasted)
    await db.stockRecord.update({
      where: { id: next.id },
      data: {
        opening: newOpening,
        closing: newClosing,
      },
    })

    // Recursively cascade to the day after next
    await updateNextDayOpening(itemId, new Date(next.recordDate), newClosing, entityWhere)
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.response) return auth.response
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  await db.stockRecord.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
