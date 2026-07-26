import { printHtml } from './print'
import { formatCurrency, formatDate } from './api'
import { BRAND, buildShopHeaderHtml } from './brand'

interface ReceiptBill {
  billId: string
  amount: number
  order: {
    orderId: string
    customer: { name: string; phone: string }
  }
}

interface MoneyReceipt {
  receiptId: string
  customerName: string
  customerPhone?: string | null
  customerAddress?: string | null
  receiptDate: string | Date
  totalAmount: number
  method: string
  note?: string | null
  bills: ReceiptBill[]
}

function numberToWords(num: number): string {
  if (num === 0) return 'Zero Taka Only'
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const two = (n: number) => n < 20 ? ones[n] : tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
  const three = (n: number) => {
    const h = Math.floor(n / 100), r = n % 100
    let s = ''
    if (h) s += ones[h] + ' Hundred'
    if (r) s += (h ? ' ' : '') + two(r)
    return s
  }
  const convert = (n: number): string => {
    if (n === 0) return ''
    const crore = Math.floor(n / 10000000); n %= 10000000
    const lakh = Math.floor(n / 100000); n %= 100000
    const thousand = Math.floor(n / 1000); n %= 1000
    const parts: string[] = []
    if (crore) parts.push(convert(crore) + ' Crore')
    if (lakh) parts.push(two(lakh) + ' Lakh')
    if (thousand) parts.push(two(thousand) + ' Thousand')
    if (n) parts.push(three(n))
    return parts.filter(Boolean).join(' ')
  }
  const intPart = Math.floor(num)
  const decPart = Math.round((num - intPart) * 100)
  let result = convert(intPart) + ' Taka'
  if (decPart > 0) result += ' and ' + two(decPart) + ' Paisa'
  return result + ' Only'
}

export function printMoneyReceipt(receipt: MoneyReceipt) {
  const billsRows = receipt.bills.map((b, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${b.order.orderId}</td>
      <td>${b.billId}</td>
      <td class="right">${formatCurrency(b.amount)}</td>
    </tr>
  `).join('')

  const methodLabel = receipt.method === 'cash' ? 'Cash'
    : receipt.method === 'bank' ? 'Bank Transfer'
    : receipt.method === 'mobile' ? 'Mobile Banking'
    : receipt.method === 'card' ? 'Card'
    : receipt.method === 'cheque' ? 'Cheque'
    : receipt.method

  const html = `
    <div class="header">
      <div class="shop-info">
        ${buildShopHeaderHtml()}
      </div>
      <div class="doc-info">
        <h2 class="doc-title">Money Receipt</h2>
        <p class="doc-id">${receipt.receiptId}</p>
        <p class="doc-date">Date: ${formatDate(receipt.receiptDate)}</p>
        <p class="doc-date">Method: <strong>${methodLabel}</strong></p>
      </div>
    </div>

    <div class="parties">
      <div class="party-block">
        <p class="party-label">Received From (Party)</p>
        <p class="party-name">${receipt.customerName}</p>
        ${receipt.customerPhone ? `<p class="party-detail">${receipt.customerPhone}</p>` : ''}
        ${receipt.customerAddress ? `<p class="party-detail">${receipt.customerAddress}</p>` : ''}
      </div>
      <div class="party-block" style="border-left-color: #1e40af;">
        <p class="party-label" style="color: #1e40af;">Payment Summary</p>
        <p class="party-name">${formatCurrency(receipt.totalAmount)}</p>
        <p class="party-detail">Total Amount</p>
        <p class="party-detail">Bills: ${receipt.bills.length}</p>
      </div>
    </div>

    ${receipt.note ? `
      <div class="notes">
        <p class="notes-label">Note</p>
        <p style="margin: 0;">${receipt.note}</p>
      </div>
    ` : ''}

    <p style="margin: 16px 0 8px; font-size: 13px; font-weight: 600;">
      The sum of <strong>${formatCurrency(receipt.totalAmount)}</strong> received against the following bills:
    </p>

    <table class="items">
      <thead>
        <tr>
          <th style="width: 30px;">#</th>
          <th>Order ID</th>
          <th>Bill ID</th>
          <th class="right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${billsRows}
      </tbody>
      <tfoot>
        <tr class="grand-total-row">
          <td colspan="3" class="right">Total Received</td>
          <td class="right">${formatCurrency(receipt.totalAmount)}</td>
        </tr>
      </tfoot>
    </table>

    <div class="in-words">
      <p class="in-words-label">In Words</p>
      <span class="in-words-value">${numberToWords(receipt.totalAmount)}</span>
    </div>

    <div class="footer">
      <div class="sign-block">
        <div class="sign-line">Received By (Party Signature)</div>
      </div>
      <div class="sign-block">
        <div class="sign-line">Authorized Signature</div>
      </div>
    </div>

    <p class="footer-note">This is a computer-generated money receipt from ${BRAND.name}.</p>
  `

  printHtml(html, `Money Receipt ${receipt.receiptId}`)
}
