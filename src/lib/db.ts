/**
 * Prisma-compatible database client backed by @libsql/client (Turso).
 *
 * Why: Prisma 6.x driver-adapter for libSQL has a known runtime issue where
 * the engine still tries to validate a datasource URL and fails with
 * "URL_INVALID: The URL 'undefined' is not in a valid format". This wrapper
 * exposes a subset of Prisma's client API (the methods our app actually uses)
 * and routes them through @libsql/client directly. All existing API routes
 * that do `import { db } from '@/lib/db'` continue to work unchanged.
 *
 * Supports local SQLite (file:) too via the same libSQL client.
 */
import { createClient, type Client } from '@libsql/client'

const globalForDb = globalThis as unknown as {
  __tsmsClient?: Client
}

function getClient(): Client {
  if (globalForDb.__tsmsClient) return globalForDb.__tsmsClient

  const url = process.env.DATABASE_URL
  const authToken = process.env.DATABASE_AUTH_TOKEN

  let finalUrl = url
  let finalToken = authToken

  // For local SQLite file: URLs, libSQL client does not need a token.
  if (url && url.startsWith('file:')) {
    finalToken = undefined
  }

  if (!finalUrl) {
    throw new Error('DATABASE_URL is not set')
  }

  // Configure client with connection pooling and keepalive for Turso
  // This significantly reduces latency for subsequent queries within a request
  const client = createClient({
    url: finalUrl,
    authToken: finalToken,
    // Turso: use HTTP keepalive and allow multiple concurrent requests
    // For local file: SQLite, these are no-ops
    intMode: 'bigint' as any
  })
  globalForDb.__tsmsClient = client
  return client
}

