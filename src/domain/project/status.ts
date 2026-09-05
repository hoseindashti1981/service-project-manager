import type { ProjectStatus } from './types'
export const projectStatusOptions: { value: ProjectStatus; label: string }[] = [
  { value: 'draft', label: 'پیش‌نویس' },
  { value: 'planned', label: 'برنامه‌ریزی‌شده' },
  { value: 'in_progress', label: 'در جریان' },
  { value: 'paused', label: 'متوقف' },
  { value: 'completed', label: 'تکمیل‌شده (آماده تحویل)' },
  { value: 'delivered', label: 'تحویل‌شده' },
  { value: 'cancelled', label: 'لغوشده' },
]
export const newProjectStatuses = projectStatusOptions.filter((item) => ['draft', 'planned', 'in_progress'].includes(item.value))
export const dashboardStatuses: ProjectStatus[] = ['draft', 'planned', 'in_progress', 'paused', 'completed']
export const projectStatusLabels: Record<string, string> = { ...Object.fromEntries(projectStatusOptions.map((item) => [item.value, item.label])), active: 'فعال قدیمی؛ نیازمند بررسی' }
export const executionDeadlineStatuses: ProjectStatus[] = ['draft', 'planned', 'in_progress', 'paused', 'active']
export const transitions: Record<ProjectStatus, ProjectStatus[]> = {
  draft: ['planned', 'in_progress', 'cancelled'],
  planned: ['draft', 'in_progress', 'cancelled'],
  in_progress: ['paused', 'completed', 'cancelled'],
  paused: ['in_progress', 'cancelled'],
  completed: ['delivered', 'in_progress', 'cancelled'],
  delivered: ['in_progress'],
  cancelled: ['draft', 'planned', 'in_progress'],
  active: ['draft', 'planned', 'in_progress'],
}
export function needsTransitionReason(from: ProjectStatus, to: ProjectStatus) {
  return to === 'paused' || to === 'cancelled' || from === 'paused' || from === 'cancelled' || (to === 'in_progress' && ['completed', 'delivered'].includes(from))
}
