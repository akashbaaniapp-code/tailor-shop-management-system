'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save, CheckCircle2, Shield } from 'lucide-react'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

const ROLE_LABELS: Record<string, { label: string; className: string; desc: string }> = {
  admin: { label: 'Admin', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100', desc: 'Full access — can manage users, settings, all data' },
  manager: { label: 'Manager', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100', desc: 'Can create/edit orders, deliveries, expenses; no user management' },
  staff: { label: 'Staff', className: 'bg-slate-100 text-slate-700 hover:bg-slate-100', desc: 'Custom access defined by permissions' }
}

export default function UserFormPage() {
  const setView = useAppStore(s => s.setView)
  const selectedUserId = useAppStore(s => s.selectedUserId)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('staff')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!!selectedUserId)
  const [saved, setSaved] = useState(false)
  const [savedUser, setSavedUser] = useState<any>(null)

  useEffect(() => {
    if (selectedUserId) {
      // Editing existing user — load details
      api.listUsers().then(res => {
        const u = res.items.find((x: any) => x.id === selectedUserId)
        if (u) {
          setUsername(u.username)
          setName(u.name || '')
          setRole(u.role)
          // password stays blank (edit mode: leave blank to keep current)
        }
        setLoading(false)
      }).catch(err => {
        toast.error(err.message)
        setLoading(false)
      })
    }
  }, [selectedUserId])

  async function handleSave() {
    if (!username.trim()) { toast.error('Username required'); return }
    if (!selectedUserId && !password) { toast.error('Password required for new user'); return }

    setSaving(true)
    try {
      const data: any = { username: username.trim(), name, role }
      if (password) data.password = password

      let result: any
      if (selectedUserId) {
        result = await api.updateUser({ id: selectedUserId, ...data })
        toast.success('User updated')
      } else {
        result = await api.createUser(data)
        toast.success('User created')
      }
      setSavedUser(result.item || { username: data.username, name: data.name, role: data.role })
      setSaved(true)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleCreateAnother() {
    setSaved(false)
    setSavedUser(null)
    setUsername(''); setPassword(''); setName(''); setRole('staff')
    useAppStore.setState({ selectedUserId: null })
    setView('setup-user-create')
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-slate-100 rounded animate-pulse" />
        <div className="h-64 bg-slate-100 rounded animate-pulse" />
      </div>
    )
  }

  // Success state
  if (saved && savedUser) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto pt-8">
        <Card className="border-emerald-300 bg-emerald-50">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-emerald-900">
              {selectedUserId ? 'User Updated Successfully!' : 'User Created Successfully!'}
            </h2>
            <p className="text-sm text-emerald-700 mt-2">
              Username: <span className="font-mono font-semibold">{savedUser.username}</span>
            </p>
            {savedUser.name && (
              <p className="text-sm text-emerald-700 mt-1">
                Name: <span className="font-semibold">{savedUser.name}</span>
              </p>
            )}
            <div className="mt-3 flex items-center justify-center gap-2">
              <Badge variant="secondary" className={(ROLE_LABELS[savedUser.role] || ROLE_LABELS.staff).className}>
                <Shield className="w-3 h-3 mr-1" />
                {(ROLE_LABELS[savedUser.role] || ROLE_LABELS.staff).label}
              </Badge>
            </div>

            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {!selectedUserId && savedUser.role === 'staff' && (
                <Button
                  onClick={() => {
                    useAppStore.getState().setSelectedUserId(savedUser.id || null)
                    setView('setup-users') // then click Permissions button
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Set Permissions
                </Button>
              )}
              {!selectedUserId && (
                <Button variant="outline" onClick={handleCreateAnother} className="border-emerald-600 text-emerald-700 hover:bg-emerald-100">
                  Add Another User
                </Button>
              )}
              <Button variant="outline" onClick={() => setView('setup-users')}>
                Back to Users List
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setView('setup-users')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {selectedUserId ? 'Edit User' : 'Add New User'}
            </h2>
            <p className="text-sm text-slate-500">Fill in the user details below</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setView('setup-users')}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            <Save className="w-4 h-4 mr-1" />
            {saving ? 'Saving...' : selectedUserId ? 'Update User' : 'Create User'}
          </Button>
        </div>
      </div>

      {/* Form card */}
      <Card className="border-slate-200 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">User Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Username *</Label>
              <Input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. karim.ahmed"
                className="mt-1"
                autoFocus
                disabled={!!selectedUserId}
              />
              {selectedUserId && <p className="text-xs text-slate-500 mt-1">Username cannot be changed</p>}
            </div>

            <div>
              <Label className="text-xs">
                Password {selectedUserId ? '(leave blank to keep current)' : '*'}
              </Label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={selectedUserId ? '••••••••' : 'Enter password'}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Full Name</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Karim Ahmed"
                className="mt-1"
              />
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
              {role === 'staff' && !selectedUserId && (
                <p className="text-xs text-amber-700 mt-2 bg-amber-50 p-2 rounded">
                  💡 After creating this user, click the "Permissions" button on the users list to define which menus and actions they can access.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom action buttons */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={() => setView('setup-users')}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
          <Save className="w-4 h-4 mr-1" />
          {saving ? 'Saving...' : selectedUserId ? 'Update User' : 'Create User'}
        </Button>
      </div>
    </div>
  )
}
