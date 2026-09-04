import { db } from '@/db/db'
import type { CreateProjectChangeInput, ProjectChange } from '@/domain/project-change/types'
import type { ID } from '@/types'

export const projectChangeRepository = {
  getByProjectId: (projectId: ID) => db.projectChanges.where('projectId').equals(projectId).reverse().sortBy('date'),
  async create(input: CreateProjectChangeInput): Promise<ProjectChange> {
    const now = Date.now(); const change: ProjectChange = { id: crypto.randomUUID(), ...input, title: input.title.trim(), amount: Math.round(input.amount), note: input.note?.trim(), createdAt: now, updatedAt: now }
    await db.projectChanges.add(change); return change
  },
  delete: (id: ID) => db.projectChanges.delete(id),
}
