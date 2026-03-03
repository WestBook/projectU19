import apiClient from './client'

export interface HealthStatus {
  status: 'UP' | 'DOWN'
  service: string
  timestamp: string
  components: {
    database: { status: 'UP' | 'DOWN' }
  }
}

export async function getHealth(): Promise<HealthStatus> {
  const response = await apiClient.get<HealthStatus>('/health')
  return response.data
}
