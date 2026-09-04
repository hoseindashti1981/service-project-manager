import type { ID, Timestamp, Unit } from '@/types'

export interface Service {
  id: ID
  name: string
  defaultUnit: Unit
  description?: string
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type CreateServiceInput = Omit<Service, 'id' | 'createdAt' | 'updatedAt'>