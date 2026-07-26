import { printHtml } from './print'
import { formatCurrency, formatDate } from './api'
import { BRAND, getLogoUrl } from './brand'

interface InvoiceItem {
  item: { name: string }
  qty: number
  uom: string
  unitPrice: number
  total: number
  deliveredQty: number
}

interface InvoiceOrder {
  orderId: string
  orderDate: string | Date
  deliveryDate?: string | Date | null
  customer: { name: string; phone: string; address?: string | null }
  tailor?: { name: string } | null
  salesNote?: string | null
  deliveryInfo?: string | null
  subTotal: number
  discount: number
  grandTotal: number
  paidAmount: number
  dueAmount: number
  status: string
  paymentStatus: string
  items: InvoiceItem[]
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

const SHOP_NAME = BRAND.name
const SHOP_ADDRESS = BRAND.address
const SHOP_PHONE = BRAND.phone
const SHOP_TAGLINE = BRAND.tagline

export function printInvoice(order: InvoiceOrder) {
  const statusLabel = order.status === 'full_delivered' ? 'Delivered'
    : order.status === 'partial_pending' ? 'Partial'
    : order.status === 'closed' ? 'Closed'
    : 'Pending'
  const statusClass = order.status === 'full_delivered' ? 'status-delivered'
    : order.status === 'partial_pending' ? 'status-partial'
    : order.status === 'closed' ? 'status-closed'
    : 'status-pending'

  const paymentLabel = order.paymentStatus === 'paid' ? 'Paid'
    : order.paymentStatus === 'partial' ? 'Partial Paid'
    : 'Unpaid'

  const itemsRows = order.items.map((it, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${it.item.name}</td>
      <td class="center">${it.qty} ${it.uom}</td>
      <td class="right">${formatCurrency(it.unitPrice)}</td>
      <td class="right">${formatCurrency(it.total)}</td>
    </tr>
  `).join('')

  const logoUrl = getLogoUrl()

  const html = `
    <div class="header">
      <div class="shop-info">
        <img src="${logoUrl}" alt="${SHOP_NAME}" class="shop-logo" />
        <h1 class="shop-name">${SHOP_NAME}</h1>
        <p class="shop-tagline">${SHOP_TAGLINE}</p>
        <p class="shop-tagline">${SHOP_ADDRESS}</p>
        <p class="shop-tagline">Phone: ${SHOP_PHONE}</p>
      </div>
      <div class="doc-info">
        <h2 class="doc-title">Invoice</h2>
        <p class="doc-id">${order.orderId}</p>
        <p class="doc-date">Date: ${formatDate(order.orderDate)}</p>
        ${order.deliveryDate ? `<p class="doc-date">Delivery: ${formatDate(order.deliveryDate)}</p>` : ''}
        <p class="doc-date" style="margin-top: 6px;">
          <span class="status-badge ${statusClass}">${statusLabel}</span>
        </p>
      </div>
    </div>

    <div class="parties">
      <div class="party-block">
        <p class="party-label">Bill To (Customer)</p>
        <p class="party-name">${order.customer.name}</p>
        <p class="party-detail">${order.customer.phone}</p>
        ${order.customer.address ? `<p class="party-detail">${order.customer.address}</p>` : ''}
      </div>
      <div class="party-block">
        <p class="party-label">Assigned Tailor</p>
        <p class="party-name">${order.tailor?.name || 'Not assigned'}</p>
        ${order.tailor?.name ? `<p class="party-detail">Tailoring in progress</p>` : ''}
      </div>
    </div>

    ${order.salesNote ? `
      <div class="notes">
        <p class="notes-label">Sales Note</p>
        <p style="margin: 0;">${order.salesNote}</p>
      </div>
    ` : ''}

    ${order.deliveryInfo ? `
      <div class="notes">
        <p class="notes-label">Delivery Information</p>
        <p style="margin: 0;">${order.deliveryInfo}</p>
      </div>
    ` : ''}

    <table class="items">
      <thead>
        <tr>
          <th style="width: 30px;">#</th>
          <th>Item</th>
          <th class="center" style="width: 100px;">Qty</th>
          <th class="right" style="width: 100px;">Unit Price</th>
          <th class="right" style="width: 110px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4" class="right">Sub Total</td>
          <td class="right">${formatCurrency(order.subTotal)}</td>
        </tr>
        ${order.discount > 0 ? `
          <tr>
            <td colspan="4" class="right">Discount</td>
            <td class="right" style="color: #dc2626;">- ${formatCurrency(order.discount)}</td>
          </tr>
        ` : ''}
        <tr class="grand-total-row">
          <td colspan="4" class="right">Grand Total</td>
          <td class="right">${formatCurrency(order.grandTotal)}</td>
        </tr>
      </tfoot>
    </table>

    <div class="in-words">
      <p class="in-words-label">In Words</p>
      <span class="in-words-value">${numberToWords(order.grandTotal)}</span>
    </div>

    <div class="totals-box">
      <div class="row"><span>Paid Amount</span><span style="color: #059669; font-weight: 700;">${formatCurrency(order.paidAmount)}</span></div>
      <div class="row"><span>Due Amount</span><span style="color: #dc2626; font-weight: 700;">${formatCurrency(order.dueAmount)}</span></div>
      <div class="row"><span>Payment Status</span><span>${paymentLabel}</span></div>
    </div>

    <div class="footer">
      <div class="sign-block">
        <div class="sign-line">Customer Signature</div>
      </div>
      <div class="sign-block">
        <div class="sign-line">Tailor Signature</div>
      </div>
      <div class="sign-block">
        <div class="sign-line">Authorized Signature</div>
      </div>
    </div>

    <p class="footer-note">This is a computer-generated invoice from ${SHOP_NAME}. Thank you for your business!</p>
  `

  printHtml(html, `Invoice ${order.orderId}`)
}
