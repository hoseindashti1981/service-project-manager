import type { ProjectActivity } from '@/domain/activity/types'
import type { Expense } from '@/domain/expense/types'
import type { Material } from '@/domain/material/types'
import type { ProjectChange } from '@/domain/project-change/types'
import type { ProjectItem } from '@/domain/project-item/types'
import type { Project, ProjectStatus } from '@/domain/project/types'
import type { Invoice, Payment } from './types'

export type AccountingStage = 'forecast' | 'accruing' | 'paused' | 'finalizable' | 'finalized' | 'cancelled'
export type FinancialWarning =
  | 'priced-work-before-execution'
  | 'payment-without-issued-invoice'
  | 'completed-with-unbilled-balance'
  | 'delivered-with-unbilled-balance'
  | 'invoice-exceeds-earned-work'

export interface ProjectFinancialPosition {
  projectId: string
  customerId: string
  stage: AccountingStage
  initialEstimate: number
  currentEstimate: number
  approvedExtras: number
  discount: number
  forecastNet: number
  performedBase: number
  performedGross: number
  allocatedDiscount: number
  earnedNet: number
  invoiced: number
  unbilledEarned: number
  received: number
  balance: number
  outstanding: number
  credit: number
  costs: number
  earnedProfit: number
  forecastProfit: number
  finalizationCandidate?: number
  warnings: FinancialWarning[]
}

export interface FinancialPositionInput {
  project: Project
  changes?: ProjectChange[]
  payments?: Payment[]
  invoices?: Invoice[]
  items?: ProjectItem[]
  activities?: ProjectActivity[]
  expenses?: Expense[]
  materials?: Material[]
}

export interface AccountingTotals extends Omit<ProjectFinancialPosition, 'projectId' | 'customerId' | 'stage' | 'warnings' | 'finalizationCandidate'> {
  projectCount: number
  warnings: FinancialWarning[]
}

export interface StandaloneAccountingInput {
  invoices?: Invoice[]
  payments?: Payment[]
}

const invoiceStatuses = new Set<Invoice['status']>(['issued', 'paid'])

