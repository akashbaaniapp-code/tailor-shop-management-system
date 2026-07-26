/**
 * Brand configuration — single source of truth for shop name, tagline, logo.
 * Used by: Login page, AppShell sidebar, Invoice print, Challan print.
 */

export const BRAND = {
  name: 'FOR THE FUTURE',
  shortName: 'FTF',
  tagline: 'Believe in Progress',
  address: 'Dhaka, Bangladesh',
  phone: '+880 1XXX-XXXXXX',
  email: 'info@ftf.com',
  // Logo path — relative to web root. Used as <img src="/ftf-logo.png"> in app
  // and as absolute URL (window.location.origin + '/ftf-logo.png') in print HTML.
  logoPath: '/ftf-logo.png',
  // Primary brand color (used in print headers)
  primaryColor: '#059669'
}

/**
 * Get absolute logo URL for use in print windows (which have their own origin).
 * In the running app, use BRAND.logoPath directly.
 */
export function getLogoUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin + BRAND.logoPath
  }
  return BRAND.logoPath
}

/**
 * Build the shop header HTML block for print documents (invoice, challan).
 *
 * Behavior:
 * - If the logo image loads successfully, show the logo (img tag).
 * - If the logo fails to load (file missing, 404, etc.), automatically hide
 *   the img and show the company name as large text instead.
 * - Below the logo (or company name text), always show: tagline, address, phone.
 *
 * Uses an <img onerror> handler that swaps visibility without any external JS.
 */
export function buildShopHeaderHtml(): string {
  const logoUrl = getLogoUrl()
  return `
    <img
      src="${logoUrl}"
      alt="${BRAND.name}"
      class="shop-logo"
      onload="this.style.display='inline-block'; var t=document.getElementById('shop-name-text-fallback'); if(t) t.style.display='none';"
      onerror="this.style.display='none'; var t=document.getElementById('shop-name-text-fallback'); if(t) t.style.display='block';"
    />
    <h1 class="shop-name-text" id="shop-name-text-fallback" style="display:none;">${BRAND.name}</h1>
    <p class="shop-tagline" style="font-weight:600;color:#059669;">${BRAND.tagline}</p>
    <p class="shop-address">${BRAND.address}</p>
    <p class="shop-tagline">Phone: ${BRAND.phone}</p>
  `
}

