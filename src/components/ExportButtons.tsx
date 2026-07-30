'use client'

import { FileSpreadsheet, FileText } from 'lucide-react'
import { exportToCSV, exportToPDF, type ExportColumn } from '@/lib/export'

interface Props {
  filename: string
  title: string
  columns: ExportColumn[]
  rows: any[]
}

/**
 * Two-button export toolbar used on every report page.
 * - "Export Excel" → downloads a CSV that opens in Excel
 * - "Export PDF" → opens print dialog (Save as PDF)
 *
 * Buttons are styled to match the dark theme (lime outline + green primary).
 */
export default function ExportButtons({ filename, title, columns, rows }: Props) {
  const btnBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: '0.3s',
    whiteSpace: 'nowrap',
  }

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <button
        onClick={() => exportToCSV(filename, title, columns, rows)}
        title="Export to Excel (CSV)"
        style={{
          ...btnBase,
          background: 'rgba(29, 185, 84, 0.08)',
          border: '1px solid rgba(29, 185, 84, 0.3)',
          color: '#1db954',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(29, 185, 84, 0.15)'
          e.currentTarget.style.borderColor = '#1db954'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(29, 185, 84, 0.08)'
          e.currentTarget.style.borderColor = 'rgba(29, 185, 84, 0.3)'
        }}
      >
        <FileSpreadsheet size={14} /> Excel
      </button>
      <button
        onClick={() => exportToPDF(filename, title, columns, rows)}
        title="Export to PDF (Print dialog)"
        style={{
          ...btnBase,
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid #2a2d33',
          color: '#e8eae9',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
          e.currentTarget.style.borderColor = '#d4df3a'
          e.currentTarget.style.color = '#d4df3a'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
          e.currentTarget.style.borderColor = '#2a2d33'
          e.currentTarget.style.color = '#e8eae9'
        }}
      >
        <FileText size={14} /> PDF
      </button>
    </div>
  )
}
