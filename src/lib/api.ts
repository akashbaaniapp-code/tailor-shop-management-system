// Frontend API client — optimized for speed with multi-tier caching

const TOKEN_KEY = 'tsms_token'
const USER_KEY = 'tsms_user'

// Multi-tier cache:
// - Setup data (UoM, items, tailors, etc.): 5 minutes — changes rarely
// - Transaction data (orders, deliveries, bills): 30 seconds — changes often
// - Report data (dashboard, P&L): 60 seconds — heavy queries
// - All cached responses serve stale data immediately while refreshing in background
const cache = new Map<string, { data: any; expires: number; refreshing?: boolean }>()

// Path-based TTL configuration
function getCacheTTL(path: string): number {
  // Setup data — long cache (5 min)
  if (path.includes('/api/uom') || path.includes('/api/items') ||
      path.includes('/api/tailors') || path.includes('/api/customers') ||
      path.includes('/api/expense-heads') || path.includes('/api/delivery-info') ||
      path.includes('/api/entities') || path.includes('/api/sub-entities')) {
    return 5 * 60 * 1000 // 5 minutes
  }
  // Reports — medium cache (60s)
  if (path.includes('/api/reports/')) {
    return 60 * 1000 // 60 seconds
  }
  // Transaction data — short cache (30s)
  return 30 * 1000 // 30 seconds
}

// In-flight request deduplication — if the same URL is requested twice
// within 2 seconds, both callers get the same Promise (1 network request)
const inflightRequests = new Map<string, Promise<any>>()

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  cache.clear()
  inflightRequests.clear()
}

export function setUser(user: any) {
  if (typeof window === 'undefined') return
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getUser(): any | null {
  if (typeof window === 'undefined') return null
  const u = localStorage.getItem(USER_KEY)
  return u ? JSON.parse(u) : null
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // Attach entity context headers
  if (typeof window !== 'undefined') {
    const entityCtx = (window as any).__entityContext
    if (entityCtx) {
      if (entityCtx.entityId) headers['X-Entity-Id'] = entityCtx.entityId
      if (entityCtx.subEntityId) headers['X-Sub-Entity-Id'] = entityCtx.subEntityId
    }
  }

  const method = (options.method || 'GET').toUpperCase()

  // ===== CACHE CHECK (GET only) =====
  if (method === 'GET') {
    const cached = cache.get(path)
    if (cached) {
      if (cached.expires > Date.now()) {
        // Fresh cache — return immediately (0ms latency)
        return cached.data as T
      }
      // Stale cache — return immediately AND refresh in background
      // (stale-while-revalidate pattern)
      if (!cached.refreshing) {
        cached.refreshing = true
        // Fire-and-forget background refresh
        doFetch(path, headers).then(data => {
          cache.set(path, { data, expires: Date.now() + getCacheTTL(path) })
        }).catch(() => {}).finally(() => {
          if (cached) cached.refreshing = false
        })
      }
      return cached.data as T
    }

    // ===== REQUEST DEDUPLICATION =====
    // If this URL is already being fetched, wait for the same Promise
    const inflight = inflightRequests.get(path)
    if (inflight) {
      return inflight as Promise<T>
    }
  }

  // ===== ACTUAL FETCH =====
  if (method === 'GET') {
    const promise = doFetch<T>(path, headers)
    inflightRequests.set(path, promise)
    try {
      const data = await promise
      // Cache the result
      cache.set(path, { data, expires: Date.now() + getCacheTTL(path) })
      return data
    } finally {
      inflightRequests.delete(path)
    }
  } else {
    // Non-GET: just fetch
    const data = await doFetch<T>(path, headers, options)
    // Invalidate cache entries that match the path prefix
    const basePath = path.split('?')[0]
    for (const key of cache.keys()) {
      if (key.startsWith(basePath)) {
        cache.delete(key)
      }
    }
    return data
  }
}

// Internal fetch function
async function doFetch<T>(path: string, headers: Record<string, string>, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string> || {}) }
  })
  if (res.status === 401) {
    clearToken()
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
    throw new Error('Unauthorized')
  }
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Request failed')
  }
  return data as T
}

// Manually invalidate a specific cache path (e.g. after complex mutations)
export function invalidateCache(pathPrefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(pathPrefix)) {
      cache.delete(key)
    }
  }
}

/**
 * Prefetch a URL in the background (no await needed).
 * Useful for warming the cache before the user navigates to a page.
 * Example: prefetch('/api/sales-orders') while user is on Dashboard
 */
export function prefetch(path: string) {
  if (typeof window === 'undefined') return
  const cached = cache.get(path)
  if (cached && cached.expires > Date.now()) return // already fresh
  // Fire and forget
  apiFetch(path).catch(() => {})
}

/**
 * Prefetch multiple URLs in parallel.
 */