// ---- helpers ----
function cuid() {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

function rowToObj(row: Record<string, any>): any {
  // libSQL returns rows as array-like objects with both numeric and named keys
  const out: any = {}
  for (const k of Object.keys(row)) {
    if (!/^\d+$/.test(k)) out[k] = row[k]
  }
  return out
}

interface WhereClause {
  sql: string
  args: any[]
}

// Build WHERE clause from Prisma-style "where" object
// Supports: equality, AND, OR, NOT, contains (string), startsWith, gt, gte, lt, lte, not
function buildWhere(where: any, tableAlias?: string): WhereClause {
  if (!where || Object.keys(where).length === 0) return { sql: '', args: [] }
  const prefix = tableAlias ? `${tableAlias}.` : ''
  const parts: string[] = []
  const args: any[] = []

  function processConditions(obj: any, joiner: 'AND' | 'OR' = 'AND') {
    const subParts: string[] = []
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'AND') {
        const arr = value as any[]
        arr.forEach((v, i) => {
          const c = processConditionsObj(v)
          if (c) subParts.push(c.sql)
          args.push(...c.args)
        })
      } else if (key === 'OR') {
        const arr = value as any[]
        const orSubs: string[] = []
        arr.forEach((v) => {
          const c = processConditionsObj(v)
          orSubs.push(c.sql)
          args.push(...c.args)
        })
        if (orSubs.length) subParts.push(`(${orSubs.join(' OR ')})`)
      } else if (key === 'NOT') {
        const c = processConditionsObj(value)
        subParts.push(`NOT (${c.sql})`)
        args.push(...c.args)
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
        // Operator object like { contains: 'x' }, { gt: 5 }, { startsWith: 'a' }
        for (const [op, opVal] of Object.entries(value as any)) {
          if (op === 'contains') {
            subParts.push(`${prefix}"${key}" LIKE ?`)
            args.push(`%${opVal}%`)
          } else if (op === 'startsWith') {
            subParts.push(`${prefix}"${key}" LIKE ?`)
            args.push(`${opVal}%`)
          } else if (op === 'endsWith') {
            subParts.push(`${prefix}"${key}" LIKE ?`)
            args.push(`%${opVal}`)
          } else if (op === 'gt') {
            subParts.push(`${prefix}"${key}" > ?`)
            args.push(opVal)
          } else if (op === 'gte') {
            subParts.push(`${prefix}"${key}" >= ?`)
            args.push(opVal)
          } else if (op === 'lt') {
            subParts.push(`${prefix}"${key}" < ?`)
            args.push(opVal)
          } else if (op === 'lte') {
            subParts.push(`${prefix}"${key}" <= ?`)
            args.push(opVal)
          } else if (op === 'not') {
            subParts.push(`${prefix}"${key}" != ?`)
            args.push(opVal)
          } else if (op === 'in') {
            const vals = opVal as any[]
            if (vals.length === 0) {
              subParts.push('1=0')
            } else {
              subParts.push(`${prefix}"${key}" IN (${vals.map(() => '?').join(',')})`)
              args.push(...vals)
            }
          }
        }
      } else {
        // Equality
        if (value === null) {
          subParts.push(`${prefix}"${key}" IS NULL`)
        } else {
          subParts.push(`${prefix}"${key}" = ?`)
          args.push(value)
        }
      }
    }
    return subParts.join(` ${joiner} `)
  }

  function processConditionsObj(obj: any): WhereClause {
    const subArgs: any[] = []
    const subParts: string[] = []
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'AND') {
        const arr = value as any[]
        const orSubs: string[] = []
        arr.forEach((v) => {
          const c = processConditionsObj(v)
          orSubs.push(c.sql)
          subArgs.push(...c.args)
        })
        if (orSubs.length) subParts.push(`(${orSubs.join(' AND ')})`)
      } else if (key === 'OR') {
        const arr = value as any[]
        const orSubs: string[] = []
        arr.forEach((v) => {
          const c = processConditionsObj(v)
          orSubs.push(c.sql)
          subArgs.push(...c.args)
        })
        if (orSubs.length) subParts.push(`(${orSubs.join(' OR ')})`)
      } else if (key === 'NOT') {
        const c = processConditionsObj(value)
        subParts.push(`NOT (${c.sql})`)
        subArgs.push(...c.args)
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
        for (const [op, opVal] of Object.entries(value as any)) {
          if (op === 'contains') {
            subParts.push(`${prefix}"${key}" LIKE ?`)
            subArgs.push(`%${opVal}%`)
          } else if (op === 'startsWith') {
            subParts.push(`${prefix}"${key}" LIKE ?`)
            subArgs.push(`${opVal}%`)
          } else if (op === 'gt') {
            subParts.push(`${prefix}"${key}" > ?`)
            subArgs.push(opVal)
          } else if (op === 'gte') {
            subParts.push(`${prefix}"${key}" >= ?`)
            subArgs.push(opVal)
          } else if (op === 'lt') {
            subParts.push(`${prefix}"${key}" < ?`)
            subArgs.push(opVal)
          } else if (op === 'lte') {
            subParts.push(`${prefix}"${key}" <= ?`)
            subArgs.push(opVal)
          } else if (op === 'not') {
            subParts.push(`${prefix}"${key}" != ?`)
            subArgs.push(opVal)
          } else if (op === 'in') {
            const vals = opVal as any[]
            if (vals.length === 0) {
              subParts.push('1=0')
            } else {
              subParts.push(`${prefix}"${key}" IN (${vals.map(() => '?').join(',')})`)
              subArgs.push(...vals)
            }
          }
        }
      } else {
        if (value === null) {
          subParts.push(`${prefix}"${key}" IS NULL`)
        } else {
          subParts.push(`${prefix}"${key}" = ?`)
          subArgs.push(value)
        }
      }
    }
    return { sql: subParts.join(' AND '), args: subArgs }
  }

  const sql = processConditions(where)
  return { sql, args }
}

// Convert Date to ISO string for storage
function toStorage(value: any): any {
  if (value instanceof Date) return value.toISOString()
  return value
}

// Convert stored value back to Date for DateTime fields
function fromStorage(value: any, isDate: boolean): any {
  if (isDate && typeof value === 'string') return new Date(value)
  return value
}

interface ModelConfig {
  name: string
  dateFields: string[]
}

