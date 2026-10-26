const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 })

export function money(n: number | null | undefined) {
  return rupees.format(Number(n ?? 0))
}

export function date(iso: string | null | undefined) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return date(iso)
}

// '2026-11' → 'Nov 2026'
export function monthLabel(month: string) {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

export function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function today() {
  const d = new Date()
  return `${currentMonth()}-${String(d.getDate()).padStart(2, '0')}`
}

export function telLink(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

// A 10-digit Indian mobile number gets the 91 country code for WhatsApp.
export function whatsappLink(phone: string) {
  let digits = phone.replace(/\D/g, '')
  if (digits.length === 10) digits = `91${digits}`
  return `https://wa.me/${digits}`
}
