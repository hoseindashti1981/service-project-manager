import { db } from '@/db/db'
import { aggregateFinancialPositions, projectFinancialPosition } from '@/domain/finance/financial-position'

export async function readProjectFinancialPosition(projectId: string) {
  const project = await db.projects.get(projectId)
  if (!project) throw new Error('پروژه یافت نشد.')
  const [changes, payments, invoices, items, activities, expenses, materials] = await Promise.all([
    db.projectChanges.where('projectId').equals(projectId).toArray(),
    db.payments.toArray(),
    db.invoices.toArray(),
    db.projectItems.where('projectId').equals(projectId).toArray(),
    db.projectActivities.where('projectId').equals(projectId).toArray(),
    db.expenses.where('projectId').equals(projectId).toArray(),
    db.materials.where('projectId').equals(projectId).toArray(),
  ])
  return projectFinancialPosition({ project, changes, payments, invoices, items, activities, expenses, materials })
}

export async function readAccountingPositions(customerId?: string) {
  const [projects, changes, payments, invoices, items, activities, expenses, materials] = await Promise.all([
    db.projects.toArray(),
    db.projectChanges.toArray(),
    db.payments.toArray(),
    db.invoices.toArray(),
    db.projectItems.toArray(),
    db.projectActivities.toArray(),
    db.expenses.toArray(),
    db.materials.toArray(),
  ])
  const selected = projects.filter((project) => !customerId || project.customerId === customerId)
  return selected.map((project) => projectFinancialPosition({ project, changes, payments, invoices, items, activities, expenses, materials }))
}

export async function readAccountingTotals(customerId?: string) {
  const [positions, invoices, payments] = await Promise.all([
    readAccountingPositions(customerId),
    db.invoices.toArray(),
    db.payments.toArray(),
  ])
  return aggregateFinancialPositions(positions, {
    invoices: invoices.filter((invoice) => !customerId || invoice.customerId === customerId),
    payments: payments.filter((payment) => !customerId || payment.customerId === customerId),
  })
}