export function accountingStage(status: ProjectStatus): AccountingStage {
  if (['draft', 'planned', 'active'].includes(status)) return 'forecast'
  if (status === 'in_progress') return 'accruing'
  if (status === 'paused') return 'paused'
  if (status === 'completed') return 'finalizable'
  if (status === 'delivered') return 'finalized'
  return 'cancelled'
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

function projectItemsTotal(projectId: string, items: ProjectItem[]): number {
  return sum(items.filter((item) => item.projectId === projectId).map((item) => item.totalPrice))
}

function activityAmount(activity: ProjectActivity, items: ProjectItem[]): number {
  if (activity.amount !== undefined && activity.amount > 0) return activity.amount
  if (activity.quantity === undefined || !activity.projectItemId) return 0
  const item = items.find((candidate) => candidate.id === activity.projectItemId && candidate.projectId === activity.projectId)
  return item ? Math.max(0, Math.round(activity.quantity * item.unitPrice)) : 0
}

function allocateDiscount(discount: number, performedGross: number, forecastGross: number): number {
  if (discount <= 0 || performedGross <= 0) return 0
  if (forecastGross <= 0 || performedGross >= forecastGross) return Math.min(discount, performedGross)
  return Math.min(discount, performedGross, Math.round(discount * performedGross / forecastGross))
}

export function projectFinancialPosition({
  project,
  changes = [],
  payments = [],
  invoices = [],
  items = [],
  activities = [],
  expenses = [],
  materials = [],
}: FinancialPositionInput): ProjectFinancialPosition {
  const stage = accountingStage(project.status)
  const serviceEstimate = projectItemsTotal(project.id, items)
  const currentEstimate = (project.pricingMode ?? 'fixed') === 'itemized'
    ? serviceEstimate
    : Math.max(0, project.contractAmount ?? 0)
  const initialEstimate = Math.max(0, project.initialEstimateAmount ?? currentEstimate)
  const approvedExtras = sum(changes.filter((change) => change.projectId === project.id).map((change) => Math.max(0, change.amount)))
  const discount = Math.max(0, project.discount ?? 0)
  const forecastGross = currentEstimate + approvedExtras
  const forecastNet = Math.max(0, forecastGross - Math.min(discount, forecastGross))
  const performedBase = sum(activities.filter((activity) => activity.projectId === project.id).map((activity) => activityAmount(activity, items)))
  const performedGross = performedBase + approvedExtras
  const allocatedDiscount = allocateDiscount(discount, performedGross, forecastGross)
  const earnedNet = Math.max(0, performedGross - allocatedDiscount)
  const projectInvoices = invoices.filter((invoice) => invoice.projectId === project.id && invoiceStatuses.has(invoice.status))
  const invoiceIds = new Set(projectInvoices.map((invoice) => invoice.id))
  const invoiced = sum(projectInvoices.map((invoice) => Math.max(0, invoice.total)))
  const received = sum(payments.filter((payment) => payment.projectId === project.id || (payment.invoiceId !== undefined && invoiceIds.has(payment.invoiceId))).map((payment) => Math.max(0, payment.amount)))
  const balance = invoiced - received
  const costs = sum(expenses.filter((expense) => expense.projectId === project.id).map((expense) => Math.max(0, expense.amount)))
    + sum(materials.filter((material) => material.projectId === project.id && material.source === 'contractor').map((material) => Math.max(0, material.cost)))
  const warnings: FinancialWarning[] = []
  if (stage === 'forecast' && performedGross > 0) warnings.push('priced-work-before-execution')
  if (received > 0 && invoiced === 0) warnings.push('payment-without-issued-invoice')
  if (stage === 'finalizable' && earnedNet > invoiced) warnings.push('completed-with-unbilled-balance')
  if (stage === 'finalized' && earnedNet > invoiced) warnings.push('delivered-with-unbilled-balance')
  if (performedBase > 0 && invoiced > earnedNet) warnings.push('invoice-exceeds-earned-work')
  const finalizationCandidate = ['finalizable', 'finalized', 'cancelled'].includes(stage)
    ? Math.max(0, performedGross - Math.min(discount, performedGross))
    : undefined

  return {
    projectId: project.id,
    customerId: project.customerId,
    stage,
    initialEstimate,
    currentEstimate,
    approvedExtras,
    discount,
    forecastNet,
    performedBase,
    performedGross,
    allocatedDiscount,
    earnedNet,
    invoiced,
    unbilledEarned: Math.max(0, earnedNet - invoiced),
    received,
    balance,
    outstanding: Math.max(0, balance),
    credit: Math.max(0, -balance),
    costs,
    earnedProfit: earnedNet - costs,
    forecastProfit: forecastNet - costs,
    finalizationCandidate,
    warnings,
  }
}

export function aggregateFinancialPositions(positions: ProjectFinancialPosition[], standalone: StandaloneAccountingInput = {}): AccountingTotals {
  const numericKeys: Array<keyof Omit<AccountingTotals, 'projectCount' | 'warnings'>> = [
    'initialEstimate', 'currentEstimate', 'approvedExtras', 'discount', 'forecastNet', 'performedBase',
    'performedGross', 'allocatedDiscount', 'earnedNet', 'invoiced', 'unbilledEarned', 'received',
    'balance', 'outstanding', 'credit', 'costs', 'earnedProfit', 'forecastProfit',
  ]
  const totals = Object.fromEntries(numericKeys.map((key) => [key, sum(positions.map((position) => position[key]))])) as Omit<AccountingTotals, 'projectCount' | 'warnings'>
  const invoices = (standalone.invoices ?? []).filter((invoice) => !invoice.projectId && invoiceStatuses.has(invoice.status))
  const invoiceIds = new Set(invoices.map((invoice) => invoice.id))
  const standaloneInvoiced = sum(invoices.map((invoice) => Math.max(0, invoice.total)))
  const standaloneReceived = sum((standalone.payments ?? []).filter((payment) => !payment.projectId && (!payment.invoiceId || invoiceIds.has(payment.invoiceId))).map((payment) => Math.max(0, payment.amount)))
  const standaloneBalance = standaloneInvoiced - standaloneReceived
  totals.invoiced += standaloneInvoiced
  totals.received += standaloneReceived
  totals.balance += standaloneBalance
  totals.outstanding += Math.max(0, standaloneBalance)
  totals.credit += Math.max(0, -standaloneBalance)
  return {
    ...totals,
    projectCount: positions.length,
    warnings: [...new Set([
      ...positions.flatMap((position) => position.warnings),
      ...(standaloneReceived > 0 && standaloneInvoiced === 0 ? ['payment-without-issued-invoice' as const] : []),
    ])],
  }
}
