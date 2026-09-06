import type { ID, Timestamp } from '@/types'

export interface ProjectActivity {
  id: ID
  projectId: ID
  projectItemId?: ID      // اگر به یک آیتم خاص وصل باشد
  date: string            // YYYY-MM-DD
  title: string           // عنوان فعالیت (مثلاً: ۸ متر نور خطی نصب شد)
  quantity?: number       // مقدار کار انجام‌شده
  unit?: string
  /** Informational only; never changes contract or receivables. */
  amount?: number
  note?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type CreateProjectActivityInput = Omit<ProjectActivity, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateProjectActivityInput = Partial<CreateProjectActivityInput>