import type { PageInfo } from '@/shared/types/api'

export type AdminEventStatus = 'ACTIVE' | 'DRAFT' | 'CANCELLED' | 'COMPLETED'

export type RegistrationStatus = 'OPEN' | 'FULL' | 'CLOSED'

export interface AdminEventStatistics {
  confirmedOrders: number
  pendingOrders: number
  totalRevenue: number
}

export interface AdminEvent {
  id: string
  name: string
  registeredCount: number
  capacity: number
  status: AdminEventStatus
  registrationStatus?: RegistrationStatus
  startTime: string
  endTime?: string
  location?: string
  fee?: number
  statistics?: AdminEventStatistics
}

export interface CreateEventRequest {
  name: string
  description: string
  ageMin: number
  ageMax: number
  ageRestrictionNote?: string
  strictAgeEnforcement: boolean
  startTime: string
  endTime: string
  location: string
  address?: string
  capacity: number
  registrationDeadline: string
  fee: number
  organizer: string
  contactEmail: string
  contactPhone: string
}

export interface AdminEventPageResponse {
  success: boolean
  data: AdminEvent[]
  page: PageInfo
  timestamp: string
}
