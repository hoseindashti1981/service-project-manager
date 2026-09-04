/**
 * ابزارهای تاریخ
 * در دیتابیس تاریخ را به صورت استاندارد نگه می‌داریم
 * در UI می‌توانیم شمسی نمایش دهیم (بعداً)
 */

export function now(): number {
  return Date.now()
}

export function toISODate(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10) // YYYY-MM-DD
}

export function formatDateFa(timestamp: number): string {
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(timestamp))
}