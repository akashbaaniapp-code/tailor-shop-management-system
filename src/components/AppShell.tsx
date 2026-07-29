'use client'

import { useEffect, useState, Suspense } from 'react'
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
  Building2,
  ChevronRight,
  Menu,
  X,
  CircleDollarSign
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy-load all view components — each becomes a separate JS chunk
// that's only downloaded when the user navigates to that page.
// This reduces initial JS bundle by ~60% (from ~400KB to ~150KB).
import dynamic from 'next/dynamic'

const Dashboard = dynamic(() => import('@/components/views/Dashboard'))
const SalesOrders = dynamic(() => import('@/components/views/SalesOrders'))
const SalesOrderFormPage = dynamic(() => import('@/components/views/SalesOrderFormPage'))
const Delivery = dynamic(() => import('@/components/views/Delivery'))
const DeliveryFormPage = dynamic(() => import('@/components/views/DeliveryFormPage'))
const BillCollection = dynamic(() => import('@/components/views/BillCollection'))
const ExpenseEntry = dynamic(() => import('@/components/views/ExpenseEntry'))
const ExpenseFormPage = dynamic(() => import('@/components/views/ExpenseFormPage'))
const IncomeEntry = dynamic(() => import('@/components/views/IncomeEntry'))
const IncomeFormPage = dynamic(() => import('@/components/views/IncomeFormPage'))
const SetupUom = dynamic(() => import('@/components/views/SetupUom'))
const SetupItem = dynamic(() => import('@/components/views/SetupItem'))
const SetupTailor = dynamic(() => import('@/components/views/SetupTailor'))
const SetupCustomer = dynamic(() => import('@/components/views/SetupCustomer'))
const SetupDeliveryInfo = dynamic(() => import('@/components/views/SetupDeliveryInfo'))
const SetupExpenseHead = dynamic(() => import('@/components/views/SetupExpenseHead'))
const SetupUsers = dynamic(() => import('@/components/views/SetupUsers'))
const UserFormPage = dynamic(() => import('@/components/views/UserFormPage'))
const SetupEntity = dynamic(() => import('@/components/views/SetupEntity'))
const ReportPnl = dynamic(() => import('@/components/views/ReportPnl'))
const ReportReceivable = dynamic(() => import('@/components/views/ReportReceivable'))
const ReportPayable = dynamic(() => import('@/components/views/ReportPayable'))
const ReportOrders = dynamic(() => import('@/components/views/ReportOrders'))
const ReportExpense = dynamic(() => import('@/components/views/ReportExpense'))
const ReportDelivery = dynamic(() => import('@/components/views/ReportDelivery'))
const ReportBillCollection = dynamic(() => import('@/components/views/ReportBillCollection'))

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
      { key: 'expense-entry', label: 'Expense Entry', icon: Receipt },
      { key: 'income-entry', label: 'Income Entry', icon: CircleDollarSign }
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
      { key: 'setup-expense-head', label: 'Heads Create', icon: Tag },
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
      { key: 'report-expense', label: 'Expense Report', icon: TrendingDown },
      { key: 'report-delivery', label: 'Delivery Report', icon: Truck },
      { key: 'report-bill-collection', label: 'Bill Collection', icon: Receipt }
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
  'income-entry': 'Income Entry',
  'income-create': 'Add Income',
  'income-edit': 'Edit Income',
  'setup-uom': 'Setup - Unit of Measure',
  'setup-item': 'Setup - Items',
  'setup-tailor': 'Setup - Tailors',
  'setup-customer': 'Setup - Customers',
  'setup-delivery-info': 'Setup - Delivery Information',
  'setup-expense-head': 'Setup - Heads Create',
  'setup-users': 'Setup - Users & Access Rights',
  'setup-user-create': 'Add User',
  'setup-user-edit': 'Edit User',
  'setup-entity': 'Setup - Entities & Sub-Entities',
  'report-pnl': 'P&L Report',
  'report-receivable': 'Receivable Report',
  'report-payable': 'Payable Report',
  'report-orders': 'Order Report',
  'report-expense': 'Expense Report',
  'report-delivery': 'Delivery Report',
  'report-bill-collection': 'Bill Collection Report'
}