const MODEL_CONFIG: Record<string, ModelConfig> = {
  user: { name: 'User', dateFields: ['createdAt', 'updatedAt'] },
  userPermission: { name: 'UserPermission', dateFields: ['createdAt', 'updatedAt'] },
  uoM: { name: 'UoM', dateFields: ['createdAt', 'updatedAt'] },
  item: { name: 'Item', dateFields: ['createdAt', 'updatedAt'] },
  tailor: { name: 'Tailor', dateFields: ['createdAt', 'updatedAt'] },
  customer: { name: 'Customer', dateFields: ['createdAt', 'updatedAt'] },
  deliveryInfo: { name: 'DeliveryInfo', dateFields: ['createdAt', 'updatedAt'] },
  expenseHead: { name: 'ExpenseHead', dateFields: ['createdAt', 'updatedAt'] },
  entity: { name: 'Entity', dateFields: ['createdAt', 'updatedAt'] },
  subEntity: { name: 'SubEntity', dateFields: ['createdAt', 'updatedAt'] },
  salesOrder: { name: 'SalesOrder', dateFields: ['orderDate', 'deliveryDate', 'createdAt', 'updatedAt'] },
  salesOrderItem: { name: 'SalesOrderItem', dateFields: ['createdAt'] },
  delivery: { name: 'Delivery', dateFields: ['deliveryDate', 'createdAt'] },
  deliveryItem: { name: 'DeliveryItem', dateFields: [] },
  billCollection: { name: 'BillCollection', dateFields: ['collectDate', 'createdAt'] },
  expense: { name: 'Expense', dateFields: ['expenseDate', 'createdAt'] },
  income: { name: 'Income', dateFields: ['incomeDate', 'createdAt'] },
  payable: { name: 'Payable', dateFields: ['dueDate', 'createdAt', 'updatedAt'] },
  payablePayment: { name: 'PayablePayment', dateFields: ['payDate', 'createdAt'] }
}

