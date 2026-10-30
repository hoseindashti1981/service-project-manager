import type { ProjectActivity } from './types'
import type { ProjectItem } from '@/domain/project-item/types'

const roundQuantity = (value: number) => Math.round(value * 1e6) / 1e6
const roundPercent = (value: number) => Math.round(value * 10) / 10

export function serviceProgress(item: ProjectItem, activities: ProjectActivity[]) {
  const completed = activities.filter((activity) => activity.projectItemId === item.id && activity.projectId === item.projectId && activity.unit === item.unit)
    .reduce((sum, activity) => sum + (Number.isFinite(activity.quantity) && (activity.quantity ?? 0) > 0 ? activity.quantity! : 0), 0)
  const roundedCompleted = roundQuantity(completed)
  const remaining = roundQuantity(Math.max(0, item.quantity - roundedCompleted))
  const extra = roundQuantity(Math.max(0, roundedCompleted - item.quantity))
  const percent = item.quantity <= 0 ? 0 : remaining === 0 ? 100 : Math.min(99.9, roundPercent(roundedCompleted / item.quantity * 100))
  return { completed: roundedCompleted, remaining, extra, percent }
}

export function overallServicePercent(items: ProjectItem[], activities: ProjectActivity[]) {
  if (!items.length) return 0
  const progresses = items.map((item) => serviceProgress(item, activities))
  const average = roundPercent(progresses.reduce((sum, progress) => sum + progress.percent, 0) / progresses.length)
  return progresses.some((progress) => progress.remaining > 0) ? Math.min(99.9, average) : 100
}
