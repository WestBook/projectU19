import apiClient from './client'
import type { ApiResponse, PageResponse } from '@/shared/types/api'
import type { Event, EventDetail } from '@/features/events/types'

export interface GetEventsParams {
  age?: number
  dateFrom?: string
  dateTo?: string
  location?: string
  page?: number
  size?: number
  sort?: string
}

export async function getEvents(params?: GetEventsParams): Promise<PageResponse<Event>> {
  const response = await apiClient.get<PageResponse<Event>>('/api/events', { params })
  return response.data
}

export async function getEventById(id: string): Promise<ApiResponse<EventDetail>> {
  const response = await apiClient.get<ApiResponse<EventDetail>>(`/api/events/${id}`)
  return response.data
}
