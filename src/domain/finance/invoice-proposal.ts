import type { ProjectActivity } from '@/domain/activity/types'
import type { ProjectChange } from '@/domain/project-change/types'
import type { ProjectItem } from '@/domain/project-item/types'
import type { Project } from '@/domain/project/types'
import { activityPrice, projectBase } from './account'
import type { FinanceLine, Invoice } from './types'

export interface ProjectInvoiceProposal {
  lines: FinanceLine[]
  discount: number
  target: number
  alreadyInvoiced: number
  remaining: number
  basis: 'contract' | 'services' | 'activities' | 'remaining'
}

export function buildProjectInvoiceProposal({ project, items, activities, changes, invoices }: {
  project: Project
  items: ProjectItem[]
  activities: ProjectActivity[]
  changes: ProjectChange[]
  invoices: Invoice[]
}): ProjectInvoiceProposal {
  const base = projectBase(project, items, activities)
  const projectChanges = changes.filter((change) => change.projectId === project.id && change.amount > 0)
  const extras = projectChanges.reduce((sum, change) => sum + change.amount, 0)
  const gross = Math.max(0, base.amount) + extras
  const discount = Math.min(Math.max(0, project.discount ?? 0), gross)
  const target = Math.max(0, gross - discount)
  const alreadyInvoiced = invoices
    .filter((invoice) => invoice.projectId === project.id && ['issued', 'paid'].includes(invoice.status))
    .reduce((sum, invoice) => sum + Math.max(0, invoice.total), 0)
  const remaining = Math.max(0, target - alreadyInvoiced)

  if (alreadyInvoiced > 0) {
    return {
      lines: remaining > 0 ? [{ id: crypto.randomUUID(), description: `باقیمانده کارکرد پروژه ${project.title}`, quantity: 1, unit: 'باقیمانده', unitPrice: remaining, total: remaining }] : [],
      discount: 0,
      target,
      alreadyInvoiced,
      remaining,
      basis: 'remaining',
    }
  }

  const projectActivities = activities.filter((activity) => activity.projectId === project.id && activityPrice(activity, items) !== undefined)
  const baseLines: FinanceLine[] = base.source === 'activities'
    ? projectActivities.map((activity) => {
      const item = items.find((candidate) => candidate.id === activity.projectItemId)
      const explicit = activity.amount !== undefined && activity.amount > 0
      const unitPrice = explicit ? activity.amount! : item?.unitPrice ?? 0
      const quantity = explicit ? 1 : activity.quantity ?? 1
      return { id: crypto.randomUUID(), description: `فعالیت: ${activity.title}`, quantity, unit: explicit ? 'فعالیت' : item?.unit, unitPrice, total: Math.round(quantity * unitPrice) }
    })
    : base.source === 'services'
      ? items.filter((item) => item.projectId === project.id && item.totalPrice > 0).map((item) => ({ id: crypto.randomUUID(), description: item.title, quantity: item.quantity, unit: item.unit, unitPrice: item.unitPrice, total: item.totalPrice }))
      : base.amount > 0 ? [{ id: crypto.randomUUID(), description: `توافق اولیه: ${project.title}`, quantity: 1, unit: 'قرارداد', unitPrice: base.amount, total: base.amount }] : []
  const changeLines: FinanceLine[] = projectChanges.map((change) => ({ id: crypto.randomUUID(), description: `کار اضافه: ${change.title}`, quantity: 1, unit: 'کار', unitPrice: change.amount, total: change.amount }))

  return { lines: [...baseLines, ...changeLines], discount, target, alreadyInvoiced, remaining, basis: base.source }
}
