import { toISODate } from '@/lib/dates'
import { projectDates, statusHistory, validateProjectDates, validateWorkflowChronology } from '@/domain/project/workflow'
import { newProjectStatuses } from '@/domain/project/status'
import { db } from '@/db/db'
import type { Project, CreateProjectInput, UpdateProjectInput, ProjectStatus } from '@/domain/project/types'
import type { ID } from '@/types'

function generateId(): string {
  return crypto.randomUUID()
}

export const projectRepository = {
  /** دریافت همه پروژه‌ها */
  async getAll(): Promise<Project[]> {
    return db.projects.orderBy('createdAt').reverse().toArray()
  },

  /** دریافت یک پروژه با آیدی */
  async getById(id: ID): Promise<Project | undefined> {
    return db.projects.get(id)
  },

  /** دریافت پروژه‌های یک مشتری */
  async getByCustomerId(customerId: ID): Promise<Project[]> {
    return db.projects
      .where('customerId')
      .equals(customerId)
      .reverse()
      .sortBy('createdAt')
  },

  /** دریافت پروژه‌ها بر اساس وضعیت */
  async getByStatus(status: ProjectStatus): Promise<Project[]> {
    return db.projects
      .where('status')
      .equals(status)
      .reverse()
      .sortBy('createdAt')
  },

  /** جستجو بر اساس عنوان یا آدرس */
  async search(query: string): Promise<Project[]> {
    const lower = query.toLowerCase().trim()
    if (!lower) return this.getAll()

    return db.projects
      .filter((p) =>
        p.title.toLowerCase().includes(lower) ||
        (p.address?.toLowerCase().includes(lower) ?? false)
      )
      .toArray()
  },

  /** ایجاد پروژه جدید */
  async create(input: CreateProjectInput): Promise<Project> {
    if (!newProjectStatuses.some((option) => option.value === input.status)) throw new Error('برای پروژه جدید وضعیت پیش‌نویس، برنامه‌ریزی‌شده یا در جریان انتخاب کنید.')
    validateProjectDates(input, true)
    const now = Date.now()

    const project: Project = {
      id: generateId(),
      customerId: input.customerId,
      title: input.title.trim(),
      address: input.address?.trim(),
      latitude: input.latitude,
      longitude: input.longitude,
      workType: input.workType?.trim(),
      contractAmount: input.contractAmount ?? 0,
      agreementDate: input.agreementDate,
      executionStartDate: input.executionStartDate,
      deliveryDate: input.deliveryDate,
      startDate: input.startDate,
      plannedEndDate: input.plannedEndDate,
      actualEndDate: input.actualEndDate,
      status: input.status || 'draft',
      description: input.description?.trim(),
      createdAt: now,
      updatedAt: now,
    }

    project.statusHistory = [{ id: crypto.randomUUID(), kind: 'status', from: null, to: project.status, effectiveDate: project.executionStartDate || project.agreementDate || (project.startDate && project.startDate < toISODate() ? project.startDate : toISODate()), recordedAt: now, reason: 'ثبت اولیه پروژه', datesAfter: projectDates(project) }]
    await db.projects.add(project)
    return project
  },

  /** ویرایش پروژه */
  async update(id: ID, input: UpdateProjectInput): Promise<Project> {
    return db.transaction('rw', db.projects, db.projectActivities, async () => {
    const existing = await db.projects.get(id)
    if (!existing) {
      throw new Error('پروژه یافت نشد')
    }

    if (input.status !== undefined && input.status !== existing.status) throw new Error('برای تغییر وضعیت از بخش گردش‌کار پروژه استفاده کنید.')
    const updated: Project = {
      ...existing,
      ...input,
      statusHistory: existing.statusHistory,
      activityAudit: existing.activityAudit,
      title: input.title?.trim() ?? existing.title,
      address: input.address?.trim() ?? existing.address,
      workType: input.workType?.trim() ?? existing.workType,
      description: input.description?.trim() ?? existing.description,
      updatedAt: Date.now(),
    }

    validateProjectDates(updated, !!existing.statusHistory?.length)
    if (JSON.stringify(projectDates(existing)) !== JSON.stringify(projectDates(updated))) {
      const activities = await db.projectActivities.where('projectId').equals(id).toArray()
      if (updated.executionStartDate && activities.some((activity) => activity.date < updated.executionStartDate!)) throw new Error('فعالیت قبل از تاریخ شروع اجرای انتخاب‌شده ثبت شده است.')
      if (updated.actualEndDate && activities.some((activity) => activity.date > updated.actualEndDate!)) throw new Error('فعالیت بعد از تاریخ پایان اجرای انتخاب‌شده ثبت شده است.')
      updated.statusHistory = [...statusHistory(existing), { id: crypto.randomUUID(), kind: 'dates', from: existing.status, to: existing.status, effectiveDate: toISODate(), recordedAt: updated.updatedAt, reason: 'اصلاح تاریخ‌های پروژه', datesBefore: projectDates(existing), datesAfter: projectDates(updated) }]
    }
    validateWorkflowChronology(updated)
    await db.projects.put(updated)
    return updated
    })
  },

  /** حذف پروژه */
  async delete(id: ID): Promise<void> {
    await db.projects.delete(id)
  },
}
