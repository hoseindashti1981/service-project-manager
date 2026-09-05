import { requireDate, toISODate } from '@/lib/dates'
import { db } from '@/db/db'
import type { ProjectActivity, CreateProjectActivityInput, UpdateProjectActivityInput } from '@/domain/activity/types'
import type { ID } from '@/types'

function generateId(): string {
  return crypto.randomUUID()
}

export const activityRepository = {
  async getAll(): Promise<ProjectActivity[]> {
    return db.projectActivities.orderBy('date').reverse().toArray()
  },

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
    const today = toISODate()
    return this.getByDate(today)
  },

  async getById(id: ID): Promise<ProjectActivity | undefined> {
    return db.projectActivities.get(id)
  },

  async create(input: CreateProjectActivityInput): Promise<ProjectActivity> {
    await validateActivity(input)
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

    await validateActivity(updated)
    await db.projectActivities.put(updated)
    return updated
  },

  async delete(id: ID): Promise<void> {
    await db.projectActivities.delete(id)
  },
}

async function validateActivity(input: CreateProjectActivityInput) {
  requireDate(input.date)
  if (!input.title.trim()) throw new Error('عنوان فعالیت را وارد کنید.')
  if (!await db.projects.get(input.projectId)) throw new Error('پروژه یافت نشد.')
  if (input.quantity !== undefined && (!Number.isFinite(input.quantity) || input.quantity <= 0)) throw new Error('مقدار کار باید عدد مثبت باشد.')
  if (input.projectItemId) {
    const item = await db.projectItems.get(input.projectItemId)
    if (!item || item.projectId !== input.projectId) throw new Error('خدمت انتخاب‌شده متعلق به این پروژه نیست.')
    if (input.quantity === undefined) throw new Error('مقدار انجام‌شده را وارد کنید.')
    if (input.unit !== item.unit) throw new Error('واحد فعالیت باید با خدمت پروژه یکسان باشد.')
  }
}
