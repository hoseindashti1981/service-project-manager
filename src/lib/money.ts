/**
 * ابزارهای کار با پول
 * قانون مهم: هیچ‌وقت از float استفاده نکن
 */

export function formatMoney(amount: number): string {
  if (!Number.isInteger(amount)) {
    console.warn('مبلغ باید عدد صحیح باشد')
  }

  return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان'
}

export function toToman(amount: number): number {
  return Math.round(amount)
}