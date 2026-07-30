import { NextResponse } from 'next/server'
import { _getClient as getClient } from '@/lib/db'

/**
 * One-time migration:
 * 1. Create IncomeHead table for production.
 * 2. Add incomeHeadId column to Income table.
 * Safe to call multiple times — idempotent.
 */
export async function GET() {
  const results: any = { timestamp: new Date().toISOString(), steps: [] }
  const client = getClient()

  // Step 1: Create IncomeHead table
  try {
    await client.execute(`CREATE TABLE IF NOT EXISTS "IncomeHead" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "name" TEXT NOT NULL UNIQUE,
      "description" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )`)
    results.steps.push({ step: 'create IncomeHead table', ok: true })
  } catch (err: any) {
    results.steps.push({ step: 'create IncomeHead table', ok: false, error: err.message || String(err) })
  }

  // Step 2: Add incomeHeadId column to Income table
  try {
    await client.execute(`ALTER TABLE "Income" ADD COLUMN "incomeHeadId" TEXT`)
    results.steps.push({ step: 'add incomeHeadId column to Income', ok: true })
  } catch (err: any) {
    const msg = err.message || String(err)
    if (msg.includes('duplicate column') || msg.includes('already exists')) {
      results.steps.push({ step: 'add incomeHeadId column to Income', ok: true, skipped: 'already exists' })
    } else {
      results.steps.push({ step: 'add incomeHeadId column to Income', ok: false, error: msg })
    }
  }

  return NextResponse.json(results)
}

