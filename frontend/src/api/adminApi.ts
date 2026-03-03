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

const getAdminToken = (): string =>
  localStorage.getItem('admin_token') || import.meta.env.VITE_ADMIN_TOKEN || ''

export async function adminGetEvents(
  params?: AdminGetEventsParams
): Promise<AdminEventPageResponse> {
  const response = await apiClient.get<AdminEventPageResponse>('/api/admin/events', {
    params,
    headers: { 'X-Admin-Token': getAdminToken() },
  })
  return response.data
}

export async function adminCreateEvent(data: CreateEventRequest): Promise<ApiResponse<AdminEvent>> {
  const response = await apiClient.post<ApiResponse<AdminEvent>>('/api/admin/events', data, {
    headers: { 'X-Admin-Token': getAdminToken() },
  })
  return response.data
}