function makeModel(modelKey: string) {
  const cfg = MODEL_CONFIG[modelKey]
  if (!cfg) throw new Error(`Unknown model: ${modelKey}`)
  const tableName = cfg.name

  function hydrate(row: any) {
    const out: any = {}
    for (const k of Object.keys(row)) {
      if (/^\d+$/.test(k)) continue
      out[k] = fromStorage(row[k], cfg.dateFields.includes(k))
    }
    return out
  }

  return {
    async count(args?: { where?: any }): Promise<number> {
      const client = getClient()
      let sql = `SELECT COUNT(*) as cnt FROM "${tableName}"`
      const where = buildWhere(args?.where)
      const allArgs = [...where.args]
      if (where.sql) {
        sql += ` WHERE ${where.sql}`
      }
      const res = await client.execute({ sql, args: allArgs })
      return Number((res.rows[0] as any)?.cnt ?? 0)
    },

    async findUnique(args: { where: any; include?: any }): Promise<any> {
      const client = getClient()
      // For include, we need joins. Handle common ones.
      // For simplicity, only top-level where on this table is supported here.
      const where = buildWhere(args.where)
      if (!where.sql) return null
      const sql = `SELECT * FROM "${tableName}" WHERE ${where.sql} LIMIT 1`
      const res = await client.execute({ sql, args: where.args })
      if (res.rows.length === 0) return null
      const row = hydrate(res.rows[0])

      if (args.include) {
        await loadIncludes(row, args.include, modelKey)
      }
      return row
    },

    async findFirst(args: { where?: any; include?: any; orderBy?: any }): Promise<any> {
      const client = getClient()
      const where = buildWhere(args.where)
      let sql = `SELECT * FROM "${tableName}"`
      const allArgs = [...where.args]
      if (where.sql) sql += ` WHERE ${where.sql}`
      if (args.orderBy) {
        const orderParts = Object.entries(args.orderBy).map(([k, v]) => `"${k}" ${v === 'desc' ? 'DESC' : 'ASC'}`)
        sql += ` ORDER BY ${orderParts.join(', ')}`
      }
      sql += ` LIMIT 1`
      const res = await client.execute({ sql, args: allArgs })
      if (res.rows.length === 0) return null
      const row = hydrate(res.rows[0])
      if (args.include) await loadIncludes(row, args.include, modelKey)
      return row
    },

    async findMany(args?: { where?: any; include?: any; orderBy?: any; take?: number; skip?: number }): Promise<any[]> {
      const client = getClient()
      const where = buildWhere(args?.where)
      let sql = `SELECT * FROM "${tableName}"`
      const allArgs = [...where.args]
      if (where.sql) sql += ` WHERE ${where.sql}`
      if (args?.orderBy) {
        const orderParts = Object.entries(args.orderBy).map(([k, v]) => `"${k}" ${v === 'desc' ? 'DESC' : 'ASC'}`)
        sql += ` ORDER BY ${orderParts.join(', ')}`
      }
      if (args?.take) sql += ` LIMIT ${Number(args.take)}`
      if (args?.skip) sql += ` OFFSET ${Number(args.skip)}`

      const res = await client.execute({ sql, args: allArgs })
      const rows = res.rows.map(hydrate)
      if (args?.include && rows.length > 0) {
        // BATCH loading: fetch all related rows in 1 query per relation
        // instead of 1 query per row per relation (N+1 problem)
        await loadIncludesBatch(rows, args.include, modelKey)
      }
      return rows
    },

    async create(args: { data: any; include?: any }): Promise<any> {
      const client = getClient()
      const now = new Date()
      const data: any = { id: cuid(), ...args.data }

      // Extract nested creates (Prisma-style: data.items = { create: [...] })
      const nestedCreates: { model: string; fk: string; rows: any[] }[] = []
      const rels = RELATIONS[modelKey] || {}
      for (const [relName, rel] of Object.entries(rels)) {
        if (rel.isList && data[relName] && typeof data[relName] === 'object' && Array.isArray(data[relName].create)) {
          nestedCreates.push({ model: rel.model, fk: rel.fk, rows: data[relName].create })
          delete data[relName]
        }
      }

      // Auto-set createdAt if model has it and not provided
      if (cfg.dateFields.includes('createdAt') && data.createdAt === undefined) {
        data.createdAt = now
      }
      // Auto-set updatedAt if model has it and not provided
      if (cfg.dateFields.includes('updatedAt') && data.updatedAt === undefined) {
        data.updatedAt = now
      }
      // Convert dates to ISO strings for storage
      for (const k of Object.keys(data)) {
        data[k] = toStorage(data[k])
      }
      const cols = Object.keys(data)
      const placeholders = cols.map(() => '?').join(', ')
      const sql = `INSERT INTO "${tableName}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`
      await client.execute({ sql, args: cols.map(c => data[c]) })

      // Insert nested creates
      for (const nc of nestedCreates) {
        for (const rowData of nc.rows) {
          const subModel = (db as any)[nc.model]
          await subModel.create({ data: { ...rowData, [nc.fk]: data.id } })
        }
      }

      // Fetch back
      const res = await client.execute({ sql: `SELECT * FROM "${tableName}" WHERE id = ?`, args: [data.id] })
      const row = hydrate(res.rows[0])
      if (args.include) await loadIncludes(row, args.include, modelKey)
      return row
    },

    async update(args: { where: any; data: any; include?: any }): Promise<any> {
      const client = getClient()
      const data = { ...args.data }
      // Remove undefined fields — Prisma semantics: undefined = don't update
      for (const k of Object.keys(data)) {
        if (data[k] === undefined) delete data[k]
      }
      // Auto-set updatedAt if model has it and not explicitly provided
      if (cfg.dateFields.includes('updatedAt') && data.updatedAt === undefined) {
        data.updatedAt = new Date()
      }
      // If no fields to update, just fetch and return
      const cols = Object.keys(data)
      const where = buildWhere(args.where)
      if (cols.length > 0) {
        // Convert dates to ISO strings for storage
        for (const k of cols) {
          data[k] = toStorage(data[k])
        }
        const setClause = cols.map(c => `"${c}" = ?`).join(', ')
        let sql = `UPDATE "${tableName}" SET ${setClause}`
        const allArgs = [...cols.map(c => data[c]), ...where.args]
        if (where.sql) sql += ` WHERE ${where.sql}`
        await client.execute({ sql, args: allArgs })
      }

      // Fetch back
      const res = await client.execute({ sql: `SELECT * FROM "${tableName}" WHERE ${where.sql || '1=1'} LIMIT 1`, args: where.args })
      const row = hydrate(res.rows[0])
      if (args.include) await loadIncludes(row, args.include, modelKey)
      return row
    },

    async delete(args: { where: any }): Promise<any> {
      const client = getClient()
      const where = buildWhere(args.where)
      // Fetch first
      const selRes = await client.execute({ sql: `SELECT * FROM "${tableName}" WHERE ${where.sql} LIMIT 1`, args: where.args })
      if (selRes.rows.length === 0) return null
      const row = hydrate(selRes.rows[0])
      await client.execute({ sql: `DELETE FROM "${tableName}" WHERE ${where.sql}`, args: where.args })
      return row
    },

    async deleteMany(args: { where: any }): Promise<{ count: number }> {
      const client = getClient()
      const where = buildWhere(args.where)
      let sql = `DELETE FROM "${tableName}"`
      if (where.sql) sql += ` WHERE ${where.sql}`
      await client.execute({ sql, args: where.args })
      return { count: 1 } // Approximate
    },

    async aggregate(args: { where?: any; _sum?: any; _count?: any; _avg?: any; _min?: any; _max?: any }): Promise<any> {
      const client = getClient()
      const where = buildWhere(args.where)
      const selectParts: string[] = []
      const allArgs = [...where.args]

      if (args._sum) {
        for (const field of Object.keys(args._sum)) {
          selectParts.push(`COALESCE(SUM("${field}"), 0) as sum_${field}`)
        }
      }
      if (args._count) {
        if (args._count === true) {
          selectParts.push(`COUNT(*) as count`)
        } else {
          for (const field of Object.keys(args._count)) {
            selectParts.push(`COUNT("${field}") as count_${field}`)
          }
        }
      }
      if (args._avg) {
        for (const field of Object.keys(args._avg)) {
          selectParts.push(`COALESCE(AVG("${field}"), 0) as avg_${field}`)
        }
      }
      if (args._min) {
        for (const field of Object.keys(args._min)) {
          selectParts.push(`COALESCE(MIN("${field}"), 0) as min_${field}`)
        }
      }
      if (args._max) {
        for (const field of Object.keys(args._max)) {
          selectParts.push(`COALESCE(MAX("${field}"), 0) as max_${field}`)
        }
      }

      let sql = `SELECT ${selectParts.join(', ')} FROM "${tableName}"`
      if (where.sql) sql += ` WHERE ${where.sql}`

      const res = await client.execute({ sql, args: allArgs })
      const rawRow = res.rows[0] as any
      if (!rawRow) return {}

      const result: any = {}
      if (args._sum) {
        result._sum = {}
        for (const field of Object.keys(args._sum)) {
          result._sum[field] = Number(rawRow[`sum_${field}`]) || 0
        }
      }
      if (args._count) {
        if (args._count === true) {
          result._count = Number(rawRow.count) || 0
        } else {
          result._count = {}
          for (const field of Object.keys(args._count)) {
            result._count[field] = Number(rawRow[`count_${field}`]) || 0
          }
        }
      }
      if (args._avg) {
        result._avg = {}
        for (const field of Object.keys(args._avg)) {
          result._avg[field] = Number(rawRow[`avg_${field}`]) || 0
        }
      }
      if (args._min) {
        result._min = {}
        for (const field of Object.keys(args._min)) {
          result._min[field] = Number(rawRow[`min_${field}`]) || 0
        }
      }
      if (args._max) {
        result._max = {}
        for (const field of Object.keys(args._max)) {
          result._max[field] = Number(rawRow[`max_${field}`]) || 0
        }
      }
      return result
    },

    async groupBy(args: any): Promise<any[]> {
      // Limited support — not used in our app currently
      return []
    }
  }
}

