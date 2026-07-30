import { NextResponse } from 'next/server'
import { _getClient as getClient } from '@/lib/db'

/**
 * One-time migration: add entityId and subEntityId columns to all setup/master data tables
 * that are missing entity isolation. This ensures data from one entity doesn't show
 * in another entity.
 *
 * Tables being updated:
 * - ExpenseHead, IncomeHead, DepositHead
 * - Item, Tailor, Customer, DeliveryInfo
 *
 * UoM is intentionally NOT entity-scoped (Piece, Meter, Feet are universal).
 */
export async function GET() {
  const results: any = { timestamp: new Date().toISOString(), steps: [] }
  const client = getClient()

  const tables = [
    'ExpenseHead',
    'IncomeHead',
    'DepositHead',
    'Item',
    'Tailor',
    'Customer',
    'DeliveryInfo',
  ]

  for (const table of tables) {
    // Add entityId
    try {
      await client.execute(`ALTER TABLE "${table}" ADD COLUMN "entityId" TEXT`)
      results.steps.push({ step: `add entityId to ${table}`, ok: true })
    } catch (err: any) {
      const msg = err.message || String(err)
      if (msg.includes('duplicate column') || msg.includes('already exists')) {
        results.steps.push({ step: `add entityId to ${table}`, ok: true, skipped: 'already exists' })
      } else {
        results.steps.push({ step: `add entityId to ${table}`, ok: false, error: msg })
      }
    }

    // Add subEntityId
    try {
      await client.execute(`ALTER TABLE "${table}" ADD COLUMN "subEntityId" TEXT`)
      results.steps.push({ step: `add subEntityId to ${table}`, ok: true })
    } catch (err: any) {
      const msg = err.message || String(err)
      if (msg.includes('duplicate column') || msg.includes('already exists')) {
        results.steps.push({ step: `add subEntityId to ${table}`, ok: true, skipped: 'already exists' })
      } else {
        results.steps.push({ step: `add subEntityId to ${table}`, ok: false, error: msg })
      }
    }
  }

  return NextResponse.json(results)
}
