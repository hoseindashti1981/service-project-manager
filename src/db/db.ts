import Dexie, { type Table } from 'dexie'
import type { Customer } from '@/domain/customer/types'
import type { Project } from '@/domain/project/types'
import type { Service } from '@/domain/service/types'
import type { ProjectItem } from '@/domain/project-item/types'
import type { ProjectActivity } from '@/domain/activity/types'

export class ServiceProjectManagerDB extends Dexie {
  customers!: Table<Customer, string>
  projects!: Table<Project, string>
  services!: Table<Service, string>
  projectItems!: Table<ProjectItem, string>
  projectActivities!: Table<ProjectActivity, string>

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
  }
}

export const db = new ServiceProjectManagerDB()