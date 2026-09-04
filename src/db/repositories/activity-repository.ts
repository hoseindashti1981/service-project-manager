import { db } from '@/db/db'
import type { ProjectActivity, CreateProjectActivityInput, UpdateProjectActivityInput } from '@/domain/activity/types'
import type { ID } from '@/types'

function generateId(): string {
  return crypto.randomUUID()
}

export const activityRepository = {
  async getByProjectId(projectId: ID): Promise<ProjectActivity[]> {
    return db.projectActivities
      .where('projectId')
      .equals(projectId)
      .reverse()
      .sortBy('date')
  },

  async getByDate(date: string): Promise<ProjectActivity[]> {
    return db.projectActivities
      .where('date')
      .equals(date)
      .reverse()
      .sortBy('createdAt')
  },

  async getToday(): Promise<ProjectActivity[]> {
    const today = new Date().toISOString().slice(0, 10)
    return this.getByDate(today)
  },

  async getById(id: ID): Promise<ProjectActivity | undefined> {
    return db.projectActivities.get(id)
  },

  async create(input: CreateProjectActivityInput): Promise<ProjectActivity> {
    const now = Date.now()

    const activity: ProjectActivity = {
      id: generateId(),
      projectId: input.projectId,
      projectItemId: input.projectItemId,
      date: input.date,
      title: input.title.trim(),
      quantity: input.quantity,
      unit: input.unit,
      note: input.note?.trim(),
      createdAt: now,
      updatedAt: now,
    }

    await db.projectActivities.add(activity)
    return activity
  },

  async update(id: ID, input: UpdateProjectActivityInput): Promise<ProjectActivity> {
    const existing = await db.projectActivities.get(id)
    if (!existing) throw new Error('فعالیت یافت نشد')

    const updated: ProjectActivity = {
      ...existing,
      ...input,
      title: input.title?.trim() ?? existing.title,
      note: input.note?.trim() ?? existing.note,
      updatedAt: Date.now(),
    }

    await db.projectActivities.put(updated)
    return updated
  },

  async delete(id: ID): Promise<void> {
    await db.projectActivities.delete(id)
  },
}