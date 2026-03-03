import axios from 'axios'
import type { AxiosError } from 'axios'
import type { ErrorResponse } from '@/shared/types/api'

export class ApiError extends Error {
  readonly code: string
  readonly traceId: string
  readonly statusCode: number
  readonly details?: Array<{ field: string; reason: string }>

  constructor(
    code: string,
    message: string,
    traceId: string,
    statusCode: number,
    details?: Array<{ field: string; reason: string }>
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.traceId = traceId
    this.statusCode = statusCode
    this.details = details
  }
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: inject X-Admin-Token for admin routes
apiClient.interceptors.request.use((config) => {
  const isAdminRoute = config.url?.startsWith('/api/admin')
  if (isAdminRoute) {
    const adminToken = import.meta.env.VITE_ADMIN_TOKEN
    if (adminToken) {
      config.headers['X-Admin-Token'] = adminToken
    }
  }
  return config
})

// Response interceptor: normalize error responses into ApiError
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ErrorResponse>) => {
    const statusCode = error.response?.status ?? 0
    const errorBody = error.response?.data

    if (errorBody?.error) {
      const { code, message, traceId, details } = errorBody.error
      throw new ApiError(code, message, traceId, statusCode, details)
    }

    // Network or timeout error with no structured response body
    throw new ApiError('NETWORK_ERROR', error.message || 'Network error occurred', '', statusCode)
  }
)

export default apiClient
