'use client'

import { useEffect, useState } from 'react'
import { useAppStore, ViewKey, buildViewUrl } from '@/lib/store'
import { api, clearToken } from '@/lib/api'
import { BRAND } from '@/lib/brand'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  LayoutDashboard,
  ShoppingCart,
  Truck,
  Wallet,
  Settings,
  BarChart3,
  LogOut,
  Scissors,
  Ruler,
  Package,
  Users,
  UserCog,
  FileText,
  TrendingUp,
  TrendingDown,
  Receipt,
  Tag,
  Layers,
  ChevronRight,
  Menu,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

import Dashboard from '@/components/views/Dashboard'
import SalesOrders from '@/components/views/SalesOrders'
import SalesOrderFormPage from '@/components/views/SalesOrderFormPage'
import Delivery from '@/components/views/Delivery'
import DeliveryFormPage from '@/components/views/DeliveryFormPage'
import BillCollection from '@/components/views/BillCollection'
import ExpenseEntry from '@/components/views/ExpenseEntry'
import ExpenseFormPage from '@/components/views/ExpenseFormPage'
import SetupUom from '@/components/views/SetupUom'
import SetupItem from '@/components/views/SetupItem'
import SetupTailor from '@/components/views/SetupTailor'
import SetupCustomer from '@/components/views/SetupCustomer'
import SetupDeliveryInfo from '@/components/views/SetupDeliveryInfo'
import SetupExpenseHead from '@/components/views/SetupExpenseHead'
import SetupUsers from '@/components/views/SetupUsers'
import UserFormPage from '@/components/views/UserFormPage'
import SetupEntity from '@/components/views/SetupEntity'
import ReportPnl from '@/components/views/ReportPnl'
import ReportReceivable from '@/components/views/ReportReceivable'
import ReportPayable from '@/components/views/ReportPayable'
import ReportOrders from '@/components/views/ReportOrders'
import ReportExpense from '@/components/views/ReportExpense'

interface NavGroup {
  label: string
  items: { key: ViewKey; label: string; icon: any }[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Main',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { key: 'sales-orders', label: 'Sales Orders', icon: ShoppingCart },
      { key: 'delivery', label: 'Delivery', icon: Truck },
      { key: 'bill-collection', label: 'Bill Collection', icon: Wallet },
      { key: 'expense-entry', label: 'Expense Entry', icon: Receipt }
    ]
  },
  {
    label: 'Setup',
    items: [
      { key: 'setup-uom', label: 'UoM', icon: Ruler },
      { key: 'setup-item', label: 'Items', icon: Package },
      { key: 'setup-tailor', label: 'Tailors', icon: Scissors },
      { key: 'setup-customer', label: 'Customers', icon: Users },
      { key: 'setup-delivery-info', label: 'Delivery Info', icon: FileText },
      { key: 'setup-expense-head', label: 'Expense Heads', icon: Tag },
      { key: 'setup-entity', label: 'Entities', icon: Layers },
      { key: 'setup-users', label: 'Users & Rights', icon: UserCog }
    ]
  },
  {
    label: 'Reports',
    items: [
      { key: 'report-pnl', label: 'P&L Report', icon: TrendingUp },
      { key: 'report-receivable', label: 'Receivable', icon: Receipt },
      { key: 'report-payable', label: 'Payable', icon: Wallet },
      { key: 'report-orders', label: 'Order Report', icon: BarChart3 },
      { key: 'report-expense', label: 'Expense Report', icon: TrendingDown }
    ]
  }
]

const viewTitles: Record<ViewKey, string> = {
  'dashboard': 'Dashboard',
  'sales-orders': 'Sales Orders',
  'sales-order-create': 'Create Sales Order',
  'sales-order-edit': 'Edit Sales Order',
  'sales-order-view': 'View Sales Order',
  'delivery': 'Sales Order Delivery',
  'delivery-create': 'Create Delivery',
  'bill-collection': 'Bill Collection',
  'expense-entry': 'Expense Entry',
  'expense-create': 'Add Expense',
  'expense-edit': 'Edit Expense',
  'setup-uom': 'Setup - Unit of Measure',
  'setup-item': 'Setup - Items',
  'setup-tailor': 'Setup - Tailors',
  'setup-customer': 'Setup - Customers',
  'setup-delivery-info': 'Setup - Delivery Information',
  'setup-expense-head': 'Setup - Expense Heads',
  'setup-users': 'Setup - Users & Access Rights',
  'setup-user-create': 'Add User',
  'setup-user-edit': 'Edit User',
  'setup-entity': 'Setup - Entities & Sub-Entities',
  'report-pnl': 'P&L Report',
  'report-receivable': 'Receivable Report',
  'report-payable': 'Payable Report',
  'report-orders': 'Order Report',
  'report-expense': 'Expense Report'
}

