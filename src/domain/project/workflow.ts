import type { Project, ProjectStatusEntry } from './types'
import { requireDate, toISODate } from '@/lib/dates'
export const projectDateFields = ['startDate', 'agreementDate', 'executionStartDate', 'plannedEndDate', 'actualEndDate', 'deliveryDate'] as const
export function projectDates(project: Partial<Project>) {
  return Object.fromEntries(projectDateFields.map((key) => [key, project[key]]))
}
export function validateProjectDates(project: Partial<Project>, requireMilestones = false) {
  for (const key of projectDateFields) if (project[key]) requireDate(project[key]!)
  for (const key of ['agreementDate', 'executionStartDate', 'actualEndDate', 'deliveryDate'] as const) {
    if (project[key] && project[key]! > toISODate()) throw new Error('تاریخ واقعی نمی‌تواند در آینده باشد.')
  }
  const ordered = [project.agreementDate, project.executionStartDate, project.actualEndDate, project.deliveryDate].filter((value): value is string => !!value)
  for (let i = 1; i < ordered.length; i++) if (ordered[i] < ordered[i - 1]) throw new Error('ترتیب تاریخ توافق، شروع اجرا، پایان اجرا و تحویل معتبر نیست.')
  if (project.startDate && project.plannedEndDate && project.plannedEndDate < project.startDate) throw new Error('موعد پایان نمی‌تواند قبل از تاریخ پروژه باشد.')
  if (requireMilestones) {
    if (project.status === 'planned' && !project.agreementDate) throw new Error('تاریخ توافق را انتخاب کنید.')
    if (['in_progress', 'paused', 'completed', 'delivered'].includes(project.status || '') && !project.executionStartDate) throw new Error('تاریخ شروع اجرای واقعی را انتخاب کنید.')
    if (['completed', 'delivered'].includes(project.status || '') && !project.actualEndDate) throw new Error('تاریخ پایان اجرای واقعی را انتخاب کنید.')
    if (project.status === 'delivered' && !project.deliveryDate) throw new Error('تاریخ تحویل را انتخاب کنید.')
  }
}
/** A legacy baseline preserves the old label; it never guesses that active meant execution. */
export function statusHistory(project: Project): ProjectStatusEntry[] {
  return project.statusHistory?.length ? project.statusHistory : [{ id: `legacy-${project.id}`, kind: 'status', from: null, to: project.status, effectiveDate: project.executionStartDate || project.startDate || toISODate(new Date(project.createdAt)), recordedAt: project.createdAt, reason: 'وضعیت موجود پیش از فعال‌سازی گردش‌کار؛ تاریخ شروع اجرا در صورت نیاز بررسی شود.' }]
}
export function effectiveStatusEvents(project: Project): ProjectStatusEntry[] {
  const events = statusHistory(project).filter((entry) => entry.kind === 'status').map((entry) => ({ ...entry }))
  const start = events.find((entry) => entry.to === 'in_progress')
  if (start && project.executionStartDate) start.effectiveDate = project.executionStartDate
  const end = events.filter((entry) => entry.to === 'completed').at(-1)
  if (end && project.actualEndDate) end.effectiveDate = project.actualEndDate
  const delivery = events.filter((entry) => entry.to === 'delivered').at(-1)
  if (delivery && project.deliveryDate) delivery.effectiveDate = project.deliveryDate
  return events
}
export function validateWorkflowChronology(project: Project) {
  const events = effectiveStatusEvents(project).filter((entry) => entry.from !== null || entry.to === 'in_progress')
  for (let index = 1; index < events.length; index++) if (events[index].effectiveDate < events[index - 1].effectiveDate) throw new Error('اصلاح تاریخ با ترتیب دوره‌های توقف، ادامه یا تحویل سازگار نیست.')
}
export function executionAllowedOn(project: Project, date: string): boolean {
  const events = effectiveStatusEvents(project).filter((entry) => entry.kind === 'status' && entry.effectiveDate <= date)
  const latest = events.at(-1)
  if (latest?.to === 'in_progress') return !project.executionStartDate || date >= project.executionStartDate
  // Work completed earlier on the effective closing day is part of that execution period.
  return !!latest && latest.effectiveDate === date && latest.from === 'in_progress' && ['paused', 'completed', 'cancelled'].includes(latest.to)
}
export function validateExecutionEntry(project: Project, date: string, historical: boolean, reason?: string, originalDate?: string) {
  requireDate(date)
  if (date > toISODate()) throw new Error('فعالیت انجام‌شده نمی‌تواند تاریخ آینده داشته باشد.')
  if (project.status === 'active') throw new Error('ابتدا وضعیت فعال قدیمی را در صفحه پروژه بررسی و تعیین کنید.')
  if (project.status === 'in_progress') {
    if (!executionAllowedOn(project, date)) throw new Error('تاریخ فعالیت باید در یکی از دوره‌های اجرای پروژه باشد.')
    return
  }
  if (originalDate !== undefined && date === originalDate) {
    if (!reason?.trim()) throw new Error('برای اصلاح فعالیت پروژه بسته یا متوقف، دلیل اصلاح را وارد کنید.')
    return
  }
  if (!historical || date >= toISODate() || !executionAllowedOn(project, date) || !reason?.trim()) throw new Error('برای اجرای جدید ابتدا پروژه را شروع یا بازگشایی کنید؛ ثبت دیرهنگام فقط برای روزهای اجرای گذشته و با توضیح مجاز است.')
}
