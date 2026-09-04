import type { ID, Money, Timestamp, Unit } from '@/types'
export type MaterialSource = 'customer' | 'contractor'
export interface Material { id: ID; projectId: ID; title: string; quantity: number; unit: Unit; source: MaterialSource; cost: Money; createdAt: Timestamp; updatedAt: Timestamp }
export type CreateMaterialInput = Omit<Material, 'id' | 'createdAt' | 'updatedAt'>
