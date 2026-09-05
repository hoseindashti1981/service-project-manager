import { db } from '@/db/db'
import { activityRepository, type ActivitySaveOptions } from './activity-repository'
import { projectItemRepository } from './project-item-repository'
import type { CreateProjectActivityInput } from '@/domain/activity/types'

/** Keep catalog attachment and activity saving atomic; a failed activity leaves no empty row. */
export async function saveCatalogActivity(input: CreateProjectActivityInput, serviceId: string, plannedQuantity: number, editingId?: string, options: ActivitySaveOptions = {}) {
  return db.transaction('rw', db.services, db.projects, db.projectItems, db.projectActivities, async () => {
    const service = await db.services.get(serviceId)
    if (!service?.isActive) throw new Error('خدمت انتخاب‌شده فعال نیست؛ فهرست را دوباره بررسی کنید.')
    let item = await db.projectItems.where('projectId').equals(input.projectId).filter((row) => row.serviceId === serviceId).first()
    if (!item) {
      if (!Number.isFinite(plannedQuantity) || plannedQuantity <= 0) throw new Error('مقدار کل خدمت در پروژه را وارد کنید.')
      const price = service.defaultUnitPrice ?? 0
      if (!Number.isSafeInteger(price) || price < 0 || !Number.isSafeInteger(Math.round(plannedQuantity * price))) throw new Error('قیمت پایه یا مقدار کل خدمت معتبر نیست.')
      item = await projectItemRepository.create({ projectId: input.projectId, serviceId, title: service.name, date: input.date, unit: service.defaultUnit, quantity: plannedQuantity, unitPrice: price, pricingType: 'PER_UNIT', description: service.description })
    }
    const activity = { ...input, projectItemId: item.id, unit: item.unit }
    return editingId ? activityRepository.update(editingId, activity, options) : activityRepository.create(activity, options)
  })
}
