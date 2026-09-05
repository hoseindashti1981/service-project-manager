import type { ID, Timestamp } from '@/types'

export type ReminderStatus = 'open' | 'done'

/** یادآوری محلی؛ بدون وابستگی به اینترنت یا اعلان سیستمی. */
export interface Reminder {
  id: ID
  title: string
  dueDate: string
  projectId?: ID
  note?: string
  status: ReminderStatus
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type CreateReminderInput = Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateReminderInput = Partial<CreateReminderInput>
