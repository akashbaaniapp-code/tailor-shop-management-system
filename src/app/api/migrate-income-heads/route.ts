import { NextResponse } from 'next/server'
import { _getClient as getClient } from '@/lib/db'

/**
 * One-time migration: create IncomeHead table for production.
 * Safe to call multiple times — uses CREATE TABLE IF NOT EXISTS.
 */
export async function GET() {
  const results: any = { timestamp: new Date().toISOString(), steps: [] }
  const client = getClient()

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

  return NextResponse.json(results)
}
