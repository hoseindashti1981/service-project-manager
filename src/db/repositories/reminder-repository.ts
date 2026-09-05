import { db } from '@/db/db'
import type { CreateReminderInput, Reminder, UpdateReminderInput } from '@/domain/reminder/types'
import type { ID } from '@/types'

export const reminderRepository = {
  async getAll(): Promise<Reminder[]> {
    return db.reminders.orderBy('dueDate').toArray()
  },

  async getOpen(): Promise<Reminder[]> {
    const reminders = await db.reminders.where('status').equals('open').toArray()
    return reminders.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  },

  async create(input: CreateReminderInput): Promise<Reminder> {
    const timestamp = Date.now()
    const reminder: Reminder = {
      id: crypto.randomUUID(),
      title: input.title.trim(),
      dueDate: input.dueDate,
      projectId: input.projectId || undefined,
      note: input.note?.trim() || undefined,
      status: input.status ?? 'open',
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    await db.reminders.add(reminder)
    return reminder
  },

  async update(id: ID, input: UpdateReminderInput): Promise<Reminder> {
    const current = await db.reminders.get(id)
    if (!current) throw new Error('یادآوری یافت نشد')
    const updated = { ...current, ...input, title: input.title?.trim() ?? current.title, updatedAt: Date.now() }
    await db.reminders.put(updated)
    return updated
  },

  async toggleDone(id: ID): Promise<Reminder> {
    const reminder = await db.reminders.get(id)
    if (!reminder) throw new Error('یادآوری یافت نشد')
    return this.update(id, { status: reminder.status === 'done' ? 'open' : 'done' })
  },

  async delete(id: ID): Promise<void> {
    await db.reminders.delete(id)
  },
}
