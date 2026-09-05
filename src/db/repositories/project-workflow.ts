import { db } from '@/db/db'
import type { Project, ProjectStatus } from '@/domain/project/types'
import { transitions, needsTransitionReason } from '@/domain/project/status'
import { projectDates, statusHistory, validateProjectDates, effectiveStatusEvents, validateWorkflowChronology } from '@/domain/project/workflow'
import { requireDate, toISODate } from '@/lib/dates'
import { serviceProgress } from '@/domain/activity/progress'

export interface StatusChangeInput { to: ProjectStatus; effectiveDate: string; reason?: string; expectedStatus: ProjectStatus }
export async function changeProjectStatus(id: string, input: StatusChangeInput): Promise<Project> {
  return db.transaction('rw', db.projects, db.projectItems, db.projectActivities, async () => {
    const project = await db.projects.get(id)
    if (!project) throw new Error('پروژه یافت نشد.')
    if (project.status !== input.expectedStatus) throw new Error('وضعیت پروژه تغییر کرده است؛ اطلاعات را تازه کنید.')
    if (!transitions[project.status].includes(input.to)) throw new Error('این تغییر وضعیت مجاز نیست.')
    requireDate(input.effectiveDate)
    if (input.effectiveDate > toISODate()) throw new Error('تاریخ مؤثر تغییر وضعیت نمی‌تواند در آینده باشد.')
    const history = statusHistory(project)
    const previous = effectiveStatusEvents(project).at(-1)
    if (project.statusHistory?.length && previous && input.effectiveDate < previous.effectiveDate) throw new Error('تاریخ تغییر وضعیت نمی‌تواند قبل از آخرین تغییر وضعیت باشد.')
    if (needsTransitionReason(project.status, input.to) && !input.reason?.trim()) throw new Error('علت توقف، لغو، ادامه یا بازگشایی را وارد کنید.')
    const activities = await db.projectActivities.where('projectId').equals(id).toArray()
    if (['draft', 'planned'].includes(input.to) && activities.length) throw new Error('این پروژه فعالیت ثبت‌شده دارد؛ وضعیت در جریان را با تاریخ شروع صحیح انتخاب کنید.')
    if (input.to === 'completed') {
      const items = await db.projectItems.where('projectId').equals(id).toArray()
      if (items.some((item) => serviceProgress(item, activities).remaining > 0) && !input.reason?.trim()) throw new Error('بخشی از خدمات هنوز باقی مانده است؛ دلیل تکمیل پروژه را وارد کنید.')
    }
    const updated: Project = { ...project, status: input.to, updatedAt: Date.now() }
    if (['draft', 'planned'].includes(input.to) && project.status === 'cancelled') { updated.executionStartDate = undefined; updated.actualEndDate = undefined; updated.deliveryDate = undefined }
    if (input.to === 'planned' && !updated.agreementDate) updated.agreementDate = input.effectiveDate
    if (input.to === 'in_progress') {
      if (!updated.executionStartDate) updated.executionStartDate = input.effectiveDate
      if (['completed', 'delivered', 'cancelled'].includes(project.status)) { updated.actualEndDate = undefined; updated.deliveryDate = undefined }
      if (!['paused', 'completed', 'delivered', 'cancelled'].includes(project.status) && activities.some((activity) => activity.date < input.effectiveDate)) throw new Error('شروع اجرا باید در تاریخ اولین فعالیت یا قبل از آن باشد.')
    }
    if (input.to === 'completed') updated.actualEndDate = input.effectiveDate
    if (input.to === 'delivered') updated.deliveryDate = input.effectiveDate
    if (['paused', 'completed', 'cancelled'].includes(input.to) && activities.some((activity) => activity.date > input.effectiveDate)) throw new Error('فعالیت ثبت‌شده بعد از این تاریخ وجود دارد؛ تاریخ تغییر وضعیت را بررسی کنید.')
    validateProjectDates(updated, true)
    updated.statusHistory = [...history, { id: crypto.randomUUID(), kind: 'status', from: project.status, to: input.to, effectiveDate: input.effectiveDate, recordedAt: updated.updatedAt, reason: input.reason?.trim(), datesBefore: projectDates(project), datesAfter: projectDates(updated) }]
    validateWorkflowChronology(updated)
    await db.projects.put(updated)
    return updated
  })
}
