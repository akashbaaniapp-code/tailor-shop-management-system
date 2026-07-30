/**
 * Reusable export utilities for report pages.
 *
 * - exportToCSV: generates a CSV file (opens in Excel) and triggers download
 * - exportToPDF: opens a print-friendly window with the table data and triggers
 *   the browser's "Save as PDF" dialog
 *
 * Both functions accept a title, an array of column definitions ({ key, label }),
 * and an array of row objects. They work entirely client-side — no server round-trip.
 */

export interface ExportColumn {
  key: string
  label: string
  // Optional formatter — receives the raw cell value + the full row, returns a string
  format?: (value: any, row: any) => string
}

/**
 * Export data to a CSV file that opens in Excel.
 * - Escapes values containing commas, quotes, or newlines
 * - Adds a BOM so Excel correctly detects UTF-8 encoding
 */
export function exportToCSV(
  filename: string,
  title: string,
  columns: ExportColumn[],
  rows: any[]
) {
  // Build CSV content
  const header = columns.map((c) => escapeCSV(c.label)).join(',')
  const body = rows
    .map((row) =>
      columns
        .map((c) => {
          const raw = row[c.key]
          const val = c.format ? c.format(raw, row) : raw
          return escapeCSV(val ?? '')
        })
        .join(',')
    )
    .join('\n')

  // Prepend a title row + blank line for context
  const csv = `${escapeCSV(title)}\n\n${header}\n${body}`

  // Add BOM for UTF-8 detection in Excel
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function escapeCSV(value: any): string {
  const s = String(value ?? '')
  // If the value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/**
 * Export data to a print-friendly HTML window that the user can save as PDF
 * via the browser's print dialog (Ctrl+P → "Save as PDF").
 *
 * Generates a clean, professional-looking document with:
 * - Report title + generation timestamp
 * - A bordered HTML table with all columns and rows
 * - Print CSS that hides browser chrome and optimizes for A4
 */
export function exportToPDF(
  filename: string,
  title: string,
  columns: ExportColumn[],
  rows: any[]
) {
  const now = new Date()
  const timestamp = now.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const headerCells = columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('')
  const bodyRows = rows
    .map(
      (row) =>
        `<tr>${columns
          .map((c) => {
            const raw = row[c.key]
            const val = c.format ? c.format(raw, row) : raw
            return `<td>${escapeHtml(val ?? '')}</td>`
          })
          .join('')}</tr>`
    )
    .join('')

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4 landscape; margin: 15mm; }
    * { box-sizing: border-box; font-family: 'Segoe UI', Tahoma, sans-serif; }
    body { margin: 0; padding: 20px; color: #1a1a1a; font-size: 12px; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #1db954; padding-bottom: 10px; }
    .header h1 { margin: 0; font-size: 20px; color: #1a1a1a; }
    .header .meta { font-size: 11px; color: #666; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background: #f5f5f5; color: #333; font-weight: 600; text-align: left; padding: 8px 10px; border: 1px solid #ddd; font-size: 11px; }
    td { padding: 6px 10px; border: 1px solid #ddd; font-size: 11px; }
    tr:nth-child(even) td { background: #fafafa; }
    .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #999; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">Generated on ${timestamp}</div>
  </div>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <div class="footer">
    ${rows.length} record(s) • FOR THE FUTURE — Tailoring & Fashion Management
  </div>
  <script>
    // Auto-trigger print dialog after the page loads
    window.onload = function() {
      setTimeout(function() { window.print() }, 300)
    }
  </script>
</body>
</html>`

  // Open in a new window and write the HTML
  const printWindow = window.open('', '_blank', 'width=900,height=700')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
  } else {
    // Popup blocked — fall back to download as HTML file
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

function escapeHtml(value: any): string {
  const s = String(value ?? '')
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
