'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Trash2, Edit, UserCog, Shield } from 'lucide-react'
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
  staff: { label: 'Staff', className: 'bg-slate-100 text-slate-700 hover:bg-slate-100', desc: 'Can view and create orders/deliveries; limited edit access' }
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
    setPassword('') // Don't prefill password
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
                    <th className="text-center px-4 py-2.5 font-medium text-slate-600">Action</th>
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
                    <SelectItem value="staff">Staff — View & create only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">{(ROLE_LABELS[role] || ROLE_LABELS.staff).desc}</p>
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
    </div>
  )
}
