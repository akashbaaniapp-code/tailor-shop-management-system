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
  | 'setup-uom'
  | 'setup-item'
  | 'setup-tailor'
  | 'setup-customer'
  | 'setup-delivery-info'
  | 'setup-expense-head'
  | 'report-pnl'
  | 'report-receivable'
  | 'report-payable'
  | 'report-orders'

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
  'setup-uom': 'setup-uom',
  'setup-item': 'setup-items',
  'setup-tailor': 'setup-tailors',
  'setup-customer': 'setup-customers',
  'setup-delivery-info': 'setup-delivery-info',
  'setup-expense-head': 'setup-expense-heads',
  'report-pnl': 'report-pnl',
  'report-receivable': 'report-receivable',
  'report-payable': 'report-payable',
  'report-orders': 'report-orders'
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
}

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
  setSelectedExpenseId: (id) => set({ selectedExpenseId: id })
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
