export function now(): number { return Date.now() }

/** Calendar dates follow the device's local day, never the UTC day. */
export function toISODate(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00`)
  return Number.isFinite(date.getTime()) && toISODate(date) === value
}
export function requireDate(value: string): string {
  if (!isValidDate(value)) throw new Error('تاریخ معتبر انتخاب کنید.')
  return value
}
export function formatDateFa(value: number | string): string {
  return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' })
    .format(new Date(typeof value === 'string' ? `${value}T12:00:00` : value))
}
export type JalaliDate = { year: number; month: number; day: number }
const persian = new Intl.DateTimeFormat('en-US-u-ca-persian', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' })
export function isoToJalali(value: string): JalaliDate {
  const parts = persian.formatToParts(new Date(`${requireDate(value)}T12:00:00Z`))
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value)
  return { year: part('year'), month: part('month'), day: part('day') }
}
/** Use the same Persian calendar for both directions, including leap years. */
export function jalaliToIso(date: JalaliDate): string {
  const target = date.year * 10000 + date.month * 100 + date.day
  let low = Math.floor(Date.UTC(date.year + 621, 2, 1) / 86400000)
  let high = low + 400
  while (low <= high) {
    const middle = Math.floor((low + high) / 2)
    const iso = new Date(middle * 86400000).toISOString().slice(0, 10)
    const current = isoToJalali(iso)
    const key = current.year * 10000 + current.month * 100 + current.day
    if (key === target) return iso
    if (key < target) low = middle + 1
    else high = middle - 1
  }
  throw new Error('تاریخ شمسی معتبر نیست.')
}
export function jalaliMonthDays(year: number, month: number): number {
  if (month <= 6) return 31
  if (month <= 11) return 30
  const start = Date.parse(jalaliToIso({ year, month: 12, day: 1 }))
  const end = Date.parse(jalaliToIso({ year: year + 1, month: 1, day: 1 }))
  return Math.round((end - start) / 86400000)
}
