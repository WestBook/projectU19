export interface Event {
  id: string
  name: string
  ageMin: number
  ageMax: number
  startTime: string
  location: string
}

export interface AgeRestriction {
  minAge: number
  maxAge: number
  description: string
  strictEnforcement?: boolean
}

export type RegistrationStatus = 'OPEN' | 'CLOSED' | 'FULL'

export interface EventDetail {
  id: string
  name: string
  description?: string
  ageRestriction: AgeRestriction
  startTime: string
  endTime?: string
  location: string
  address?: string
  capacity: number
  registeredCount: number
  registrationStatus: RegistrationStatus
  registrationDeadline?: string
  fee: number
  organizer?: string
  contactEmail?: string
  contactPhone?: string
}
