import type { ID, Timestamp } from '@/types'

export type ProjectStatus =
  | 'draft'
  | 'planned'
  | 'active'
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
  startDate?: string       // ISO date string (YYYY-MM-DD)
  plannedEndDate?: string
  actualEndDate?: string
  status: ProjectStatus
  description?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type CreateProjectInput = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateProjectInput = Partial<CreateProjectInput>