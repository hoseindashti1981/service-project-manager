import type { ID, Timestamp } from '@/types'

export interface Customer {
  id: ID
  name: string
  mobile: string
  description?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type CreateCustomerInput = Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateCustomerInput = Partial<CreateCustomerInput>