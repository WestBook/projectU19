import apiClient from './client'
import type { ApiResponse } from '@/shared/types/api'
import type { AdminEvent, AdminEventPageResponse, CreateEventRequest } from '@/features/admin/types'

export interface AdminGetEventsParams {
  status?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  size?: number
  sort?: string
}

// X-Admin-Token is injected automatically by the request interceptor
export async function adminGetEvents(
  params?: AdminGetEventsParams
): Promise<AdminEventPageResponse> {
  const response = await apiClient.get<AdminEventPageResponse>('/api/admin/events', { params })
  return response.data
}

export async function adminCreateEvent(data: CreateEventRequest): Promise<ApiResponse<AdminEvent>> {
  const response = await apiClient.post<ApiResponse<AdminEvent>>('/api/admin/events', data)
  return response.data
}
