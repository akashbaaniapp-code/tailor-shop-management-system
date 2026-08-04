import { NextResponse } from 'next/server'
import { _getClient as getClient } from '@/lib/db'

/**
 * One-time migration: create StockRecord table.
 */
export async function GET() {
  const results: any = { timestamp: new Date().toISOString(), steps: [] }
  const client = getClient()

  try {
    await client.execute(`CREATE TABLE IF NOT EXISTS "StockRecord" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "itemId" TEXT NOT NULL,
      "recordDate" DATETIME NOT NULL,
      "opening" REAL NOT NULL DEFAULT 0,
      "received" REAL NOT NULL DEFAULT 0,
      "outQty" REAL NOT NULL DEFAULT 0,
      "wasted" REAL NOT NULL DEFAULT 0,
      "closing" REAL NOT NULL DEFAULT 0,
      "note" TEXT,
      "entityId" TEXT,
      "subEntityId" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON UPDATE CASCADE ON DELETE CASCADE
    )`)
    results.steps.push({ step: 'create StockRecord table', ok: true })
  } catch (err: any) {
    results.steps.push({ step: 'create StockRecord table', ok: false, error: err.message || String(err) })
  }

  return NextResponse.json(results)
}
