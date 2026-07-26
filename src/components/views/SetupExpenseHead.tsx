'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Trash2, Edit, Tag } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface ExpenseHead {
  id: string
  name: string
  description?: string | null
}

export default function SetupExpenseHead() {
  const [items, setItems] = useState<ExpenseHead[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<ExpenseHead | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await api.listExpenseHeads()
      setItems(res.items)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditItem(null); setName(''); setDescription(''); setShowForm(true)
  }

  function openEdit(it: ExpenseHead) {
    setEditItem(it); setName(it.name); setDescription(it.description || ''); setShowForm(true)
  }

  async function handleSave() {
    if (!name.trim()) { toast.error('Name required'); return }
    try {
      if (editItem) {
        await api.updateExpenseHead({ id: editItem.id, name: name.trim(), description })
        toast.success('Expense head updated')
      } else {
        await api.createExpenseHead({ name: name.trim(), description })
        toast.success('Expense head created')
      }
      setShowForm(false); load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this expense head? Existing expenses linked to it will keep their records but show "no head".')) return
    try {
      await api.deleteExpenseHead(id); toast.success('Deleted'); load()
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
              <p className="text-sm text-slate-600">Create expense heads (categories) for organizing your expenses</p>
              <p className="text-xs text-slate-500 mt-1">Examples: Rent, Salary, Utility Bill, Fabric Purchase, Electricity, Transport</p>
            </div>
            <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-1" /> Add Head
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
              <Tag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">No expense heads yet</p>
              <p className="text-xs text-slate-400 mt-1">Create one to start categorizing your expenses</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-slate-600">Name</th>
                    <th className="text-left px-4 py-2.5 font-medium text-slate-600">Description</th>
                    <th className="text-center px-4 py-2.5 font-medium text-slate-600">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(it => (
                    <tr key={it.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-900">{it.name}</td>
                      <td className="px-4 py-2.5 text-slate-600">{it.description || '-'}</td>
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
            <DialogHeader><DialogTitle>{editItem ? 'Edit Expense Head' : 'Add Expense Head'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Name * (unique)</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rent" autoFocus />
              </div>
              <div>
                <Label className="text-xs">Description (optional)</Label>
                <Textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description..." />
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