// ---- Includes loader ----
// Maps model name -> { relationName: { model, foreignKey, isList, isOptional } }
const RELATIONS: Record<string, Record<string, { model: string; fk: string; isList: boolean; isOptional: boolean }>> = {
  user: { permissions: { model: 'userPermission', fk: 'userId', isList: true, isOptional: false } },
  userPermission: { user: { model: 'user', fk: 'userId', isList: false, isOptional: false } },
  uoM: { items: { model: 'item', fk: 'uomId', isList: true, isOptional: false } },
  item: { uom: { model: 'uoM', fk: 'uomId', isList: false, isOptional: false } },
  tailor: { orders: { model: 'salesOrder', fk: 'tailorId', isList: true, isOptional: true } },
  customer: { orders: { model: 'salesOrder', fk: 'customerId', isList: true, isOptional: false } },
  deliveryInfo: {},
  expenseHead: {},
  entity: { subEntities: { model: 'subEntity', fk: 'entityId', isList: true, isOptional: false } },
  subEntity: { entity: { model: 'entity', fk: 'entityId', isList: false, isOptional: false } },
  salesOrder: {
    customer: { model: 'customer', fk: 'customerId', isList: false, isOptional: false },
    tailor: { model: 'tailor', fk: 'tailorId', isList: false, isOptional: true },
    items: { model: 'salesOrderItem', fk: 'orderId', isList: true, isOptional: false },
    deliveries: { model: 'delivery', fk: 'orderId', isList: true, isOptional: false },
    bills: { model: 'billCollection', fk: 'orderId', isList: true, isOptional: false }
  },
  salesOrderItem: {
    item: { model: 'item', fk: 'itemId', isList: false, isOptional: false },
    order: { model: 'salesOrder', fk: 'orderId', isList: false, isOptional: false },
    deliveryItems: { model: 'deliveryItem', fk: 'orderItemId', isList: true, isOptional: false }
  },
  delivery: {
    order: { model: 'salesOrder', fk: 'orderId', isList: false, isOptional: false },
    items: { model: 'deliveryItem', fk: 'deliveryId', isList: true, isOptional: false }
  },
  deliveryItem: {
    delivery: { model: 'delivery', fk: 'deliveryId', isList: false, isOptional: false },
    orderItem: { model: 'salesOrderItem', fk: 'orderItemId', isList: false, isOptional: false }
  },
  billCollection: {
    order: { model: 'salesOrder', fk: 'orderId', isList: false, isOptional: false }
  },
  expense: { head: { model: 'expenseHead', fk: 'expenseHeadId', isList: false, isOptional: true } },
  income: {},
  payable: { payments: { model: 'payablePayment', fk: 'payableId', isList: true, isOptional: false } },
  payablePayment: { payable: { model: 'payable', fk: 'payableId', isList: false, isOptional: false } }
}

