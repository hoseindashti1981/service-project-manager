import { validateServicePrice } from '@/domain/service/helpers'
import { db } from '@/db/db'
import type { Service, CreateServiceInput } from '@/domain/service/types'
import type { ID } from '@/types'

function generateId(): string {
  return crypto.randomUUID()
}

export const serviceRepository = {
  /** دریافت همه سرویس‌ها */
  async getAll(): Promise<Service[]> {
    return db.services.orderBy('name').toArray()
  },

  /** دریافت سرویس‌های فعال */
  async getActive(): Promise<Service[]> {
    return db.services.filter((s) => s.isActive).toArray()
  },

  /** دریافت یک سرویس با آیدی */
  async getById(id: ID): Promise<Service | undefined> {
    return db.services.get(id)
  },

  /** ایجاد سرویس جدید */
  async create(input: CreateServiceInput): Promise<Service> {
    if (!input.name.trim()) throw new Error('نام خدمت را وارد کنید.')
    const now = Date.now()

    const service: Service = {
      id: generateId(),
      name: input.name.trim(),
      defaultUnit: input.defaultUnit,
      defaultUnitPrice: validateServicePrice(input.defaultUnitPrice ?? 0),
      description: input.description?.trim(),
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    }

    await db.services.add(service)
    return service
  },

  /** ویرایش سرویس */
  async update(id: ID, input: Partial<CreateServiceInput>): Promise<Service> {
    const existing = await db.services.get(id)
    if (!existing) {
      throw new Error('سرویس یافت نشد')
    }

    if (input.name !== undefined && !input.name.trim()) throw new Error('نام خدمت را وارد کنید.')
    const updated: Service = {
      ...existing,
      ...input,
      name: input.name?.trim() ?? existing.name,
      description: input.description?.trim() ?? existing.description,
      defaultUnitPrice: input.defaultUnitPrice === undefined ? (existing.defaultUnitPrice ?? 0) : validateServicePrice(input.defaultUnitPrice),
      updatedAt: Date.now(),
    }

    await db.services.put(updated)
    return updated
  },

  /** حذف سرویس */
  async delete(id: ID): Promise<void> {
    await db.services.delete(id)
  },
}
