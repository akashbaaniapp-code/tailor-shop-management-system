'use client'

import { useEffect, useState, useCallback } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar, Save, Package, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { api, formatCurrency } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'
import ExportButtons from '@/components/ExportButtons'

interface StockItem {
  id: string | null
  itemId: string
  item: { id: string; name: string; uom?: { name: string } }
  recordDate: string
  opening: number
  received: number
  outQty: number
  wasted: number
  closing: number
  note?: string | null
  virtual?: boolean
}

const darkCard: React.CSSProperties = {
  background: '#14161a',
  border: '1px solid #2a2d33',
  borderRadius: 16,
  padding: 25,
}

const inputStyle: React.CSSProperties = {
  background: '#0b0d0f',
  border: '1px solid #2a2d33',
  borderRadius: 8,
  padding: '6px 10px',
  color: '#fff',
  fontSize: 13,
  outline: 'none',
  width: '100%',
  textAlign: 'right',
}

export default function StockRecordPage() {
  const [items, setItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.listStockRecords(selectedDate)
      setItems(res.items || [])
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    load()
  }, [load])

  function changeDate(delta: number) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + delta)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  function updateField(idx: number, field: keyof StockItem, value: any) {
    const next = [...items]
    ;(next[idx] as any)[field] = value
    // Auto-calculate closing = opening + received - out - wasted
    const opening = Number(next[idx].opening) || 0
    const received = Number(next[idx].received) || 0
    const out = Number(next[idx].outQty) || 0
    const wasted = Number(next[idx].wasted) || 0
    next[idx].closing = opening + received - out - wasted
    setItems(next)
  }

  async function handleSave(idx: number) {
    const it = items[idx]
    if (!it.itemId) return
    setSaving(it.itemId)
    try {
      await api.saveStockRecord({
        id: it.virtual ? null : it.id,
        itemId: it.itemId,
        recordDate: selectedDate,
        received: it.received,
        outQty: it.outQty,
        wasted: it.wasted,
        closing: it.closing,
        note: it.note,
      })
      toast.success(`${it.item.name} — stock saved`)
      // Reload to get fresh data (with proper IDs, cascade updates)
      load()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(null)
    }
  }

  function formatDateDisplay(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  // Export columns
  const exportColumns = [
    { key: 'item.name', label: 'Item', format: (_v: any, row: any) => row.item?.name || '' },
    { key: 'item.uom.name', label: 'UoM', format: (_v: any, row: any) => row.item?.uom?.name || '' },
    { key: 'opening', label: 'Opening', format: (v: any) => Number(v || 0).toFixed(2) },
    { key: 'received', label: 'Received', format: (v: any) => Number(v || 0).toFixed(2) },
    { key: 'outQty', label: 'Out', format: (v: any) => Number(v || 0).toFixed(2) },
    { key: 'wasted', label: 'Wasted', format: (v: any) => Number(v || 0).toFixed(2) },
    { key: 'closing', label: 'Closing', format: (v: any) => Number(v || 0).toFixed(2) },
    { key: 'note', label: 'Note' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 25 }}>
      {/* Date Navigator Card */}
      <div style={{ ...darkCard, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 15 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          <button
            onClick={() => changeDate(-1)}
            title="Previous day"
            style={{
              background: 'transparent',
              border: '1px solid #2a2d33',
              color: '#888',
              width: 36,
              height: 36,
              borderRadius: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: '0.3s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d4df3a'; e.currentTarget.style.color = '#d4df3a' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2d33'; e.currentTarget.style.color = '#888' }}
          >
            <ChevronLeft size={18} />
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={16} color="#d4df3a" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  background: '#0b0d0f',
                  border: '1px solid #2a2d33',
                  borderRadius: 8,
                  padding: '6px 12px',
                  color: '#fff',
                  fontSize: 14,
                  outline: 'none',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
              />
            </div>
            <span style={{ fontSize: 12, color: '#888' }}>{formatDateDisplay(selectedDate)}</span>
          </div>
          <button
            onClick={() => changeDate(1)}
            title="Next day"
            style={{
              background: 'transparent',
              border: '1px solid #2a2d33',
              color: '#888',
              width: 36,
              height: 36,
              borderRadius: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: '0.3s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d4df3a'; e.currentTarget.style.color = '#d4df3a' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2d33'; e.currentTarget.style.color = '#888' }}
          >
            <ChevronRight size={18} />
          </button>
          <button
            onClick={load}
            title="Refresh"
            style={{
              background: '#1db954',
              color: '#fff',
              border: 'none',
              width: 36,
              height: 36,
              borderRadius: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: '0.3s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#1aa34a')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#1db954')}
          >
            <RefreshCw size={16} />
          </button>
        </div>
        {!loading && items.length > 0 && (
          <ExportButtons
            filename={`stock-record-${selectedDate}`}
            title={`Stock Record — ${formatDateDisplay(selectedDate)}`}
            columns={exportColumns}
            rows={items}
          />
        )}
      </div>

      {/* Info banner */}
      <div
        style={{
          background: 'rgba(212,223,58,0.05)',
          border: '1px solid rgba(212,223,58,0.15)',
          borderRadius: 12,
          padding: '12px 18px',
          fontSize: 13,
          color: '#d4df3a',
          lineHeight: 1.6,
        }}
      >
        💡 <strong>Auto-carry:</strong> Previous day's closing automatically becomes today's opening.
        Enter Received, Out, and Wasted quantities — Closing is auto-calculated. Click Save per row.
        If you need to adjust the actual physical closing, enter it in the Closing column directly.
      </div>

      {/* Stock Table */}
      <div style={{ ...darkCard, padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 25, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ height: 50, background: '#1f2227', borderRadius: 8 }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 56,
                height: 56,
                border: '2px solid #2a2d33',
                borderRadius: 12,
                marginBottom: 8,
              }}
            >
              <Package size={24} color="#666" />
            </div>
            <p style={{ color: '#888' }}>No items found</p>
            <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
              Create items in Setup → Items to start recording stock
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#ffffff' }}>
                  <th style={{ textAlign: 'left', padding: '12px 10px 12px 25px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0', minWidth: 180 }}>Item</th>
                  <th style={{ textAlign: 'center', padding: '12px 4px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0', width: 50 }}>UoM</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0', width: 90 }}>Opening</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0', width: 90 }}>Received</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0', width: 90 }}>Out</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0', width: 90 }}>Wasted</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0', width: 100 }}>Closing</th>
                  <th style={{ textAlign: 'center', padding: '12px 25px 12px 10px', color: '#333', fontWeight: 600, borderBottom: '1px solid #e0e0e0', width: 80 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr
                    key={it.itemId}
                    style={{ borderBottom: '1px solid #2a2d33' }}
                    onMouseEnter={(e) => {
                      Array.from(e.currentTarget.children).forEach((td) => {
                        ;(td as HTMLElement).style.background = 'rgba(255,255,255,0.01)'
                      })
                    }}
                    onMouseLeave={(e) => {
                      Array.from(e.currentTarget.children).forEach((td) => {
                        ;(td as HTMLElement).style.background = 'transparent'
                      })
                    }}
                  >
                    <td style={{ padding: '8px 10px 8px 25px' }}>
                      <span style={{ color: '#3498db', fontWeight: 500 }}>{it.item?.name || 'Unknown'}</span>
                      {it.virtual && (
                        <span style={{ marginLeft: 6, fontSize: 10, color: '#555', fontStyle: 'italic' }}>(new)</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'center', color: '#888' }}>{it.item?.uom?.name || '-'}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                      <span style={{ color: '#888', fontSize: 13 }}>{Number(it.opening || 0).toFixed(2)}</span>
                    </td>
                    <td style={{ padding: '8px 8px' }}>
                      <input
                        type="number"
                        value={it.received || ''}
                        onChange={(e) => updateField(idx, 'received', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                        placeholder="0"
                        style={inputStyle}
                        onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                        onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
                      />
                    </td>
                    <td style={{ padding: '8px 8px' }}>
                      <input
                        type="number"
                        value={it.outQty || ''}
                        onChange={(e) => updateField(idx, 'outQty', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                        placeholder="0"
                        style={inputStyle}
                        onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                        onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
                      />
                    </td>
                    <td style={{ padding: '8px 8px' }}>
                      <input
                        type="number"
                        value={it.wasted || ''}
                        onChange={(e) => updateField(idx, 'wasted', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                        placeholder="0"
                        style={inputStyle}
                        onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                        onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
                      />
                    </td>
                    <td style={{ padding: '8px 8px' }}>
                      <input
                        type="number"
                        value={Number(it.closing || 0).toFixed(2)}
                        onChange={(e) => updateField(idx, 'closing', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                        style={{ ...inputStyle, color: '#1db954', fontWeight: 600 }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = '#d4df3a')}
                        onBlur={(e) => (e.currentTarget.style.borderColor = '#2a2d33')}
                      />
                    </td>
                    <td style={{ padding: '8px 25px 8px 10px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleSave(idx)}
                        disabled={saving === it.itemId}
                        title="Save this row"
                        style={{
                          background: saving === it.itemId ? '#1aa34a' : '#1db954',
                          color: '#fff',
                          border: 'none',
                          padding: '6px 14px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: saving === it.itemId ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          transition: '0.3s',
                          opacity: saving === it.itemId ? 0.6 : 1,
                        }}
                        onMouseEnter={(e) => { if (saving !== it.itemId) e.currentTarget.style.background = '#1aa34a' }}
                        onMouseLeave={(e) => { if (saving !== it.itemId) e.currentTarget.style.background = '#1db954' }}
                      >
                        <Save size={12} /> {saving === it.itemId ? '...' : 'Save'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
