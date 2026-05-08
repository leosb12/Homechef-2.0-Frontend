export function formatDate(value?: string) {
  if (!value) return 'No definido'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-BO', { year: 'numeric', month: 'short', day: '2-digit' }).format(date)
}

export function formatMoney(amount?: number | string, currency = 'BOB') {
  const numeric = Number(amount ?? 0)
  if (Number.isNaN(numeric)) return `${amount ?? '-'} ${currency}`
  return new Intl.NumberFormat('es-BO', { style: 'currency', currency }).format(numeric)
}

export function labelize(value?: string | number | boolean | null) {
  if (value === null || value === undefined || value === '') return 'No definido'
  return String(value).replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function statusColor(status?: string) {
  const value = String(status || '').toUpperCase()
  if (value === 'ACTIVE' || value === 'APPROVED') return '#10b981'
  if (value === 'PENDING' || value === 'PENDING_PAYMENT') return '#f59e0b'
  if (value === 'REJECTED' || value === 'ERROR' || value === 'SUSPENDED' || value === 'EXPIRED') return '#ef4444'
  return 'var(--muted)'
}
