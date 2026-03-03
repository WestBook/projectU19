import { useState, useCallback } from 'react'
import { sendChatMessage } from '@/api/chatApi'
import type { ChatMessage } from '@/api/chatApi'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isLoading?: boolean
  isError?: boolean
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: '你好！我是賽事助手，我可以幫你查詢賽事資訊、報名問題等。請問有什麼我可以幫你的嗎？',
  timestamp: new Date(),
}

function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export interface UseChatResult {
  messages: Message[]
  isLoading: boolean
  sendMessage: (text: string) => Promise<void>
  clearMessages: () => void
}

export function useChat(): UseChatResult {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isLoading) return

      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      }

      const loadingId = generateId()
      const loadingMessage: Message = {
        id: loadingId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isLoading: true,
      }

      setMessages((prev) => [...prev, userMessage, loadingMessage])
      setIsLoading(true)

      // Build history from current messages (excluding welcome and any loading/error states)
      const history: ChatMessage[] = messages
        .filter((m) => !m.isLoading && !m.isError && m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }))

      history.push({ role: 'user', content: trimmed })

      try {
        const response = await sendChatMessage({ message: trimmed, history })

        const assistantMessage: Message = {
          id: loadingId,
          role: 'assistant',
          content: response.message,
          timestamp: new Date(),
          isLoading: false,
        }

        setMessages((prev) => prev.map((m) => (m.id === loadingId ? assistantMessage : m)))
      } catch {
        const errorMessage: Message = {
          id: loadingId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          isLoading: false,
          isError: true,
        }
        setMessages((prev) => prev.map((m) => (m.id === loadingId ? errorMessage : m)))
      } finally {
        setIsLoading(false)
      }
    },
    [isLoading, messages]
  )

  const clearMessages = useCallback(() => {
    setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date() }])
    setIsLoading(false)
  }, [])

  return { messages, isLoading, sendMessage, clearMessages }
}
