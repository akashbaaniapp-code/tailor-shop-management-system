import { create } from 'zustand'

export type ViewKey =
  | 'dashboard'
  | 'sales-orders'
  | 'sales-order-create'
  | 'sales-order-edit'
  | 'sales-order-view'
  | 'delivery'
  | 'delivery-create'
  | 'bill-collection'
  | 'expense-entry'
  | 'expense-create'
  | 'expense-edit'
  | 'deposit-create'
  | 'deposit-edit'
  | 'income-entry'
  | 'income-create'
  | 'income-edit'
  | 'setup-uom'
  | 'setup-item'
  | 'setup-tailor'
  | 'setup-customer'
  | 'setup-delivery-info'
  | 'setup-expense-head'
  | 'setup-bank'
  | 'setup-users'
  | 'setup-user-create'
  | 'setup-user-edit'
  | 'setup-entity'
  | 'report-pnl'
  | 'report-receivable'
  | 'report-payable'
  | 'report-orders'
  | 'report-expense'
  | 'report-delivery'
  | 'report-bill-collection'
  | 'report-income'

// Map view keys to URL ?view= values (kept short for cleaner URLs)
const VIEW_TO_URL: Partial<Record<ViewKey, string>> = {
  'dashboard': 'dashboard',
  'sales-orders': 'orders',
  'sales-order-create': 'orders-new',
  'sales-order-edit': 'orders-edit',
  'delivery': 'delivery',
  'delivery-create': 'delivery-new',
  'bill-collection': 'bills',
  'expense-entry': 'expenses',
  'expense-create': 'expenses-new',
  'expense-edit': 'expenses-edit',
  'deposit-create': 'deposits-new',
  'deposit-edit': 'deposits-edit',
  'income-entry': 'incomes',
  'income-create': 'incomes-new',
  'income-edit': 'incomes-edit',
  'setup-uom': 'setup-uom',
  'setup-item': 'setup-items',
  'setup-tailor': 'setup-tailors',
  'setup-customer': 'setup-customers',
  'setup-delivery-info': 'setup-delivery-info',
  'setup-expense-head': 'setup-expense-heads',
  'setup-bank': 'setup-banks',
  'setup-users': 'setup-users',
  'setup-user-create': 'setup-users-new',
  'setup-user-edit': 'setup-users-edit',
  'setup-entity': 'setup-entities',
  'report-pnl': 'report-pnl',
  'report-receivable': 'report-receivable',
  'report-payable': 'report-payable',
  'report-orders': 'report-orders',
  'report-expense': 'report-expense',
  'report-delivery': 'report-delivery',
  'report-bill-collection': 'report-bill-collection',
  'report-income': 'report-income'
}

const URL_TO_VIEW: Record<string, ViewKey> = Object.entries(VIEW_TO_URL).reduce(
  (acc, [view, url]) => {
    acc[url] = view as ViewKey
    return acc
  },
  {} as Record<string, ViewKey>
)

export function viewToUrl(view: ViewKey): string {
  return VIEW_TO_URL[view] || 'dashboard'
}

export function urlToView(url: string): ViewKey {
  return URL_TO_VIEW[url] || 'dashboard'
}

// Build a relative URL for a given view (preserves current path)
export function buildViewUrl(view: ViewKey): string {
  return `/?view=${viewToUrl(view)}`
}

interface AppState {
  currentView: ViewKey
  setView: (v: ViewKey) => void
  user: any | null
  setUser: (u: any | null) => void
  // Sub-view params (e.g. editing/viewing a specific order or expense)
  selectedOrderId: string | null
  setSelectedOrderId: (id: string | null) => void
  selectedExpenseId: string | null
  setSelectedExpenseId: (id: string | null) => void
  selectedDepositId: string | null
  setSelectedDepositId: (id: string | null) => void
  selectedIncomeId: string | null
  setSelectedIncomeId: (id: string | null) => void
  selectedUserId: string | null
  setSelectedUserId: (id: string | null) => void
  // List of menu keys the current user can access.
  // ['*'] means all menus (admin). Empty array means none (will be refetched).
  accessibleMenus: string[]
  setAccessibleMenus: (menus: string[]) => void
  // Entities + sub-entities the user has access to
  accessibleEntities: any[]
  accessibleSubEntities: any[]
  setAccessibleEntities: (entities: any[], subEntities: any[]) => void
  // Currently selected entity/sub-entity (set after entity selection screen)
  // null means 'all' — show data across all accessible entities
  selectedEntity: any | null
  selectedSubEntity: any | null
  setSelectedEntityContext: (entity: any | null, subEntity: any | null) => void
  // Whether user has passed the entity selection screen
  entityContextConfirmed: boolean
  setEntityContextConfirmed: (v: boolean) => void
}

