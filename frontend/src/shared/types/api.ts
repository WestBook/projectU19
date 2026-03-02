export interface ApiResponse<T> {
  success: boolean
  data: T
  timestamp: string
}

export interface PageInfo {
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface PageResponse<T> {
  success: boolean
  data: T[]
  page: PageInfo
  timestamp: string
}

export interface ErrorDetail {
  code: string
  message: string
  details?: Array<{ field: string; reason: string }>
  traceId: string
}

export interface ErrorResponse {
  success: false
  error: ErrorDetail
  timestamp: string
}
