/**
 * Brand configuration — single source of truth for shop name, tagline, logo.
 * Used by: Login page, AppShell sidebar, Invoice print, Challan print.
 */

export const BRAND = {
  name: 'FOR THE FUTURE',
  shortName: 'FTF',
  tagline: 'Tailoring & Fashion',
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
