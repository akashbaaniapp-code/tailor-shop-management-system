/**
 * Print an HTML string in a new window.
 * Opens a new browser tab, writes the HTML, triggers print dialog.
 * The new tab closes automatically after printing (or stays open if user cancels).
 */
export function printHtml(html: string, title: string = 'Print') {
  const win = window.open('', '_blank', 'width=800,height=900')
  if (!win) {
    alert('Please allow popups to print. Your browser blocked the print window.')
    return
  }

  win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      margin: 0;
      padding: 24px;
      color: #0f172a;
      font-size: 13px;
      line-height: 1.5;
    }
    .print-container { max-width: 800px; margin: 0 auto; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #059669;
    }
    .shop-info { flex: 1; }
    .shop-name {
      font-size: 22px;
      font-weight: 800;
      color: #059669;
      margin: 0 0 4px 0;
    }
    .shop-tagline { color: #64748b; font-size: 12px; margin: 0; }
    .doc-info { text-align: right; }
    .doc-title {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 4px 0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .doc-id {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      color: #475569;
      margin: 0;
      font-weight: 600;
    }
    .doc-date { font-size: 11px; color: #64748b; margin: 2px 0 0 0; }

    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .party-block {
      padding: 12px;
      background: #f8fafc;
      border-radius: 6px;
      border-left: 3px solid #059669;
    }
    .party-label {
      font-size: 10px;
      font-weight: 700;
      color: #059669;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 6px 0;
    }
    .party-name { font-size: 14px; font-weight: 700; margin: 0 0 2px 0; }
    .party-detail { font-size: 12px; color: #475569; margin: 1px 0; }

    .notes {
      margin-bottom: 16px;
      padding: 10px 12px;
      background: #fefce8;
      border-left: 3px solid #eab308;
      border-radius: 4px;
      font-size: 12px;
    }
    .notes-label {
      font-size: 10px;
      font-weight: 700;
      color: #a16207;
      text-transform: uppercase;
      margin: 0 0 4px 0;
    }

    table.items {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    table.items thead th {
      background: #059669;
      color: white;
      padding: 8px 10px;
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    table.items thead th.right { text-align: right; }
    table.items thead th.center { text-align: center; }
    table.items tbody td {
      padding: 8px 10px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 12px;
    }
    table.items tbody td.right { text-align: right; }
    table.items tbody td.center { text-align: center; }
    table.items tbody tr:nth-child(even) td { background: #f8fafc; }
    table.items tfoot td {
      padding: 8px 10px;
      border-top: 2px solid #0f172a;
      font-size: 12px;
      font-weight: 600;
    }
    table.items tfoot td.right { text-align: right; }
    .grand-total-row td {
      font-size: 15px;
      font-weight: 800;
      color: #059669;
      border-top: 3px solid #059669;
    }

    .in-words {
      padding: 10px 12px;
      background: #ecfdf5;
      border: 1px dashed #059669;
      border-radius: 4px;
      margin-bottom: 24px;
      font-size: 12px;
    }
    .in-words-label {
      font-size: 10px;
      font-weight: 700;
      color: #047857;
      text-transform: uppercase;
      margin: 0 0 2px 0;
    }
    .in-words-value { font-style: italic; font-weight: 600; color: #064e3b; }

    .totals-box {
      width: 280px;
      margin-left: auto;
      margin-bottom: 16px;
    }
    .totals-box .row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 12px;
    }
    .totals-box .row.grand {
      border-top: 2px solid #0f172a;
      padding-top: 8px;
      margin-top: 4px;
      font-size: 15px;
      font-weight: 800;
      color: #059669;
    }

    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
    }
    .sign-block {
      text-align: center;
      font-size: 11px;
      color: #64748b;
    }
    .sign-line {
      border-top: 1px solid #475569;
      padding-top: 4px;
      margin-top: 32px;
    }
    .footer-note {
      margin-top: 24px;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
    }

    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-partial { background: #dbeafe; color: #1e40af; }
    .status-delivered { background: #d1fae5; color: #065f46; }

    @media print {
      body { padding: 0; }
      .no-print { display: none; }
      @page { margin: 12mm; }
    }

    .print-button-bar {
      position: sticky;
      top: 0;
      background: white;
      padding: 12px 0;
      margin: -24px -24px 16px -24px;
      border-bottom: 1px solid #e2e8f0;
      text-align: right;
      padding-left: 24px;
      padding-right: 24px;
    }
    .print-button {
      background: #059669;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      margin-left: 8px;
    }
    .print-button.secondary {
      background: white;
      color: #475569;
      border: 1px solid #cbd5e1;
    }
  </style>
</head>
<body>
  <div class="print-button-bar no-print">
    <button class="print-button secondary" onclick="window.close()">Close</button>
    <button class="print-button" onclick="window.print()">Print / Save as PDF</button>
  </div>
  <div class="print-container">
    ${html}
  </div>
  <script>
    // Auto-trigger print after a short delay
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 300);
    });
  </script>
</body>
</html>`)
  win.document.close()
}