// Read entity context from localStorage on initialization.
// localStorage (not sessionStorage) is shared across tabs of the same origin,
// so when a user right-clicks a sidebar menu → "Open in New Tab", the new tab
// inherits the same entity context and goes straight to the requested page
// (instead of showing the entity selection screen again).
function getInitialEntityContext() {
  if (typeof window === 'undefined') {
    return { entity: null, subEntity: null, confirmed: false }
  }
  try {
    const stored = localStorage.getItem('tsms_entity_context')
    if (stored) {
      const ctx = JSON.parse(stored)
      // Restore window.__entityContext for API headers
      ;(window as any).__entityContext = {
        entityId: ctx.entity?.id || null,
        subEntityId: ctx.subEntity?.id || null
      }
      return { entity: ctx.entity, subEntity: ctx.subEntity, confirmed: true }
    }
  } catch {}
  return { entity: null, subEntity: null, confirmed: false }
}

const initialEntityCtx = getInitialEntityContext()

function getInitialView(): ViewKey {
  if (typeof window === 'undefined') return 'dashboard'
  const params = new URLSearchParams(window.location.search)
  const viewParam = params.get('view')
  return viewParam ? urlToView(viewParam) : 'dashboard'
}

export const useAppStore = create<AppState>((set) => ({
  currentView: getInitialView(),
  setView: (v) => {
    // Update URL when view changes (so right-click Open in New Tab works)
    if (typeof window !== 'undefined') {
      const url = buildViewUrl(v)
      window.history.pushState({ view: v }, '', url)
    }
    set({ currentView: v })
  },
  user: null,
  setUser: (u) => set({ user: u }),
  selectedOrderId: null,
  setSelectedOrderId: (id) => set({ selectedOrderId: id }),
  selectedExpenseId: null,
  setSelectedExpenseId: (id) => set({ selectedExpenseId: id }),
  selectedDepositId: null,
  setSelectedDepositId: (id) => set({ selectedDepositId: id }),
  selectedIncomeId: null,
  setSelectedIncomeId: (id) => set({ selectedIncomeId: id }),
  selectedUserId: null,
  setSelectedUserId: (id) => set({ selectedUserId: id }),
  accessibleMenus: ['*'], // default to all; will be overridden after /api/auth/me
  setAccessibleMenus: (menus) => set({ accessibleMenus: menus }),
  accessibleEntities: [],
  accessibleSubEntities: [],
  setAccessibleEntities: (entities, subEntities) =>
    set({ accessibleEntities: entities, accessibleSubEntities: subEntities }),
  selectedEntity: initialEntityCtx.entity,
  selectedSubEntity: initialEntityCtx.subEntity,
  setSelectedEntityContext: (entity, subEntity) => {
    // Update the global window variable so apiFetch can read it
    if (typeof window !== 'undefined') {
      ;(window as any).__entityContext = {
        entityId: entity?.id || null,
        subEntityId: subEntity?.id || null
      }
      // Persist to localStorage so new tabs (right-click > Open in New Tab)
      // inherit the same entity context. localStorage is shared across tabs.
      localStorage.setItem('tsms_entity_context', JSON.stringify({ entity, subEntity }))
    }
    set({ selectedEntity: entity, selectedSubEntity: subEntity })
  },
  entityContextConfirmed: initialEntityCtx.confirmed,
  setEntityContextConfirmed: (v) => set({ entityContextConfirmed: v })
}))

// Listen for browser back/forward to update the store
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    const params = new URLSearchParams(window.location.search)
    const viewParam = params.get('view')
    const view = viewParam ? urlToView(viewParam) : 'dashboard'
    useAppStore.setState({ currentView: view })
  })
}