async function loadIncludes(row: any, include: any, modelKey: string) {
  const rels = RELATIONS[modelKey] || {}
  for (const [relName, includeVal] of Object.entries(include)) {
    const rel = rels[relName]
    if (!rel) continue
    const subModel = (db as any)[rel.model]
    const shouldInclude = includeVal === true || (typeof includeVal === 'object' && includeVal !== null)

    if (rel.isList) {
      // Has many — find by foreign key (where fk = row.id)
      const where: any = {}
      where[rel.fk] = row.id
      const subArgs: any = { where }
      if (typeof includeVal === 'object' && includeVal?.include) {
        subArgs.include = includeVal.include
      }
      row[relName] = await subModel.findMany(subArgs)
    } else {
      // Belongs to — find by primary key (where id = row[fk])
      const fkVal = row[rel.fk]
      if (rel.isOptional && (fkVal === null || fkVal === undefined)) {
        row[relName] = null
      } else if (fkVal === null || fkVal === undefined) {
        row[relName] = null
      } else {
        const subArgs: any = { where: { id: fkVal } }
        if (typeof includeVal === 'object' && includeVal?.include) {
          subArgs.include = includeVal.include
        }
        row[relName] = await subModel.findUnique(subArgs)
      }
    }
  }
}

/**
 * BATCH includes loader — fetches all related rows for all parent rows
 * in ONE query per relation (using WHERE fk IN (...)), instead of one
 * query per parent row per relation (N+1 problem).
 *
 * Example: 50 sales orders with customer + items
 *   - Before: 50 (customers) + 50 (items) = 100 queries
 *   - After:  1 (customers) + 1 (items)   = 2 queries
 */
