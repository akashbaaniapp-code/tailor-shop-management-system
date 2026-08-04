import { NextResponse } from 'next/server'
import { _getClient as getClient } from '@/lib/db'

/**
 * One-time migration: create DepositHead, Bank, and Deposit tables.
 * Safe to call multiple times — uses CREATE TABLE IF NOT EXISTS.
 */
export async function GET() {
  const results: any = { timestamp: new Date().toISOString(), steps: [] }
  const client = getClient()

  const tables = [
    {
      step: 'create DepositHead table',
      sql: `CREATE TABLE IF NOT EXISTS "DepositHead" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "name" TEXT NOT NULL UNIQUE,
        "description" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      )`
    },
    {
      step: 'create Bank table',
      sql: `CREATE TABLE IF NOT EXISTS "Bank" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "bankName" TEXT NOT NULL,
        "bankTitle" TEXT,
        "accountNumber" TEXT,
        "branch" TEXT,
        "description" TEXT,
        "entityId" TEXT,
        "subEntityId" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      )`
    },
    {
      step: 'create Deposit table',
      sql: `CREATE TABLE IF NOT EXISTS "Deposit" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "title" TEXT NOT NULL,
        "amount" REAL NOT NULL,
        "depositDate" DATETIME NOT NULL,
        "bankId" TEXT,
        "depositHeadId" TEXT,
        "note" TEXT,
        "entityId" TEXT,
        "subEntityId" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("bankId") REFERENCES "Bank"("id") ON UPDATE CASCADE ON DELETE SET NULL,
        FOREIGN KEY ("depositHeadId") REFERENCES "DepositHead"("id") ON UPDATE CASCADE ON DELETE SET NULL
      )`
    },
    {
      step: 'create OpeningBalance table',
      sql: `CREATE TABLE IF NOT EXISTS "OpeningBalance" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "label" TEXT NOT NULL,
        "amount" REAL NOT NULL DEFAULT 0,
        "asOfDate" DATETIME NOT NULL,
        "note" TEXT,
        "entityId" TEXT,
        "subEntityId" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      )`
    },
  ]

  for (const t of tables) {
    try {
      await client.execute(t.sql)
      results.steps.push({ step: t.step, ok: true })
    } catch (err: any) {
      results.steps.push({ step: t.step, ok: false, error: err.message || String(err) })
    }
  }

  return NextResponse.json(results)
}
