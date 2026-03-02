export interface AdminEvent {
  id: string
  name: string
  registeredCount: number
  capacity: number
  status: 'ACTIVE' | 'DRAFT' | 'CANCELLED' | 'COMPLETED'
  startTime: string
}
