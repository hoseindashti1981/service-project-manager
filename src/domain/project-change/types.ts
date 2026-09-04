import type { ID, Money, Timestamp } from '@/types'

export interface ProjectChange { id: ID; projectId: ID; title: string; amount: Money; date: string; note?: string; createdAt: Timestamp; updatedAt: Timestamp }
export type CreateProjectChangeInput = Omit<ProjectChange, 'id' | 'createdAt' | 'updatedAt'>
