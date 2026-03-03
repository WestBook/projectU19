import type { PageInfo } from '@/shared/types/api'

export type AdminEventStatus = 'ACTIVE' | 'DRAFT' | 'CANCELLED' | 'COMPLETED'

export interface AdminEvent {
  id: string
  name: string
  registeredCount: number
  capacity: number
  status: AdminEventStatus
  startTime: string
}

export interface CreateEventRequest {
  name: string
  description?: string
  ageMin: number
  ageMax: number
  startTime: string
  endTime?: string
  location: string
  address?: string
  capacity: number
  fee: number
  registrationDeadline?: string
  organizer?: string
  contactEmail?: string
  contactPhone?: string
}

export interface AdminEventPageResponse {
  success: boolean
  data: AdminEvent[]
  page: PageInfo
  timestamp: string
}
