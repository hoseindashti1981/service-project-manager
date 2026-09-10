import { requireDate } from '@/lib/dates'
import { db } from '@/db/db'
import type { CreateProjectChangeInput, ProjectChange } from '@/domain/project-change/types'
import type { ID } from '@/types'

export const projectChangeRepository = {
  getByProjectId: (projectId: ID) => db.projectChanges.where('projectId').equals(projectId).reverse().sortBy('date'),
  async create(input: CreateProjectChangeInput): Promise<ProjectChange> {
    requireDate(input.date)
    const now = Date.now(); const change: ProjectChange = { id: crypto.randomUUID(), ...input, title: input.title.trim(), amount: Math.round(input.amount), note: input.note?.trim(), createdAt: now, updatedAt: now }
    await db.projectChanges.add(change); return change
  },
  async update(id: ID, input: Omit<CreateProjectChangeInput, 'projectId'>, expected: number) {
    requireDate(input.date)
    if (!input.title.trim() || !Number.isSafeInteger(input.amount) || input.amount < 0) throw Error('شرح و مبلغ معتبر وارد کنید.')
    return db.transaction('rw', db.projectChanges, async () => {
      const old = await db.projectChanges.get(id)
      if (!old || old.updatedAt !== expected) throw Error('کار اضافه تغییر کرده یا حذف شده؛ دوباره باز کنید.')
      await db.projectChanges.put({...old, title: input.title.trim(), amount: input.amount, date: input.date, note: input.note?.trim(), updatedAt: Math.max(Date.now(), old.updatedAt + 1)})
    })
  },
  async delete(id: ID, expected?: number) {
    return db.transaction('rw', db.projectChanges, async () => {
      const old = await db.projectChanges.get(id)
      if (!old || (expected !== undefined && old.updatedAt !== expected)) throw Error('کار اضافه تغییر کرده یا حذف شده؛ دوباره بررسی کنید.')
      await db.projectChanges.delete(id)
    })
  },
}