export function prefetchAll(paths: string[]) {
  paths.forEach(p => prefetch(p))
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => apiFetch('/api/auth/logout', { method: 'POST' }),
  me: () => apiFetch('/api/auth/me'),

  // UoM
  listUom: () => apiFetch('/api/uom'),
  createUom: (name: string) => apiFetch('/api/uom', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteUom: (id: string) => apiFetch(`/api/uom?id=${id}`, { method: 'DELETE' }),

  // Items
  listItems: () => apiFetch('/api/items'),
  createItem: (data: any) => apiFetch('/api/items', { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (data: any) => apiFetch('/api/items', { method: 'PUT', body: JSON.stringify(data) }),
  deleteItem: (id: string) => apiFetch(`/api/items?id=${id}`, { method: 'DELETE' }),

  // Tailors
  listTailors: () => apiFetch('/api/tailors'),
  createTailor: (data: any) => apiFetch('/api/tailors', { method: 'POST', body: JSON.stringify(data) }),
  updateTailor: (data: any) => apiFetch('/api/tailors', { method: 'PUT', body: JSON.stringify(data) }),
  deleteTailor: (id: string) => apiFetch(`/api/tailors?id=${id}`, { method: 'DELETE' }),

  // Customers
  listCustomers: (search?: string) => apiFetch(`/api/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  createCustomer: (data: any) => apiFetch('/api/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (data: any) => apiFetch('/api/customers', { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: (id: string) => apiFetch(`/api/customers?id=${id}`, { method: 'DELETE' }),

  // Delivery Info
  listDeliveryInfo: () => apiFetch('/api/delivery-info'),
  createDeliveryInfo: (data: any) => apiFetch('/api/delivery-info', { method: 'POST', body: JSON.stringify(data) }),
  deleteDeliveryInfo: (id: string) => apiFetch(`/api/delivery-info?id=${id}`, { method: 'DELETE' }),

  // Sales Orders
  listSalesOrders: (params?: { search?: string; status?: string }) => {
    const q = new URLSearchParams()
    if (params?.search) q.set('search', params.search)
    if (params?.status) q.set('status', params.status)
    return apiFetch(`/api/sales-orders${q.toString() ? `?${q}` : ''}`)
  },
  getSalesOrder: (id: string) => apiFetch(`/api/sales-orders/${id}`),
  createSalesOrder: (data: any) => apiFetch('/api/sales-orders', { method: 'POST', body: JSON.stringify(data) }),
  updateSalesOrder: (id: string, data: any) => apiFetch(`/api/sales-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSalesOrder: (id: string) => apiFetch(`/api/sales-orders/${id}`, { method: 'DELETE' }),

  // Deliveries
  listDeliveries: (orderId?: string, orderRef?: string) => {
    const q = new URLSearchParams()
    if (orderId) q.set('orderId', orderId)
    if (orderRef) q.set('orderRef', orderRef)
    return apiFetch(`/api/deliveries${q.toString() ? `?${q}` : ''}`)
  },
  createDelivery: (data: any) => apiFetch('/api/deliveries', { method: 'POST', body: JSON.stringify(data) }),

  // Bill Collections
  listBills: (orderId?: string) => apiFetch(`/api/bill-collections${orderId ? `?orderId=${orderId}` : ''}`),
  createBill: (data: any) => apiFetch('/api/bill-collections', { method: 'POST', body: JSON.stringify(data) }),
  deleteBill: (id: string) => apiFetch(`/api/bill-collections?id=${id}`, { method: 'DELETE' }),

  // Expenses
  listExpenses: (from?: string, to?: string) => {
    const q = new URLSearchParams()
    if (from) q.set('from', from)
    if (to) q.set('to', to)
    return apiFetch(`/api/expenses${q.toString() ? `?${q}` : ''}`)
  },
  createExpense: (data: any) => apiFetch('/api/expenses', { method: 'POST', body: JSON.stringify(data) }),
  deleteExpense: (id: string) => apiFetch(`/api/expenses?id=${id}`, { method: 'DELETE' }),

  // Expense Heads
  listExpenseHeads: () => apiFetch('/api/expense-heads'),
  createExpenseHead: (data: any) => apiFetch('/api/expense-heads', { method: 'POST', body: JSON.stringify(data) }),
  updateExpenseHead: (data: any) => apiFetch('/api/expense-heads', { method: 'PUT', body: JSON.stringify(data) }),
  deleteExpenseHead: (id: string) => apiFetch(`/api/expense-heads?id=${id}`, { method: 'DELETE' }),

  // Sales Order Close
  closeSalesOrder: (id: string) => apiFetch(`/api/sales-orders/${id}/close`, { method: 'POST' }),

  // Users (admin only)
  listUsers: () => apiFetch('/api/users'),
  createUser: (data: any) => apiFetch('/api/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (data: any) => apiFetch('/api/users', { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) => apiFetch(`/api/users?id=${id}`, { method: 'DELETE' }),

  // User Permissions
  getUserPermissions: (userId: string) => apiFetch(`/api/users/${userId}/permissions`),
  saveUserPermissions: (userId: string, permissions: any[]) =>
    apiFetch(`/api/users/${userId}/permissions`, { method: 'PUT', body: JSON.stringify({ permissions }) }),
  clearUserPermissions: (userId: string) =>
    apiFetch(`/api/users/${userId}/permissions`, { method: 'DELETE' }),

  // Entities
  listEntities: () => apiFetch('/api/entities'),
  createEntity: (data: any) => apiFetch('/api/entities', { method: 'POST', body: JSON.stringify(data) }),
  updateEntity: (data: any) => apiFetch('/api/entities', { method: 'PUT', body: JSON.stringify(data) }),
  deleteEntity: (id: string) => apiFetch(`/api/entities?id=${id}`, { method: 'DELETE' }),

  // Sub-Entities
  listSubEntities: (entityId?: string) => apiFetch(`/api/sub-entities${entityId ? `?entityId=${entityId}` : ''}`),
  createSubEntity: (data: any) => apiFetch('/api/sub-entities', { method: 'POST', body: JSON.stringify(data) }),
  updateSubEntity: (data: any) => apiFetch('/api/sub-entities', { method: 'PUT', body: JSON.stringify(data) }),
  deleteSubEntity: (id: string) => apiFetch(`/api/sub-entities?id=${id}`, { method: 'DELETE' }),

  // Incomes
  listIncomes: () => apiFetch('/api/incomes'),
  createIncome: (data: any) => apiFetch('/api/incomes', { method: 'POST', body: JSON.stringify(data) }),
  updateIncome: (data: any) => apiFetch('/api/incomes', { method: 'PUT', body: JSON.stringify(data) }),
  deleteIncome: (id: string) => apiFetch(`/api/incomes?id=${id}`, { method: 'DELETE' }),

  // Payables
  listPayables: () => apiFetch('/api/payables'),
  createPayable: (data: any) => apiFetch('/api/payables', { method: 'POST', body: JSON.stringify(data) }),
  payPayable: (data: any) => apiFetch('/api/payables/pay', { method: 'POST', body: JSON.stringify(data) }),
  deletePayable: (id: string) => apiFetch(`/api/payables?id=${id}`, { method: 'DELETE' }),

  // Reports
  dashboard: () => apiFetch('/api/reports/dashboard'),
  pnl: (params: { period: string; year?: number; month?: number }) => {
    const q = new URLSearchParams()
    q.set('period', params.period)
    if (params.year) q.set('year', String(params.year))
    if (params.month !== undefined) q.set('month', String(params.month))
    return apiFetch(`/api/reports/pnl?${q}`)
  },
  receivable: () => apiFetch('/api/reports/receivable'),
  payableReport: () => apiFetch('/api/reports/payable'),
  orderReport: (params?: { from?: string; to?: string; status?: string }) => {
    const q = new URLSearchParams()
    if (params?.from) q.set('from', params.from)
    if (params?.to) q.set('to', params.to)
    if (params?.status) q.set('status', params.status)
    return apiFetch(`/api/reports/orders${q.toString() ? `?${q}` : ''}`)
  },

  // Expense Report
  expenseReport: (params?: { from?: string; to?: string; headId?: string; groupBy?: string }) => {
    const q = new URLSearchParams()
    if (params?.from) q.set('from', params.from)
    if (params?.to) q.set('to', params.to)
    if (params?.headId) q.set('headId', params.headId)
    if (params?.groupBy) q.set('groupBy', params.groupBy)
    return apiFetch(`/api/reports/expense${q.toString() ? `?${q}` : ''}`)
  },

  // Delivery Report
  deliveryReport: (params?: { from?: string; to?: string; status?: string; search?: string }) => {
    const q = new URLSearchParams()
    if (params?.from) q.set('from', params.from)
    if (params?.to) q.set('to', params.to)
    if (params?.status) q.set('status', params.status)
    if (params?.search) q.set('search', params.search)
    return apiFetch(`/api/reports/delivery${q.toString() ? `?${q}` : ''}`)
  },

  // Money Receipts
  listMoneyReceipts: (params?: { from?: string; to?: string; search?: string }) => {
    const q = new URLSearchParams()
    if (params?.from) q.set('from', params.from)
    if (params?.to) q.set('to', params.to)
    if (params?.search) q.set('search', params.search)
    return apiFetch(`/api/money-receipts${q.toString() ? `?${q}` : ''}`)
  },
  createMoneyReceipt: (data: any) => apiFetch('/api/money-receipts', { method: 'POST', body: JSON.stringify(data) }),
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0)
}

export function formatDate(date: Date | string | number | null | undefined): string {
  if (!date && date !== 0) return ''
  let d: Date
  if (date instanceof Date) {
    d = date
  } else if (typeof date === 'number') {
    d = new Date(date)
  } else if (typeof date === 'string') {
    d = new Date(date)
  } else {
    return ''
  }
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(date: Date | string | number | null | undefined): string {
  if (!date && date !== 0) return ''
  let d: Date
  if (date instanceof Date) {
    d = date
  } else if (typeof date === 'number') {
    d = new Date(date)
  } else if (typeof date === 'string') {
    d = new Date(date)
  } else {
    return ''
  }
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
