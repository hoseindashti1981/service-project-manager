import type { ProjectStatus } from './types'
export const projectStatusOptions: { value: ProjectStatus; label: string }[] = [
  { value: 'draft', label: 'پیش‌نویس' },
  { value: 'planned', label: 'برنامه‌ریزی‌شده' },
  { value: 'active', label: 'فعال' },
  { value: 'in_progress', label: 'در جریان' },
  { value: 'paused', label: 'متوقف' },
  { value: 'completed', label: 'تکمیل‌شده' },
  { value: 'delivered', label: 'تحویل‌شده' },
  { value: 'cancelled', label: 'لغوشده' },
]
export const dashboardStatuses: ProjectStatus[] = ['draft', 'in_progress', 'active', 'planned']
export const projectStatusLabels = Object.fromEntries(projectStatusOptions.map((item) => [item.value, item.label]))
