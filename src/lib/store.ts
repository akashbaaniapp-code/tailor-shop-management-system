import { create } from 'zustand'

export type ViewKey =
  | 'dashboard'
  | 'sales-orders'
  | 'delivery'
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
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'dashboard',
  setView: (v) => set({ currentView: v }),
  user: null,
  setUser: (u) => set({ user: u })
}))
