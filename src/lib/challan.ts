import { printHtml } from './print'
import { formatCurrency, formatDate, formatDateTime } from './api'

interface ChallanItem {
  orderItem: { item: { name: string } }
  qty: number
}

interface ChallanData {
  deliveryId: string
  deliveryDate: string | Date
  note?: string | null
  order: {
    orderId: string
    orderDate: string | Date
    deliveryDate?: string | Date | null
    customer: { name: string; phone: string; address?: string | null }
    tailor?: { name: string } | null
    deliveryInfo?: string | null
  }
  items: ChallanItem[]
}

const SHOP_NAME = 'FTF Tailor Shop'
const SHOP_ADDRESS = 'Dhaka, Bangladesh'
const SHOP_PHONE = '+880 1XXX-XXXXXX'

export function printChallan(data: ChallanData) {
  const itemsRows = data.items.map((it, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${it.orderItem.item.name}</td>
      <td class="center">${it.qty}</td>
    </tr>
  `).join('')

  const totalQty = data.items.reduce((s, it) => s + it.qty, 0)

  const html = `
    <div class="header">
      <div class="shop-info">
        <h1 class="shop-name">${SHOP_NAME}</h1>
        <p class="shop-tagline">${SHOP_ADDRESS}</p>
        <p class="shop-tagline">Phone: ${SHOP_PHONE}</p>
      </div>
      <div class="doc-info">
        <h2 class="doc-title">Delivery Challan</h2>
        <p class="doc-id">${data.deliveryId}</p>
        <p class="doc-date">Delivery Date: ${formatDate(data.deliveryDate)}</p>
        <p class="doc-date">Reference Order: ${data.order.orderId}</p>
      </div>
    </div>

    <div class="parties">
      <div class="party-block">
        <p class="party-label">Deliver To (Customer)</p>
        <p class="party-name">${data.order.customer.name}</p>
        <p class="party-detail">${data.order.customer.phone}</p>
        ${data.order.customer.address ? `<p class="party-detail">${data.order.customer.address}</p>` : ''}
      </div>
      <div class="party-block">
        <p class="party-label">Order Information</p>
        <p class="party-detail"><strong>Order ID:</strong> ${data.order.orderId}</p>
        <p class="party-detail"><strong>Order Date:</strong> ${formatDate(data.order.orderDate)}</p>
        ${data.order.deliveryDate ? `<p class="party-detail"><strong>Expected Delivery:</strong> ${formatDate(data.order.deliveryDate)}</p>` : ''}
        ${data.order.tailor?.name ? `<p class="party-detail"><strong>Tailor:</strong> ${data.order.tailor.name}</p>` : ''}
      </div>
    </div>

    ${data.order.deliveryInfo ? `
      <div class="notes">
        <p class="notes-label">Delivery Instructions</p>
        <p style="margin: 0;">${data.order.deliveryInfo}</p>
      </div>
    ` : ''}

    ${data.note ? `
      <div class="notes">
        <p class="notes-label">Challan Note</p>
        <p style="margin: 0;">${data.note}</p>
      </div>
    ` : ''}

    <table class="items">
      <thead>
        <tr>
          <th style="width: 30px;">#</th>
          <th>Item Description</th>
          <th class="center" style="width: 120px;">Delivered Qty</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" class="right">Total Items Being Delivered</td>
          <td class="center" style="font-weight: 800;">${totalQty}</td>
        </tr>
      </tfoot>
    </table>

    <div style="margin: 24px 0; padding: 12px; background: #f0fdf4; border-left: 3px solid #059669; border-radius: 4px; font-size: 12px;">
      <p style="margin: 0; font-weight: 600; color: #065f46;">Declaration:</p>
      <p style="margin: 4px 0 0 0; color: #047857;">
        I declare that the items listed above have been delivered in good condition. The customer has received and inspected the delivery.
      </p>
    </div>

    <div class="footer">
      <div class="sign-block">
        <div class="sign-line">Prepared By</div>
      </div>
      <div class="sign-block">
        <div class="sign-line">Delivered By</div>
      </div>
      <div class="sign-block">
        <div class="sign-line">Received By (Customer)</div>
      </div>
    </div>

    <p class="footer-note">This challan was generated on ${formatDateTime(new Date())} by ${SHOP_NAME}.</p>
  `

  printHtml(html, `Challan ${data.deliveryId}`)
}
