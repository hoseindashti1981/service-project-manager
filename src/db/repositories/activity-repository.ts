import { requireDate, toISODate } from '@/lib/dates'
import { db } from '@/db/db'
import type { ProjectActivity, CreateProjectActivityInput, UpdateProjectActivityInput } from '@/domain/activity/types'
import type { ActivityAuditEntry } from '@/domain/project/types'
import { validateExecutionEntry } from '@/domain/project/workflow'
import { changeProjectStatus } from './project-workflow'
import type { ID } from '@/types'

export interface ActivitySaveOptions { startExecution?: boolean; historical?: boolean; reason?: string }
export const activityRepository = {
  getAll: (): Promise<ProjectActivity[]> => db.projectActivities.orderBy('date').reverse().toArray(),
  getByProjectId: (projectId: ID): Promise<ProjectActivity[]> => db.projectActivities.where('projectId').equals(projectId).reverse().sortBy('date'),
  getByDate: (date: string): Promise<ProjectActivity[]> => db.projectActivities.where('date').equals(date).reverse().sortBy('createdAt'),
  getToday(): Promise<ProjectActivity[]> { return this.getByDate(toISODate()) },
  getById: (id: ID): Promise<ProjectActivity | undefined> => db.projectActivities.get(id),
  async create(input: CreateProjectActivityInput, options: ActivitySaveOptions = {}): Promise<ProjectActivity> {
    return db.transaction('rw', db.projects, db.projectItems, db.projectActivities, async () => {
      await validateActivity(input)
      let project = await db.projects.get(input.projectId)
      if (!project) throw new Error('پروژه یافت نشد.')
      if (options.startExecution) {
        if (!['draft', 'planned'].includes(project.status)) throw new Error('وضعیت پروژه تغییر کرده است؛ دوباره بررسی کنید.')
        project = await changeProjectStatus(project.id, { to: 'in_progress', expectedStatus: project.status, effectiveDate: input.date, reason: 'شروع اجرا با تأیید کاربر هنگام ثبت اولین فعالیت' })
      }
      validateExecutionEntry(project, input.date, !!options.historical, options.reason)
      const now = Date.now()
      const activity: ProjectActivity = { ...input, id: crypto.randomUUID(), title: input.title.trim(), note: input.note?.trim(), createdAt: now, updatedAt: now }
      await db.projectActivities.add(activity)
      await audit(input.projectId, { id: crypto.randomUUID(), activityId: activity.id, action: 'create', after: activity, reason: options.reason?.trim(), recordedAt: now })
      return activity
    })
  },
  async update(id: ID, input: UpdateProjectActivityInput, options: ActivitySaveOptions = {}): Promise<ProjectActivity> {
    return db.transaction('rw', db.projects, db.projectItems, db.projectActivities, async () => {
      const existing = await db.projectActivities.get(id)
      if (!existing) throw new Error('فعالیت یافت نشد.')
      if (!options.reason?.trim()) throw new Error('دلیل اصلاح فعالیت را وارد کنید.')
      if (input.projectId !== undefined && input.projectId !== existing.projectId) throw new Error('پروژه فعالیت قبلی قابل تغییر نیست؛ فعالیت را با ثبت دلیل حذف و در پروژه صحیح ثبت کنید.')
      const updated = { ...existing, ...input, title: input.title?.trim() ?? existing.title, updatedAt: Date.now() }
      await validateActivity(updated)
      const project = await db.projects.get(updated.projectId)
      if (!project) throw new Error('پروژه یافت نشد.')
      validateExecutionEntry(project, updated.date, !!options.historical, options.reason, existing.date)
      await db.projectActivities.put(updated)
      await audit(project.id, { id: crypto.randomUUID(), activityId: id, action: 'update', before: existing, after: updated, reason: options.reason.trim(), recordedAt: updated.updatedAt })
      return updated
    })
  },
  async delete(id: ID, reason?: string): Promise<void> {
    return db.transaction('rw', db.projects, db.projectActivities, async () => {
      if (!reason?.trim()) throw new Error('دلیل حذف فعالیت را وارد کنید.')
      const existing = await db.projectActivities.get(id)
      if (!existing) throw new Error('فعالیت یافت نشد.')
      await audit(existing.projectId, { id: crypto.randomUUID(), activityId: id, action: 'delete', before: existing, reason: reason.trim(), recordedAt: Date.now() })
      await db.projectActivities.delete(id)
    })
  },
}
async function audit(projectId: string, entry: ActivityAuditEntry) {
  const project = await db.projects.get(projectId)
  if (!project) throw new Error('پروژه یافت نشد.')
  await db.projects.update(projectId, { activityAudit: [...(project.activityAudit || []), entry], updatedAt: Date.now() })
}
async function validateActivity(input: CreateProjectActivityInput) {
  requireDate(input.date)
  if (!input.title.trim()) throw new Error('عنوان فعالیت را وارد کنید.')
  if (input.quantity !== undefined && (!Number.isFinite(input.quantity) || input.quantity <= 0)) throw new Error('مقدار کار باید عدد مثبت باشد.')
  if (input.projectItemId) {
    const item = await db.projectItems.get(input.projectItemId)
    if (!item || item.projectId !== input.projectId) throw new Error('خدمت انتخاب‌شده متعلق به این پروژه نیست.')
    if (input.quantity === undefined) throw new Error('مقدار انجام‌شده را وارد کنید.')
    if (input.unit !== item.unit) throw new Error('واحد فعالیت باید با خدمت پروژه یکسان باشد.')
  }
}