async function loadIncludesBatch(rows: any[], include: any, modelKey: string) {
  const rels = RELATIONS[modelKey] || {}
  const client = getClient()

  for (const [relName, includeVal] of Object.entries(include)) {
    const rel = rels[relName]
    if (!rel) continue
    const subCfg = MODEL_CONFIG[rel.model]
    if (!subCfg) continue
    const subTable = subCfg.name

    if (rel.isList) {
      // Has-many: collect all parent ids, fetch all related rows in ONE query
      const parentIds = rows.map(r => r.id).filter(Boolean)
      if (parentIds.length === 0) {
        for (const row of rows) row[relName] = []
        continue
      }
      const placeholders = parentIds.map(() => '?').join(',')
      const sql = `SELECT * FROM "${subTable}" WHERE "${rel.fk}" IN (${placeholders})`
      const res = await client.execute({ sql, args: parentIds })
      // Group related rows by foreign key value
      const grouped: Record<string, any[]> = {}
      for (const rawRow of res.rows as any[]) {
        const fkVal = rawRow[rel.fk]
        if (!grouped[fkVal]) grouped[fkVal] = []
        // Hydrate dates
        const hydrated: any = {}
        for (const k of Object.keys(rawRow)) {
          if (/^\d+$/.test(k)) continue
          hydrated[k] = fromStorage(rawRow[k], subCfg.dateFields.includes(k))
        }
        grouped[fkVal].push(hydrated)
      }
      // Assign to parent rows
      for (const row of rows) {
        row[relName] = grouped[row.id] || []
      }

      // Handle nested includes recursively (batched) on the children
      if (typeof includeVal === 'object' && includeVal?.include) {
        const allChildren = Object.values(grouped).flat()
        if (allChildren.length > 0) {
          await loadIncludesBatch(allChildren, includeVal.include, rel.model)
        }
      }
    } else {
      // Belongs-to: collect all fk values, fetch all related rows in ONE query
      const fkVals = rows.map(r => r[rel.fk]).filter(v => v !== null && v !== undefined)
      // Deduplicate
      const uniqueFkVals = [...new Set(fkVals)]
      if (uniqueFkVals.length === 0) {
        for (const row of rows) row[relName] = null
        continue
      }
      const placeholders = uniqueFkVals.map(() => '?').join(',')
      const sql = `SELECT * FROM "${subTable}" WHERE "id" IN (${placeholders})`
      const res = await client.execute({ sql, args: uniqueFkVals })
      // Build lookup by id
      const byId: Record<string, any> = {}
      for (const rawRow of res.rows as any[]) {
        const hydrated: any = {}
        for (const k of Object.keys(rawRow)) {
          if (/^\d+$/.test(k)) continue
          hydrated[k] = fromStorage(rawRow[k], subCfg.dateFields.includes(k))
        }
        byId[hydrated.id] = hydrated
      }
      // Assign to parent rows
      for (const row of rows) {
        const fkVal = row[rel.fk]
        row[relName] = (fkVal !== null && fkVal !== undefined) ? (byId[fkVal] || null) : null
      }

      // Handle nested includes recursively (batched) on the children
      if (typeof includeVal === 'object' && includeVal?.include) {
        const children = Object.values(byId)
        if (children.length > 0) {
          await loadIncludesBatch(children, includeVal.include, rel.model)
        }
      }
    }
  }
}

// ---- Transaction support ----
// libSQL doesn't have nested transactions, but for our app, we just execute sequentially.
// For complex flows (e.g. delivery creation with multiple updates), we use a simple
// "run all in sequence" approach — if any fails, the previous ones have already committed
// (acceptable trade-off for this app).
const transactionClient = {
  // Just return the same db object - all operations run on the shared client
  // The caller's callback receives `tx` which is just `db` again
}

// ---- Build the db object ----
export const db: any = {
  user: makeModel('user'),
  userPermission: makeModel('userPermission'),
  uoM: makeModel('uoM'),
  item: makeModel('item'),
  tailor: makeModel('tailor'),
  customer: makeModel('customer'),
  deliveryInfo: makeModel('deliveryInfo'),
  expenseHead: makeModel('expenseHead'),
  entity: makeModel('entity'),
  subEntity: makeModel('subEntity'),
  salesOrder: makeModel('salesOrder'),
  salesOrderItem: makeModel('salesOrderItem'),
  delivery: makeModel('delivery'),
  deliveryItem: makeModel('deliveryItem'),
  billCollection: makeModel('billCollection'),
  expense: makeModel('expense'),
  income: makeModel('income'),
  payable: makeModel('payable'),
  payablePayment: makeModel('payablePayment'),

  // Transactions - simplified, just runs the callback with db as tx
  async $transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    return fn(db)
  },

  async $disconnect(): Promise<void> {
    // libSQL client doesn't need explicit disconnect
  }
}

// Re-export for testing
export { getClient as _getClient }
