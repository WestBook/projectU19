import apiClient from './client'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  message: string
  history?: ChatMessage[]
}

export interface ChatResponse {
  message: string
}

const MOCK_RESPONSES = [
  '我目前可以幫您查詢賽事資訊。請問您的小孩幾歲呢？',
  '根據您提供的資訊，我建議您查看我們的春季籃球營，適合 8-12 歲的小朋友！',
  '報名費用會依賽事而異，您可以在賽事詳情頁查看費用資訊。',
  '目前開放報名的賽事有幾個，您可以到賽事列表查看最新資訊。',
  '您可以在報名表單填寫孩子的基本資料和緊急聯絡人資訊，非常簡單快速！',
]

export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  try {
    const response = await apiClient.post<ChatResponse>('/api/ai/chat', request)
    return response.data
  } catch (error) {
    console.error('[ChatAPI] AI endpoint failed, using mock response:', error)
    // Mock fallback: random response from predefined list
    const randomIndex = Math.floor(Math.random() * MOCK_RESPONSES.length)
    return { message: MOCK_RESPONSES[randomIndex] }
  }
}
