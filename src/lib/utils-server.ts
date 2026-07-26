// Utility functions

// Number to words conversion (English style for Taka)
export function numberToWords(num: number): string {
  if (num === 0) return 'Zero'
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  
  function twoDigits(n: number): string {
    if (n < 20) return ones[n]
    const t = Math.floor(n / 10)
    const o = n % 10
    return tens[t] + (o ? ' ' + ones[o] : '')
  }
  
  function threeDigits(n: number): string {
    const h = Math.floor(n / 100)
    const r = n % 100
    let result = ''
    if (h > 0) result += ones[h] + ' Hundred'
    if (r > 0) result += (h > 0 ? ' ' : '') + twoDigits(r)
    return result
  }
  
  function convert(n: number): string {
    if (n === 0) return ''
    
    const crore = Math.floor(n / 10000000)
    n = n % 10000000
    const lakh = Math.floor(n / 100000)
    n = n % 100000
    const thousand = Math.floor(n / 1000)
    n = n % 1000
    const rest = n
    
    let parts: string[] = []
    if (crore > 0) parts.push(convert(crore) + ' Crore')
    if (lakh > 0) parts.push(twoDigits(lakh) + ' Lakh')
    if (thousand > 0) parts.push(twoDigits(thousand) + ' Thousand')
    if (rest > 0) parts.push(threeDigits(rest))
    return parts.filter(Boolean).join(' ')
  }
  
  const integerPart = Math.floor(num)
  const decimalPart = Math.round((num - integerPart) * 100)
  
  let result = convert(integerPart) + ' Taka'
  if (decimalPart > 0) {
    result += ' and ' + twoDigits(decimalPart) + ' Paisa'
  }
  return result + ' Only'
}

// Generate auto ID with prefix, date and sequence
export async function generateOrderId(prefix: string, count: number): Promise<string> {
  const today = new Date()
  const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
  const seq = String(count + 1).padStart(4, '0')
  return `${prefix}-${ymd}-${seq}`
}

export function formatDate(date: Date | string | number | null | undefined): string {
  if (!date && date !== 0) return ''
  let d: Date
  if (date instanceof Date) d = date
  else if (typeof date === 'number') d = new Date(date)
  else if (typeof date === 'string') d = new Date(date)
  else return ''
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(date: Date | string | number | null | undefined): string {
  if (!date && date !== 0) return ''
  let d: Date
  if (date instanceof Date) d = date
  else if (typeof date === 'number') d = new Date(date)
  else if (typeof date === 'string') d = new Date(date)
  else return ''
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0)
}

export function toISODate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().split('T')[0]
}

export function getMonthName(monthIndex: number): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return months[monthIndex]
}
