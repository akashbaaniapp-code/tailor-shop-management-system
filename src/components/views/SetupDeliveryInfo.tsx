'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Trash2, FileText } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface DeliveryInfo { id: string; label: string; note: string }

export default function SetupDeliveryInfo() {
  const [items, setItems] = useState<DeliveryInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [label, setLabel] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await api.listDeliveryInfo()
      setItems(res.items)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!label.trim() || !note.trim()) { toast.error('Label and note required'); return }
    try {
      await api.createDeliveryInfo({ label: label.trim(), note: note.trim() })
      toast.success('Delivery info saved')
      setLabel(''); setNote(''); setShowForm(false); load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this delivery info?')) return
    try {
      await api.deleteDeliveryInfo(id); toast.success('Deleted'); load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-600">Save reusable delivery information templates (e.g. home delivery, office pickup)</p>
            <Button onClick={() => setShowForm(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-1" /> Add Info
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
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">No saved delivery info yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {items.map(it => (
                <div key={it.id} className="p-4 flex items-start justify-between gap-3 hover:bg-slate-50">
                  <div>
                    <p className="font-semibold text-slate-900">{it.label}</p>
                    <p className="text-sm text-slate-600 mt-0.5">{it.note}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(it.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <Dialog open onOpenChange={setShowForm}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add Delivery Info</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Label *</Label>
                <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Home Delivery" autoFocus />
              </div>
              <div>
                <Label className="text-xs">Note *</Label>
                <Textarea rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Delivery instructions/details..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
