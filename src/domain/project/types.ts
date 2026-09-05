import type { ProjectActivity } from '@/domain/activity/types'
import type { ID, Money, Timestamp } from '@/types'

export type ProjectStatus =
  | 'draft'
  | 'planned'
  | 'active'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'delivered'
  | 'cancelled'

export interface Project {
  id: ID
  customerId: ID
  title: string
  address?: string
  latitude?: number
  longitude?: number
  workType?: string
  /** مبلغ توافق اولیه؛ کارهای اضافه جداگانه ثبت می‌شوند. */
  contractAmount?: Money
  agreementDate?: string
  executionStartDate?: string
  deliveryDate?: string
  statusHistory?: ProjectStatusEntry[]
  activityAudit?: ActivityAuditEntry[]
  startDate?: string       // ISO date string (YYYY-MM-DD)
  plannedEndDate?: string
  actualEndDate?: string
  status: ProjectStatus
  description?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type CreateProjectInput = Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory' | 'activityAudit'>
export type UpdateProjectInput = Partial<CreateProjectInput>

export interface ProjectStatusEntry {
  id: ID
  kind: 'status' | 'dates'
  from: ProjectStatus | null
  to: ProjectStatus
  effectiveDate: string
  recordedAt: Timestamp
  reason?: string
  datesBefore?: Record<string, string | undefined>
  datesAfter?: Record<string, string | undefined>
}
export interface ActivityAuditEntry {
  id: ID
  activityId: ID
  action: 'create' | 'update' | 'delete'
  before?: ProjectActivity
  after?: ProjectActivity
  reason?: string
  recordedAt: Timestamp
}