export default function AppShell() {
  const { currentView, setView, user, setUser, selectedOrderId, accessibleMenus, selectedEntity, selectedSubEntity, setEntityContextConfirmed } = useAppStore()
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
    // Clear sessionStorage entity context
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('tsms_entity_context')
    }
    useAppStore.getState().setAccessibleMenus(['*'])
    useAppStore.getState().setAccessibleEntities([], [])
    useAppStore.getState().setSelectedEntityContext(null, null)
    useAppStore.getState().setEntityContextConfirmed(false)
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
      case 'income-entry': return <IncomeEntry />
      case 'income-create': return <IncomeFormPage />
      case 'income-edit': return <IncomeFormPage />
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
      case 'report-delivery': return <ReportDelivery />
      case 'report-bill-collection': return <ReportBillCollection />
      default: return <Dashboard />
    }
  }

  const userInitials = (user?.name || user?.username || 'A').slice(0, 2).toUpperCase()

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0b0d0f', color: '#e8eae9' }}>
      {/* Sidebar - desktop */}
      <aside
        className="hidden md:flex w-64 flex-col shrink-0"
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <SidebarContent
          currentView={currentView}
          setView={setView}
          navGroups={filteredNavGroups}
        />
      </aside>

      {/* Sidebar - mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
          <aside
            className="relative w-64 flex-col shadow-xl flex"
            style={{
              background: 'rgba(20, 22, 25, 0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRight: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1 rounded z-10"
              style={{ color: 'rgba(255,255,255,0.4)' }}
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
        <header
          className="h-14 flex items-center px-4 md:px-6 shrink-0"
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <button
            className="md:hidden mr-3 p-1 rounded"
            style={{ color: 'rgba(255,255,255,0.5)' }}
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold flex-1 truncate" style={{ color: '#ffffff' }}>
            {viewTitles[currentView]}
          </h1>
          <div className="flex items-center gap-2">
            {/* Switch Entity button */}
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              style={{
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.7)',
              }}
              onClick={() => {
                setEntityContextConfirmed(false)
              }}
              title="Switch to a different entity"
            >
              <Building2 className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline truncate max-w-[140px]">
                {selectedSubEntity?.name || selectedEntity?.name || 'Select Entity'}
              </span>
            </Button>
            <Avatar className="w-8 h-8" style={{ background: '#d4df3a' }}>
              <AvatarFallback style={{ background: '#d4df3a', color: '#0b0d0f' }} className="text-xs font-bold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm hidden sm:inline" style={{ color: 'rgba(255,255,255,0.6)' }}>{user?.name || user?.username}</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-2 rounded-full"
              style={{ color: 'rgba(255,100,100,0.5)' }}
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
            <Suspense fallback={
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64 w-full" />
              </div>
            }>
              {renderView()}
            </Suspense>
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
        <div
          className="h-14 flex items-center gap-2 px-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <img src={BRAND.logoPath} alt={BRAND.shortName} className="w-full h-full object-contain p-0.5" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight truncate" style={{ color: '#e8eae9' }}>{BRAND.name}</p>
            <p className="text-[10px] uppercase tracking-wider leading-tight" style={{ color: '#d4df3a' }}>{BRAND.tagline}</p>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-5">
            {navGroups.map(group => (
              <div key={group.label} className="space-y-1">
                <p
                  className="text-xs font-semibold uppercase tracking-wide px-3 mb-1"
                  style={{ color: 'rgba(255,255,255,0.2)' }}
                >
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
                        e.preventDefault()
                        setView(item.key)
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-left"
                      style={{
                        color: active ? '#d4df3a' : 'rgba(255,255,255,0.4)',
                        background: active ? 'rgba(212,223,58,0.08)' : 'transparent',
                        borderRight: active ? '3px solid #d4df3a' : '3px solid transparent',
                        fontWeight: active ? 500 : 400,
                      }}
                      onMouseEnter={(e) => {
                        if (!active) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                          e.currentTarget.style.color = 'rgba(255,255,255,0.8)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.color = 'rgba(255,255,255,0.4)'
                        }
                      }}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {active && <ChevronRight className="w-4 h-4" />}
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
