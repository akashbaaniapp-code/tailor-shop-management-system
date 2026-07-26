'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Trash2, Edit, Users, Search } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface Customer { id: string; name: string; phone: string; address?: string }

export default function SetupCustomer() {
  const [items, setItems] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Customer | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await api.listCustomers(search || undefined)
      setItems(res.items)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [search])

  function openCreate() {
    setEditItem(null); setName(''); setPhone(''); setAddress(''); setShowForm(true)
  }

  function openEdit(it: Customer) {
    setEditItem(it); setName(it.name); setPhone(it.phone); setAddress(it.address || ''); setShowForm(true)
  }

  async function handleSave() {
    if (!name.trim() || !phone.trim()) { toast.error('Name and phone required'); return }
    try {
      if (editItem) {
        await api.updateCustomer({ id: editItem.id, name: name.trim(), phone: phone.trim(), address })
        toast.success('Customer updated')
      } else {
        await api.createCustomer({ name: name.trim(), phone: phone.trim(), address })
        toast.success('Customer created')
      }
      setShowForm(false); load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this customer?')) return
    try {
      await api.deleteCustomer(id); toast.success('Deleted'); load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or phone..."
                className="pl-9"
              />
            </div>
            <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-1" /> Add Customer
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Note: Contact number must be unique. System will block duplicate entries automatically.
          </p>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">No customers yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-slate-600">Name</th>
                    <th className="text-left px-4 py-2.5 font-medium text-slate-600">Phone</th>
                    <th className="text-left px-4 py-2.5 font-medium text-slate-600">Address</th>
                    <th className="text-center px-4 py-2.5 font-medium text-slate-600">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(it => (
                    <tr key={it.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium">{it.name}</td>
                      <td className="px-4 py-2.5 text-slate-600 font-mono">{it.phone}</td>
                      <td className="px-4 py-2.5 text-slate-600">{it.address || '-'}</td>
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
            <DialogHeader><DialogTitle>{editItem ? 'Edit Customer' : 'Add Customer'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Name *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} autoFocus />
              </div>
              <div>
                <Label className="text-xs">Contact Number * (unique)</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="01XXXXXXXXX" />
                <p className="text-xs text-slate-500 mt-1">Duplicates will be blocked automatically</p>
              </div>
              <div>
                <Label className="text-xs">Address</Label>
                <Textarea rows={2} value={address} onChange={e => setAddress(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
                {editItem ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
