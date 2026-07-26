import { createClient } from '@libsql/client'

const DATABASE_URL = process.env.DATABASE_URL!
const DATABASE_AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN!

if (!DATABASE_URL || !DATABASE_URL.startsWith('libsql:')) {
  console.error('DATABASE_URL must be a libsql:// URL')
  process.exit(1)
}

const client = createClient({
  url: DATABASE_URL,
  authToken: DATABASE_AUTH_TOKEN
})

// DDL statements (SQLite syntax, compatible with libSQL/Turso)
const statements = [
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "username" TEXT NOT NULL UNIQUE,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS "UoM" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "name" TEXT NOT NULL UNIQUE,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS "Item" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "name" TEXT NOT NULL,
    "uomId" TEXT NOT NULL,
    "unitPrice" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("uomId") REFERENCES "UoM"("id") ON UPDATE CASCADE ON DELETE RESTRICT
  )`,

  `CREATE TABLE IF NOT EXISTS "Tailor" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS "Customer" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL UNIQUE,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS "DeliveryInfo" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "label" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS "SalesOrder" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "orderId" TEXT NOT NULL UNIQUE,
    "orderDate" DATETIME NOT NULL,
    "deliveryDate" DATETIME,
    "tailorId" TEXT,
    "customerId" TEXT NOT NULL,
    "salesNote" TEXT,
    "deliveryInfo" TEXT,
    "subTotal" REAL NOT NULL DEFAULT 0,
    "discount" REAL NOT NULL DEFAULT 0,
    "grandTotal" REAL NOT NULL DEFAULT 0,
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "dueAmount" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'full_pending',
    "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("tailorId") REFERENCES "Tailor"("id") ON UPDATE CASCADE ON DELETE SET NULL,
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON UPDATE CASCADE ON DELETE RESTRICT
  )`,

  `CREATE TABLE IF NOT EXISTS "SalesOrderItem" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "orderId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "qty" REAL NOT NULL DEFAULT 0,
    "uom" TEXT NOT NULL,
    "unitPrice" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL DEFAULT 0,
    "deliveredQty" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("orderId") REFERENCES "SalesOrder"("id") ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON UPDATE CASCADE ON DELETE RESTRICT
  )`,

  `CREATE TABLE IF NOT EXISTS "Delivery" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "deliveryId" TEXT NOT NULL UNIQUE,
    "orderId" TEXT NOT NULL,
    "deliveryDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("orderId") REFERENCES "SalesOrder"("id") ON UPDATE CASCADE ON DELETE RESTRICT
  )`,

  `CREATE TABLE IF NOT EXISTS "DeliveryItem" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "qty" REAL NOT NULL DEFAULT 0,
    FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY ("orderItemId") REFERENCES "SalesOrderItem"("id") ON UPDATE CASCADE ON DELETE RESTRICT
  )`,

  `CREATE TABLE IF NOT EXISTS "BillCollection" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "billId" TEXT NOT NULL UNIQUE,
    "orderId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "collectDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL DEFAULT 'cash',
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("orderId") REFERENCES "SalesOrder"("id") ON UPDATE CASCADE ON DELETE RESTRICT
  )`,

  `CREATE TABLE IF NOT EXISTS "Expense" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "amount" REAL NOT NULL,
    "expenseDate" DATETIME NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS "Income" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "amount" REAL NOT NULL,
    "incomeDate" DATETIME NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS "Payable" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "payableId" TEXT NOT NULL UNIQUE,
    "partyName" TEXT NOT NULL,
    "description" TEXT,
    "amount" REAL NOT NULL,
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS "PayablePayment" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "payableId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "payDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("payableId") REFERENCES "Payable"("id") ON UPDATE CASCADE ON DELETE CASCADE
  )`
]

async function main() {
  console.log('Pushing schema to Turso...')
  console.log('URL:', DATABASE_URL)

  for (const sql of statements) {
    try {
      await client.execute(sql)
      const tableName = sql.match(/CREATE TABLE IF NOT EXISTS "(\w+)"/)?.[1] || 'unknown'
      console.log(`  ✓ ${tableName}`)
    } catch (err: any) {
      console.error('  ✗ Error:', err.message)
      console.error('  SQL:', sql.substring(0, 100) + '...')
      throw err
    }
  }

  // Create indexes for performance
  console.log('\nCreating indexes...')
  const indexes = [
    `CREATE INDEX IF NOT EXISTS "idx_user_username" ON "User"("username")`,
    `CREATE INDEX IF NOT EXISTS "idx_customer_phone" ON "Customer"("phone")`,
    `CREATE INDEX IF NOT EXISTS "idx_salesOrder_orderId" ON "SalesOrder"("orderId")`,
    `CREATE INDEX IF NOT EXISTS "idx_salesOrder_customerId" ON "SalesOrder"("customerId")`,
    `CREATE INDEX IF NOT EXISTS "idx_salesOrder_tailorId" ON "SalesOrder"("tailorId")`,
    `CREATE INDEX IF NOT EXISTS "idx_salesOrder_status" ON "SalesOrder"("status")`,
    `CREATE INDEX IF NOT EXISTS "idx_salesOrder_orderDate" ON "SalesOrder"("orderDate")`,
    `CREATE INDEX IF NOT EXISTS "idx_salesOrder_createdAt" ON "SalesOrder"("createdAt" DESC)`,
    `CREATE INDEX IF NOT EXISTS "idx_salesOrderItem_orderId" ON "SalesOrderItem"("orderId")`,
    `CREATE INDEX IF NOT EXISTS "idx_salesOrderItem_itemId" ON "SalesOrderItem"("itemId")`,
    `CREATE INDEX IF NOT EXISTS "idx_delivery_orderId" ON "Delivery"("orderId")`,
    `CREATE INDEX IF NOT EXISTS "idx_delivery_deliveryId" ON "Delivery"("deliveryId")`,
    `CREATE INDEX IF NOT EXISTS "idx_deliveryItem_deliveryId" ON "DeliveryItem"("deliveryId")`,
    `CREATE INDEX IF NOT EXISTS "idx_deliveryItem_orderItemId" ON "DeliveryItem"("orderItemId")`,
    `CREATE INDEX IF NOT EXISTS "idx_billCollection_orderId" ON "BillCollection"("orderId")`,
    `CREATE INDEX IF NOT EXISTS "idx_billCollection_collectDate" ON "BillCollection"("collectDate")`,
    `CREATE INDEX IF NOT EXISTS "idx_expense_expenseDate" ON "Expense"("expenseDate")`,
    `CREATE INDEX IF NOT EXISTS "idx_income_incomeDate" ON "Income"("incomeDate")`,
    `CREATE INDEX IF NOT EXISTS "idx_payablePayment_payableId" ON "PayablePayment"("payableId")`,
    `CREATE INDEX IF NOT EXISTS "idx_payable_status" ON "Payable"("status")`
  ]

  for (const sql of indexes) {
    try {
      await client.execute(sql)
      const idxName = sql.match(/"(\w+)" ON/)?.[1] || 'unknown'
      console.log(`  ✓ ${idxName}`)
    } catch (err: any) {
      console.error(`  ✗ Index error: ${err.message}`)
    }
  }

  // Insert admin user if not exists
  console.log('\nSeeding admin user...')
  try {
    const existing = await client.execute({
      sql: 'SELECT id FROM "User" WHERE username = ?',
      args: ['admin']
    })
    if (existing.rows.length === 0) {
      // Generate a cuid-like ID
      const id = 'c' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
      await client.execute({
        sql: 'INSERT INTO "User" (id, username, password, name, role, "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
        args: [id, 'admin', 'admin123', 'Administrator', 'admin']
      })
      console.log('  ✓ Admin user created (admin / admin123)')
    } else {
      console.log('  ✓ Admin user already exists')
    }
  } catch (err: any) {
    console.error('  ✗ Seed error:', err.message)
  }

  console.log('\n✅ Schema pushed successfully to Turso!')
}

main().catch(err => {
  console.error('\n❌ Failed:', err.message)
  process.exit(1)
})
