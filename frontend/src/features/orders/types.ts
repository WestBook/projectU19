export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'REFUNDED' | 'COMPLETED'

export interface ParentInfo {
  name: string
  email: string
  phone: string
}

export interface ChildInfo {
  name: string
  birthDate: string
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
}

export interface EmergencyContact {
  name: string
  phone: string
  relationship?: string
}

export interface CreateOrderRequest {
  eventId: string
  parent: ParentInfo
  child: ChildInfo
  emergencyContact?: EmergencyContact
  notes?: string
}

export interface OrderWarning {
  code: string
  message: string
}

export interface Order {
  id: string
  eventId: string
  eventName: string
  status: OrderStatus
  parent: ParentInfo
  child: ChildInfo
  childAgeAtEvent: number
  emergencyContact?: EmergencyContact
  notes?: string
  fee: number
  paymentDeadline?: string
  createdAt: string
  updatedAt: string
  warnings?: OrderWarning[]
}
