import type { RecoverySnapshot } from '@/domain/backup/types'
import Dexie, { type Table } from 'dexie'
import type { Customer } from '@/domain/customer/types'
import type { Project } from '@/domain/project/types'
import type { Service } from '@/domain/service/types'
import type { ProjectItem } from '@/domain/project-item/types'
import type { ProjectActivity } from '@/domain/activity/types'
import type { ProjectChange } from '@/domain/project-change/types'
import type { Material } from '@/domain/material/types'
import type { Expense } from '@/domain/expense/types'
import type { Invoice, Payment, Quotation } from '@/domain/finance/types'
import type { Reminder } from '@/domain/reminder/types'

export class ServiceProjectManagerDB extends Dexie {
  recoverySnapshots!: Table<RecoverySnapshot, string>
  customers!: Table<Customer, string>
  projects!: Table<Project, string>
  services!: Table<Service, string>
  projectItems!: Table<ProjectItem, string>
  projectActivities!: Table<ProjectActivity, string>
  projectChanges!: Table<ProjectChange, string>
  materials!: Table<Material, string>
  expenses!: Table<Expense, string>
  quotations!: Table<Quotation, string>
  invoices!: Table<Invoice, string>
  payments!: Table<Payment, string>
  reminders!: Table<Reminder, string>

  constructor() {
    super('ServiceProjectManagerDB')

    this.version(1).stores({
      customers: 'id, name, mobile, createdAt, updatedAt',
      projects: 'id, customerId, title, status, createdAt, updatedAt',
      services: 'id, name, isActive, createdAt, updatedAt',
    })

    // نسخه ۲: اضافه کردن جداول جدید
    this.version(2).stores({
      customers: 'id, name, mobile, createdAt, updatedAt',
      projects: 'id, customerId, title, status, createdAt, updatedAt',
      services: 'id, name, isActive, createdAt, updatedAt',
      projectItems: 'id, projectId, serviceId, createdAt, updatedAt',
      projectActivities: 'id, projectId, projectItemId, date, createdAt, updatedAt',
    })

    this.version(3).stores({
      customers: 'id, name, mobile, createdAt, updatedAt',
      projects: 'id, customerId, title, status, createdAt, updatedAt',
      services: 'id, name, isActive, createdAt, updatedAt',
      projectItems: 'id, projectId, serviceId, createdAt, updatedAt',
      projectActivities: 'id, projectId, projectItemId, date, createdAt, updatedAt',
      projectChanges: 'id, projectId, date, createdAt, updatedAt',
      materials: 'id, projectId, source, createdAt, updatedAt',
      expenses: 'id, projectId, date, createdAt, updatedAt',
    })

    this.version(4).stores({
      customers: 'id, name, mobile, createdAt, updatedAt',
      projects: 'id, customerId, title, status, createdAt, updatedAt',
      services: 'id, name, isActive, createdAt, updatedAt',
      projectItems: 'id, projectId, serviceId, createdAt, updatedAt',
      projectActivities: 'id, projectId, projectItemId, date, createdAt, updatedAt',
      projectChanges: 'id, projectId, date, createdAt, updatedAt',
      materials: 'id, projectId, source, createdAt, updatedAt',
      expenses: 'id, projectId, date, createdAt, updatedAt',
      quotations: 'id, number, customerId, projectId, date, status, createdAt',
      invoices: 'id, number, customerId, projectId, quotationId, date, status, createdAt',
      payments: 'id, customerId, projectId, invoiceId, date, createdAt',
    })

    this.version(5).stores({
      customers: 'id, name, mobile, createdAt, updatedAt',
      projects: 'id, customerId, title, status, createdAt, updatedAt',
      services: 'id, name, isActive, createdAt, updatedAt',
      projectItems: 'id, projectId, serviceId, createdAt, updatedAt',
      projectActivities: 'id, projectId, projectItemId, date, createdAt, updatedAt',
      projectChanges: 'id, projectId, date, createdAt, updatedAt',
      materials: 'id, projectId, source, createdAt, updatedAt',
      expenses: 'id, projectId, date, createdAt, updatedAt',
      quotations: 'id, number, customerId, projectId, date, status, createdAt',
      invoices: 'id, number, customerId, projectId, quotationId, date, status, createdAt',
      payments: 'id, customerId, projectId, invoiceId, date, createdAt',
      reminders: 'id, dueDate, status, projectId, createdAt, updatedAt',
    })
    // Recovery is deliberately excluded from exported business tables to avoid recursive backups.
    this.version(6).stores({ recoverySnapshots: 'id' })
  }
}

export const db = new ServiceProjectManagerDB()
