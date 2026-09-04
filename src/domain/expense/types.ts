import type { ID, Money, Timestamp } from '@/types'
export interface Expense { id: ID; projectId: ID; title: string; amount: Money; date: string; note?: string; createdAt: Timestamp; updatedAt: Timestamp }
export type CreateExpenseInput = Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>
