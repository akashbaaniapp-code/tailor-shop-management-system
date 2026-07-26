'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Trash2, Edit, UserCog, Shield, Lock, Save } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface User {
  id: string
  username: string
  name?: string | null
  role: string
  createdAt: string
}

const ROLE_LABELS: Record<string, { label: string; className: string; desc: string }> = {
  admin: { label: 'Admin', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100', desc: 'Full access — can manage users, settings, all data' },
  manager: { label: 'Manager', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100', desc: 'Can create/edit orders, deliveries, expenses; no user management' },
  staff: { label: 'Staff', className: 'bg-slate-100 text-slate-700 hover:bg-slate-100', desc: 'Custom access defined by permissions below' }
}

// All menu items available for permission assignment
const MENU_ITEMS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'sales-orders', label: 'Sales Orders' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'bill-collection', label: 'Bill Collection' },
  { key: 'expense-entry', label: 'Expense Entry' },
  { key: 'setup-uom', label: 'Setup - UoM' },
  { key: 'setup-item', label: 'Setup - Items' },
  { key: 'setup-tailor', label: 'Setup - Tailors' },
  { key: 'setup-customer', label: 'Setup - Customers' },
  { key: 'setup-delivery-info', label: 'Setup - Delivery Info' },
  { key: 'setup-expense-head', label: 'Setup - Expense Heads' },
  { key: 'setup-entity', label: 'Setup - Entities' },
  { key: 'report-pnl', label: 'P&L Report' },
  { key: 'report-receivable', label: 'Receivable Report' },
  { key: 'report-payable', label: 'Payable Report' },
  { key: 'report-orders', label: 'Order Report' },
  { key: 'report-expense', label: 'Expense Report' }
]

interface Permission {
  id?: string
  entityId?: string | null
  subEntityId?: string | null
  menuAccess: string[]
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
}