export default function AppShell() {
  const { currentView, setView, user, setUser, selectedOrderId, accessibleMenus } = useAppStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Filter nav groups to only show menus the user can access.
  // accessibleMenus === ['*'] means admin (all menus).
  const isAllAccess = accessibleMenus.includes('*')
  const filteredNavGroups = isAllAccess
    ? navGroups
    : navGroups.map(g => ({
        ...g,
        items: g.items.filter(item => accessibleMenus.includes(item.key))
      })).filter(g => g.items.length > 0)

  useEffect(() => {
    setMobileOpen(false)
  }, [currentView])

  async function handleLogout() {
    try {
      await api.logout()
    } catch {}
    clearToken()
    setUser(null)
    useAppStore.getState().setAccessibleMenus(['*'])
    toast.success('Logged out')
  }

  function renderView() {
    switch (currentView) {
      case 'dashboard': return <Dashboard />
      case 'sales-orders': return <SalesOrders />
      case 'sales-order-create': return <SalesOrderFormPage />
      case 'sales-order-edit': return <SalesOrderFormPage orderId={selectedOrderId || undefined} />
      case 'delivery': return <Delivery />
      case 'delivery-create': return <DeliveryFormPage />
      case 'bill-collection': return <BillCollection />
      case 'expense-entry': return <ExpenseEntry />
      case 'expense-create': return <ExpenseFormPage />
      case 'expense-edit': return <ExpenseFormPage />
      case 'setup-uom': return <SetupUom />
      case 'setup-item': return <SetupItem />
      case 'setup-tailor': return <SetupTailor />
      case 'setup-customer': return <SetupCustomer />
      case 'setup-delivery-info': return <SetupDeliveryInfo />
      case 'setup-expense-head': return <SetupExpenseHead />
      case 'setup-users': return <SetupUsers />
      case 'setup-user-create': return <UserFormPage />
      case 'setup-user-edit': return <UserFormPage />
      case 'setup-entity': return <SetupEntity />
      case 'report-pnl': return <ReportPnl />
      case 'report-receivable': return <ReportReceivable />
      case 'report-payable': return <ReportPayable />
      case 'report-orders': return <ReportOrders />
      case 'report-expense': return <ReportExpense />
      default: return <Dashboard />
    }
  }

  const userInitials = (user?.name || user?.username || 'A').slice(0, 2).toUpperCase()

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-slate-200 shrink-0">
        <SidebarContent
          currentView={currentView}
          setView={setView}
          navGroups={filteredNavGroups}
        />
      </aside>

      {/* Sidebar - mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 flex-col bg-white shadow-xl flex">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1 rounded hover:bg-slate-100 z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent
              currentView={currentView}
              setView={setView}
              navGroups={filteredNavGroups}
            />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 md:px-6 shrink-0">
          <button
            className="md:hidden mr-3 p-1 rounded hover:bg-slate-100"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-slate-900 flex-1 truncate">
            {viewTitles[currentView]}
          </h1>
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8 bg-emerald-100">
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-slate-700 hidden sm:inline">{user?.name || user?.username}</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-2 text-slate-600 hover:text-red-600 hover:bg-red-50"
              onClick={handleLogout}
              title="Logout"
            >
              <LogOut className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
            {renderView()}
          </div>
        </main>
      </div>
    </div>
  )

  function SidebarContent({
    currentView,
    setView,
    navGroups
  }: {
    currentView: ViewKey
    setView: (v: ViewKey) => void
    navGroups: NavGroup[]
  }) {
    return (
      <>
        <div className="h-14 flex items-center gap-2 px-4 border-b border-slate-200 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
            <img src={BRAND.logoPath} alt={BRAND.shortName} className="w-full h-full object-contain p-0.5" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 text-sm leading-tight truncate">{BRAND.name}</p>
            <p className="text-[10px] text-emerald-700 uppercase tracking-wider leading-tight">{BRAND.tagline}</p>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-5">
            {navGroups.map(group => (
              <div key={group.label} className="space-y-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-3 mb-1">
                  {group.label}
                </p>
                {group.items.map(item => {
                  const Icon = item.icon
                  const active = currentView === item.key
                  return (
                    <a
                      key={item.key}
                      href={buildViewUrl(item.key)}
                      onClick={(e) => {
                        // Normal left-click: use client-side routing (no full page reload)
                        e.preventDefault()
                        setView(item.key)
                      }}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors text-left',
                        active
                          ? 'bg-emerald-50 text-emerald-700 font-medium'
                          : 'text-slate-600 hover:bg-slate-100'
                      )}
                    >
                      <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-emerald-600' : 'text-slate-400')} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {active && <ChevronRight className="w-4 h-4 text-emerald-600" />}
                    </a>
                  )
                })}
              </div>
            ))}
          </div>
        </ScrollArea>
      </>
    )
  }
}
