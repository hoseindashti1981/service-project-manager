import type { Unit } from '@/types'

export const serviceUnits: { value: Unit; label: string }[] = [
  { value: 'meter', label: 'متر' }, { value: 'piece', label: 'عدد' },
  { value: 'point', label: 'نقطه' }, { value: 'hour', label: 'ساعت' },
  { value: 'day', label: 'روز' }, { value: 'device', label: 'دستگاه' },
  { value: 'project', label: 'پروژه' }, { value: 'fixed', label: 'مقطوع' },
  { value: 'service', label: 'خدمت' },
]

export function normalizeDigits(value: string): string {
  return value.replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[,٬\s]/g, '').replace(/٫/g, '.')
}

export function validateServicePrice(price: number): number {
  if (!Number.isSafeInteger(price) || price < 0) throw new Error('قیمت باید عدد صحیح و نامنفی به تومان باشد.')
  return price
}
