import { NextResponse } from 'next/server'
import { _getClient as getClient } from '@/lib/db'

/**
 * One-time migration: add qtyFeet and qtyPiece columns to SalesOrderItem table.
 * Safe to call multiple times — ignores "duplicate column" errors.
 * After successful run on production, this endpoint can be removed.
 */
export async function GET() {
  const results: any = { timestamp: new Date().toISOString(), steps: [] }
  const client = getClient()

  // Step 1: add qtyFeet
  try {
    await client.execute(`ALTER TABLE "SalesOrderItem" ADD COLUMN "qtyFeet" REAL`)
    results.steps.push({ step: 'add qtyFeet', ok: true })
  } catch (err: any) {
    const msg = err.message || String(err)
    if (msg.includes('duplicate column') || msg.includes('already exists')) {
      results.steps.push({ step: 'add qtyFeet', ok: true, skipped: 'already exists' })
    } else {
      results.steps.push({ step: 'add qtyFeet', ok: false, error: msg })
    }
  }

  // Step 2: add qtyPiece
  try {
    await client.execute(`ALTER TABLE "SalesOrderItem" ADD COLUMN "qtyPiece" REAL`)
    results.steps.push({ step: 'add qtyPiece', ok: true })
  } catch (err: any) {
    const msg = err.message || String(err)
    if (msg.includes('duplicate column') || msg.includes('already exists')) {
      results.steps.push({ step: 'add qtyPiece', ok: true, skipped: 'already exists' })
    } else {
      results.steps.push({ step: 'add qtyPiece', ok: false, error: msg })
    }
  }

  return NextResponse.json(results)
}
