import { db } from '@/db/db'
import type { Customer, CreateCustomerInput, UpdateCustomerInput } from '@/domain/customer/types'
import type { ID } from '@/types'

function generateId(): string {
  return crypto.randomUUID()
}

export const customerRepository = {
  /** دریافت همه مشتریان */
  async getAll(): Promise<Customer[]> {
    return db.customers.orderBy('createdAt').reverse().toArray()
  },

  /** دریافت یک مشتری با آیدی */
  async getById(id: ID): Promise<Customer | undefined> {
    return db.customers.get(id)
  },

  /** جستجو بر اساس نام یا موبایل */
  async search(query: string): Promise<Customer[]> {
    const lower = query.toLowerCase().trim()
    if (!lower) return this.getAll()

    return db.customers
      .filter((c) =>
        c.name.toLowerCase().includes(lower) ||
        c.mobile.includes(lower)
      )
      .toArray()
  },

  /** ایجاد مشتری جدید */
  async create(input: CreateCustomerInput): Promise<Customer> {
    const now = Date.now()

    const customer: Customer = {
      id: generateId(),
      name: input.name.trim(),
      mobile: input.mobile.trim(),
      description: input.description?.trim(),
      createdAt: now,
      updatedAt: now,
    }

    await db.customers.add(customer)
    return customer
  },

  /** ویرایش مشتری */
  async update(id: ID, input: UpdateCustomerInput): Promise<Customer> {
    const existing = await db.customers.get(id)
    if (!existing) {
      throw new Error('مشتری یافت نشد')
    }

    const updated: Customer = {
      ...existing,
      ...input,
      name: input.name?.trim() ?? existing.name,
      mobile: input.mobile?.trim() ?? existing.mobile,
      description: input.description?.trim() ?? existing.description,
      updatedAt: Date.now(),
    }

    await db.customers.put(updated)
    return updated
  },

  /** حذف مشتری (فعلاً Hard Delete - بعداً می‌توانیم Soft کنیم) */
  async delete(id: ID): Promise<void> {
    await db.customers.delete(id)
  },
}