export default function SetupUsers() {
  const [items, setItems] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<User | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('staff')

  // Permissions state
  const [showPermissions, setShowPermissions] = useState(false)
  const [permUser, setPermUser] = useState<User | null>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [entities, setEntities] = useState<any[]>([])
  const [subEntities, setSubEntities] = useState<any[]>([])
  const [savingPerms, setSavingPerms] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await api.listUsers()
      setItems(res.items)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditItem(null); setUsername(''); setPassword(''); setName(''); setRole('staff'); setShowForm(true)
  }

  function openEdit(it: User) {
    setEditItem(it)
    setUsername(it.username)
    setPassword('')
    setName(it.name || '')
    setRole(it.role)
    setShowForm(true)
  }

  async function handleSave() {
    if (!username.trim()) { toast.error('Username required'); return }
    if (!editItem && !password) { toast.error('Password required for new user'); return }

    try {
      const data: any = { username: username.trim(), name, role }
      if (password) data.password = password

      if (editItem) {
        await api.updateUser({ id: editItem.id, ...data })
        toast.success('User updated')
      } else {
        await api.createUser(data)
        toast.success('User created')
      }
      setShowForm(false); load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this user? They will no longer be able to log in.')) return
    try {
      await api.deleteUser(id); toast.success('User deleted'); load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // ---- Permission handlers ----
  async function openPermissions(user: User) {
    setPermUser(user)
    setShowPermissions(true)
    try {
      const [permRes, entRes, subRes] = await Promise.all([
        api.getUserPermissions(user.id),
        api.listEntities(),
        api.listSubEntities()
      ])
      setPermissions(permRes.permissions?.length ? permRes.permissions : [{
        menuAccess: [], canView: true, canCreate: false, canEdit: false, canDelete: false
      }])
      setEntities(entRes.items)
      setSubEntities(subRes.items)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  function addPermissionRow() {
    setPermissions([...permissions, {
      menuAccess: [], canView: true, canCreate: false, canEdit: false, canDelete: false
    }])
  }

  function removePermissionRow(idx: number) {
    setPermissions(permissions.filter((_, i) => i !== idx))
  }

  function updatePermission(idx: number, field: keyof Permission, value: any) {
    const next = [...permissions]
    ;(next[idx] as any)[field] = value
    setPermissions(next)
  }

  function toggleMenuInPermission(idx: number, menuKey: string) {
    const next = [...permissions]
    const current = next[idx].menuAccess
    if (current.includes(menuKey)) {
      next[idx].menuAccess = current.filter(m => m !== menuKey)
    } else {
      next[idx].menuAccess = [...current, menuKey]
    }
    setPermissions(next)
  }

  async function handleSavePermissions() {
    if (!permUser) return
    setSavingPerms(true)
    try {
      await api.saveUserPermissions(permUser.id, permissions)
      toast.success('Permissions saved')
      setShowPermissions(false)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSavingPerms(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-slate-600">Manage system users and their access rights</p>
              <div className="mt-2 space-y-1">
                {Object.entries(ROLE_LABELS).map(([key, val]) => (
                  <div key={key} className="text-xs flex items-start gap-2">
                    <Badge variant="secondary" className={val.className}>{val.label}</Badge>
                    <span className="text-slate-500">{val.desc}</span>
                  </div>
                ))}
              </div>
            </div>
            <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-1" /> Add User
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <UserCog className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">No users yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-slate-600">Username</th>
                    <th className="text-left px-4 py-2.5 font-medium text-slate-600">Name</th>
                    <th className="text-center px-4 py-2.5 font-medium text-slate-600">Role</th>
                    <th className="text-left px-4 py-2.5 font-medium text-slate-600">Created</th>
                    <th className="text-center px-4 py-2.5 font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(it => (
                    <tr key={it.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium font-mono text-slate-900">{it.username}</td>
                      <td className="px-4 py-2.5 text-slate-600">{it.name || '-'}</td>
                      <td className="px-4 py-2.5 text-center">
                        <Badge variant="secondary" className={(ROLE_LABELS[it.role] || ROLE_LABELS.staff).className}>
                          <Shield className="w-3 h-3 mr-1" />
                          {(ROLE_LABELS[it.role] || ROLE_LABELS.staff).label}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">
                        {new Date(it.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          {it.role !== 'admin' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openPermissions(it)}
                              title="Set Permissions"
                              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            >
                              <Lock className="w-3 h-3 mr-1" /> Permissions
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => openEdit(it)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(it.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User create/edit dialog */}
      {showForm && (
        <Dialog open onOpenChange={setShowForm}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editItem ? 'Edit User' : 'Add User'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Username *</Label>
                <Input value={username} onChange={e => setUsername(e.target.value)} autoFocus disabled={!!editItem} />
                {editItem && <p className="text-xs text-slate-500 mt-1">Username cannot be changed</p>}
              </div>
              <div>
                <Label className="text-xs">
                  Password {editItem ? '(leave blank to keep current)' : '*'}
                </Label>
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={editItem ? '••••••••' : 'Enter password'}
                />
              </div>
              <div>
                <Label className="text-xs">Full Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Karim Ahmed" />
              </div>
              <div>
                <Label className="text-xs">Role / Access Rights</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin — Full access</SelectItem>
                    <SelectItem value="manager">Manager — Orders, deliveries, expenses</SelectItem>
                    <SelectItem value="staff">Staff — Custom permissions</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">{(ROLE_LABELS[role] || ROLE_LABELS.staff).desc}</p>
                {role === 'staff' && !editItem && (
                  <p className="text-xs text-amber-700 mt-2 bg-amber-50 p-2 rounded">
                    💡 After creating this user, click the "Permissions" button to define which menus and actions they can access.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
                {editItem ? 'Update User' : 'Create User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Permissions editor dialog */}
      {showPermissions && permUser && (
        <Dialog open onOpenChange={setShowPermissions}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-emerald-600" />
                Permissions for {permUser.username}
                {permUser.name && <span className="text-slate-500 font-normal">({permUser.name})</span>}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-emerald-50 p-3 rounded-lg text-sm">
                <p className="font-medium text-emerald-900 mb-1">How permissions work:</p>
                <ul className="text-xs text-emerald-800 space-y-0.5 list-disc pl-4">
                  <li>Each row defines a permission set with menu access + action rights</li>
                  <li>Multiple rows can be added — user gets access from all rows combined</li>
                  <li>Select which menus the user can see in the sidebar</li>
                  <li>Check View/Create/Edit/Delete actions per row</li>
                  <li>Optionally restrict to specific Entity or Sub-Entity</li>
                </ul>
              </div>

              {permissions.map((perm, idx) => (
                <Card key={idx} className="border-slate-200">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Permission Set #{idx + 1}</CardTitle>
                      {permissions.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removePermissionRow(idx)}
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Menu access */}
                    <div>
                      <Label className="text-xs font-semibold">Menu Access (what menus to show in sidebar)</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 p-2 border border-slate-200 rounded">
                        {MENU_ITEMS.map(m => (
                          <label key={m.key} className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <Checkbox
                              checked={perm.menuAccess.includes(m.key)}
                              onCheckedChange={() => toggleMenuInPermission(idx, m.key)}
                            />
                            <span>{m.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Action rights */}
                    <div>
                      <Label className="text-xs font-semibold">Action Rights</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 p-2 border border-slate-200 rounded">
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <Checkbox
                            checked={perm.canView}
                            onCheckedChange={(v) => updatePermission(idx, 'canView', !!v)}
                          />
                          <span>Can View</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <Checkbox
                            checked={perm.canCreate}
                            onCheckedChange={(v) => updatePermission(idx, 'canCreate', !!v)}
                          />
                          <span>Can Create</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <Checkbox
                            checked={perm.canEdit}
                            onCheckedChange={(v) => updatePermission(idx, 'canEdit', !!v)}
                          />
                          <span>Can Edit</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <Checkbox
                            checked={perm.canDelete}
                            onCheckedChange={(v) => updatePermission(idx, 'canDelete', !!v)}
                          />
                          <span>Can Delete</span>
                        </label>
                      </div>
                    </div>

                    {/* Entity / Sub-Entity restrictions (optional) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Restrict to Entity (optional)</Label>
                        <Select
                          value={perm.entityId || 'all'}
                          onValueChange={(v) => updatePermission(idx, 'entityId', v === 'all' ? null : v)}
                        >
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Entities</SelectItem>
                            {entities.map((e: any) => (
                              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Restrict to Sub-Entity (optional)</Label>
                        <Select
                          value={perm.subEntityId || 'all'}
                          onValueChange={(v) => updatePermission(idx, 'subEntityId', v === 'all' ? null : v)}
                        >
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Sub-Entities</SelectItem>
                            {subEntities
                              .filter((s: any) => !perm.entityId || s.entityId === perm.entityId)
                              .map((s: any) => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button variant="outline" onClick={addPermissionRow} className="w-full">
                <Plus className="w-4 h-4 mr-1" /> Add Another Permission Set
              </Button>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPermissions(false)}>Cancel</Button>
              <Button onClick={handleSavePermissions} disabled={savingPerms} className="bg-emerald-600 hover:bg-emerald-700">
                <Save className="w-4 h-4 mr-1" />
                {savingPerms ? 'Saving...' : 'Save Permissions'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
