import type { ProjectActivity } from './types'
import type { ProjectItem } from '@/domain/project-item/types'
export function serviceProgress(item: ProjectItem, activities: ProjectActivity[]) {
  const completed = activities.filter((activity) => activity.projectItemId === item.id && activity.projectId === item.projectId && activity.unit === item.unit)
    .reduce((sum, activity) => sum + (Number.isFinite(activity.quantity) && (activity.quantity ?? 0) > 0 ? activity.quantity! : 0), 0)
  const round = (value: number) => Math.round(value * 1e6) / 1e6
  return { completed: round(completed), remaining: round(Math.max(0, item.quantity - completed)), extra: round(Math.max(0, completed - item.quantity)), percent: item.quantity > 0 ? Math.min(100, Math.round(completed / item.quantity * 100)) : 0 }
}
