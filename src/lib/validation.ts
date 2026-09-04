/**
 * اعتبارسنجی‌های پایه
 */

export function isValidMobile(mobile: string): boolean {
  const cleaned = mobile.replace(/\s|-/g, '')
  return /^09\d{9}$/.test(cleaned)
}

export function isNonEmpty(value: string | undefined | null): boolean {
  return !!value && value.trim().length > 0
}

export function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0
}