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
  | 'setup-uom'
  | 'setup-item'
  | 'setup-tailor'
  | 'setup-customer'
  | 'setup-delivery-info'
  | 'report-pnl'
  | 'report-receivable'
  | 'report-payable'
  | 'report-orders'

interface AppState {
  currentView: ViewKey
  setView: (v: ViewKey) => void
  user: any | null
  setUser: (u: any | null) => void
  // Sub-view params (e.g. editing/viewing a specific order)
  selectedOrderId: string | null
  setSelectedOrderId: (id: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'dashboard',
  setView: (v) => set({ currentView: v }),
  user: null,
  setUser: (u) => set({ user: u }),
  selectedOrderId: null,
  setSelectedOrderId: (id) => set({ selectedOrderId: id })
}))
