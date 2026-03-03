import apiClient from './client'
import type { ApiResponse } from '@/shared/types/api'
import type { CreateOrderRequest, Order } from '@/features/orders/types'

export async function createOrder(data: CreateOrderRequest): Promise<ApiResponse<Order>> {
  const response = await apiClient.post<ApiResponse<Order>>('/api/orders', data)
  return response.data
}
