import type { ID, Money, Timestamp, Unit } from '@/types'

export interface Service {
  id: ID
  name: string
  defaultUnit: Unit
  /** قیمت پیشنهادی؛ قیمت نهایی هر پروژه می‌تواند مستقل تغییر کند. */
  defaultUnitPrice: Money
  description?: string
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type CreateServiceInput = Omit<Service, 'id' | 'createdAt' | 'updatedAt'>
