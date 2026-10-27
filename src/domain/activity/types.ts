import type { ID, Timestamp } from '@/types'

export interface ProjectActivity {
  id: ID
  projectId: ID
  projectItemId?: ID      // اگر به یک آیتم خاص وصل باشد
  date: string            // YYYY-MM-DD
  title: string           // عنوان فعالیت (مثلاً: ۸ متر نور خطی نصب شد)
  quantity?: number       // مقدار کار انجام‌شده
  unit?: string
  /** مبلغ قطعی این فعالیت؛ در صورت ثبت، بر محاسبه مقدار × قیمت خدمت اولویت دارد. */
  amount?: number
  note?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type CreateProjectActivityInput = Omit<ProjectActivity, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateProjectActivityInput = Partial<CreateProjectActivityInput>
