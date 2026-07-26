'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Trash2, Edit, Package } from 'lucide-react'
import { api, formatCurrency } from '@/lib/api'
import { toast } from 'sonner'

interface Item { id: string; name: string; uomId: string; uom: { id: string; name: string }; unitPrice: number }
interface UoM { id: string; name: string }

export default function SetupItem() {
  const [items, setItems] = useState<Item[]>([])
  const [uoms, setUoms] = useState<UoM[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Item | null>(null)
  const [name, setName] = useState('')
  const [uomId, setUomId] = useState('')
  const [unitPrice, setUnitPrice] = useState(0)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [i, u] = await Promise.all([api.listItems(), api.listUom()])
      setItems(i.items); setUoms(u.items)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    if (uoms.length === 0) {
      toast.error('Please create UoM first')
      return
    }
    setEditItem(null); setName(''); setUomId(''); setUnitPrice(0); setShowForm(true)
  }

  function openEdit(it: Item) {
    setEditItem(it); setName(it.name); setUomId(it.uomId); setUnitPrice(it.unitPrice); setShowForm(true)
  }

  async function handleSave() {
    if (!name.trim() || !uomId) { toast.error('Name and UoM required'); return }
    try {
      if (editItem) {
        await api.updateItem({ id: editItem.id, name: name.trim(), uomId, unitPrice })
        toast.success('Item updated')
      } else {
        await api.createItem({ name: name.trim(), uomId, unitPrice })
        toast.success('Item created')
      }
      setShowForm(false); load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this item?')) return
    try {
      await api.deleteItem(id); toast.success('Deleted'); load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-600">Manage items/products with their unit price and unit</p>
            <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-1" /> Add Item
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
              <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">No items yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-slate-600">Name</th>
                    <th className="text-left px-4 py-2.5 font-medium text-slate-600">UoM</th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-600">Default Unit Price</th>
                    <th className="text-center px-4 py-2.5 font-medium text-slate-600">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(it => (
                    <tr key={it.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-900">{it.name}</td>
                      <td className="px-4 py-2.5 text-slate-600">{it.uom.name}</td>
                      <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(it.unitPrice)}</td>
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
            <DialogHeader><DialogTitle>{editItem ? 'Edit Item' : 'Add Item'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Name *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} autoFocus />
              </div>
              <div>
                <Label className="text-xs">UoM *</Label>
                <Select value={uomId} onValueChange={setUomId}>
                  <SelectTrigger><SelectValue placeholder="Select UoM" /></SelectTrigger>
                  <SelectContent>
                    {uoms.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Default Unit Price</Label>
                <Input type="number" value={unitPrice} onChange={e => setUnitPrice(parseFloat(e.target.value) || 0)} />
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
