import { db } from '@/db/db'
import type { CreateExpenseInput, Expense } from '@/domain/expense/types'
import type { ID } from '@/types'

export const expenseRepository = {
  getByProjectId: (projectId: ID) => db.expenses.where('projectId').equals(projectId).reverse().sortBy('date'),
  async create(input: CreateExpenseInput): Promise<Expense> {
    const now = Date.now(); const expense: Expense = { id: crypto.randomUUID(), ...input, title: input.title.trim(), amount: Math.round(input.amount), note: input.note?.trim(), createdAt: now, updatedAt: now }
    await db.expenses.add(expense); return expense
  },
  delete: (id: ID) => db.expenses.delete(id),
}
