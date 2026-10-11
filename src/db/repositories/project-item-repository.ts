import { requireDate } from '@/lib/dates'
import { db } from '@/db/db'
import type { ProjectItem, CreateProjectItemInput, UpdateProjectItemInput } from '@/domain/project-item/types'
import type { ID } from '@/types'

function generateId(): string {
  return crypto.randomUUID()
}

async function syncPlanningEstimate(projectId: ID): Promise<void> {
  const project = await db.projects.get(projectId)
  if (!project || project.pricingMode !== 'itemized' || !['draft','planned'].includes(project.status)) return
  const total = (await db.projectItems.where('projectId').equals(projectId).toArray()).reduce((sum,item)=>sum+item.totalPrice,0)
  await db.projects.update(projectId,{initialEstimateAmount:total,updatedAt:Date.now()})
}

export const projectItemRepository = {
  async getByProjectId(projectId: ID): Promise<ProjectItem[]> {
    return db.projectItems
      .where('projectId')
      .equals(projectId)
      .reverse()
      .sortBy('createdAt')
  },

  async getById(id: ID): Promise<ProjectItem | undefined> {
    return db.projectItems.get(id)
  },

  async create(input: CreateProjectItemInput): Promise<ProjectItem> {
    if (input.date !== undefined) requireDate(input.date)
    const now = Date.now()
    const totalPrice = Math.round(input.quantity * input.unitPrice)

    const item: ProjectItem = {
      id: generateId(),
      date: input.date,
      projectId: input.projectId,
      serviceId: input.serviceId,
      title: input.title.trim(),
      unit: input.unit,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      totalPrice,
      pricingType: input.pricingType,
      description: input.description?.trim(),
      createdAt: now,
      updatedAt: now,
    }

    await db.transaction('rw',[db.projectItems,db.projects],async()=>{await db.projectItems.add(item);await syncPlanningEstimate(item.projectId)})
    return item
  },

  async update(id: ID, input: UpdateProjectItemInput): Promise<ProjectItem> {
    if (input.date !== undefined) requireDate(input.date)
    const existing = await db.projectItems.get(id)
    if (!existing) throw new Error('آیتم پروژه یافت نشد')

    if (input.unit !== undefined && input.unit !== existing.unit && await db.projectActivities.where('projectItemId').equals(id).count()) throw new Error('واحد خدمت دارای فعالیت ثبت‌شده قابل تغییر نیست.')
    const quantity = input.quantity ?? existing.quantity
    const unitPrice = input.unitPrice ?? existing.unitPrice

    const updated: ProjectItem = {
      ...existing,
      ...input,
      title: input.title?.trim() ?? existing.title,
      description: input.description?.trim() ?? existing.description,
      totalPrice: Math.round(quantity * unitPrice),
      updatedAt: Date.now(),
    }

    await db.transaction('rw',[db.projectItems,db.projects],async()=>{await db.projectItems.put(updated);await syncPlanningEstimate(updated.projectId)})
    return updated
  },

  async delete(id: ID): Promise<void> {
    await db.transaction('rw', [db.projectItems, db.projectActivities,db.projects], async () => {
      const item = await db.projectItems.get(id)
      if (!item) return
      if (await db.projectActivities.where('projectItemId').equals(id).count()) throw new Error('این خدمت فعالیت ثبت‌شده دارد؛ ابتدا فعالیت‌های مرتبط را حذف یا منتقل کنید.')
      await db.projectItems.delete(id)
      await syncPlanningEstimate(item.projectId)
    })
  },
}
