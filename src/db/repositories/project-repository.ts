import { requireDate } from '@/lib/dates'
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
    validateDates(input)
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
      startDate: input.startDate,
      plannedEndDate: input.plannedEndDate,
      actualEndDate: input.actualEndDate,
      status: input.status || 'draft',
      description: input.description?.trim(),
      createdAt: now,
      updatedAt: now,
    }

    await db.projects.add(project)
    return project
  },

  /** ویرایش پروژه */
  async update(id: ID, input: UpdateProjectInput): Promise<Project> {
    const existing = await db.projects.get(id)
    if (!existing) {
      throw new Error('پروژه یافت نشد')
    }

    const updated: Project = {
      ...existing,
      ...input,
      title: input.title?.trim() ?? existing.title,
      address: input.address?.trim() ?? existing.address,
      workType: input.workType?.trim() ?? existing.workType,
      description: input.description?.trim() ?? existing.description,
      updatedAt: Date.now(),
    }

    validateDates(updated)
    await db.projects.put(updated)
    return updated
  },

  /** حذف پروژه */
  async delete(id: ID): Promise<void> {
    await db.projects.delete(id)
  },
}

function validateDates(input: UpdateProjectInput) {
  for (const date of [input.startDate, input.plannedEndDate, input.actualEndDate]) if (date !== undefined) requireDate(date)
  if (input.startDate && ((input.plannedEndDate && input.plannedEndDate < input.startDate) || (input.actualEndDate && input.actualEndDate < input.startDate))) throw new Error('تاریخ پایان نمی‌تواند قبل از تاریخ پروژه باشد.')
}
