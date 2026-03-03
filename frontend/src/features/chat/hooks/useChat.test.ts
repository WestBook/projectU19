import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useChat } from './useChat'
import * as chatApi from '@/api/chatApi'

// ---------------------------------------------------------------------------
// Mock
// ---------------------------------------------------------------------------

// Replace the real sendChatMessage with a vi.fn() so we control responses
// without hitting any network or axios instance.
vi.mock('@/api/chatApi', () => ({
  sendChatMessage: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useChat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  it('initializes with exactly one welcome message and isLoading = false', () => {
    const { result } = renderHook(() => useChat())

    expect(result.current.isLoading).toBe(false)
    expect(result.current.messages).toHaveLength(1)

    const welcome = result.current.messages[0]
    expect(welcome.id).toBe('welcome')
    expect(welcome.role).toBe('assistant')
    expect(welcome.content).toContain('你好')
  })

  // -------------------------------------------------------------------------
  it('appends a user message immediately when sendMessage is called', async () => {
    // Arrange: keep the promise pending so we can inspect mid-flight state
    let resolveAi!: (value: chatApi.ChatResponse) => void
    vi.mocked(chatApi.sendChatMessage).mockReturnValue(
      new Promise<chatApi.ChatResponse>((res) => {
        resolveAi = res
      }),
    )

    const { result } = renderHook(() => useChat())

    // Act
    act(() => {
      void result.current.sendMessage('你好啊')
    })

    // Assert: user message is appended right away (before AI responds)
    const userMsg = result.current.messages.find((m) => m.role === 'user')
    expect(userMsg).toBeDefined()
    expect(userMsg?.content).toBe('你好啊')

    // Cleanup: resolve the AI promise so the hook settles
    await act(async () => {
      resolveAi({ message: 'AI 回應' })
    })
  })

  // -------------------------------------------------------------------------
  it('sets isLoading = true while waiting for the AI response', async () => {
    let resolveAi!: (value: chatApi.ChatResponse) => void
    vi.mocked(chatApi.sendChatMessage).mockReturnValue(
      new Promise<chatApi.ChatResponse>((res) => {
        resolveAi = res
      }),
    )

    const { result } = renderHook(() => useChat())

    act(() => {
      void result.current.sendMessage('測試')
    })

    // isLoading must be true while the request is in-flight
    expect(result.current.isLoading).toBe(true)

    // Also: a loading placeholder message (isLoading: true) is appended
    const loadingMsg = result.current.messages.find((m) => m.isLoading)
    expect(loadingMsg).toBeDefined()

    await act(async () => {
      resolveAi({ message: 'AI 回應' })
    })
  })

  // -------------------------------------------------------------------------
  it('replaces the loading placeholder with the AI reply after resolution', async () => {
    vi.mocked(chatApi.sendChatMessage).mockResolvedValue({ message: '我是 AI 回應' })

    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.sendMessage('問個問題')
    })

    // isLoading must be cleared
    expect(result.current.isLoading).toBe(false)

    // No placeholder should remain
    const stillLoading = result.current.messages.find((m) => m.isLoading)
    expect(stillLoading).toBeUndefined()

    // AI reply must be present
    const aiMsg = result.current.messages.find(
      (m) => m.role === 'assistant' && m.content === '我是 AI 回應',
    )
    expect(aiMsg).toBeDefined()
  })

  // -------------------------------------------------------------------------
  it('sets isError on the placeholder message when the API throws', async () => {
    vi.mocked(chatApi.sendChatMessage).mockRejectedValue(new Error('network failure'))

    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.sendMessage('這會失敗')
    })

    expect(result.current.isLoading).toBe(false)

    const errorMsg = result.current.messages.find((m) => m.isError)
    expect(errorMsg).toBeDefined()
    expect(errorMsg?.role).toBe('assistant')
  })

  // -------------------------------------------------------------------------
  it('resets to only the welcome message after clearMessages is called', async () => {
    vi.mocked(chatApi.sendChatMessage).mockResolvedValue({ message: 'AI 回應' })

    const { result } = renderHook(() => useChat())

    // Send a message first so there is more than one message
    await act(async () => {
      await result.current.sendMessage('填充訊息')
    })

    expect(result.current.messages.length).toBeGreaterThan(1)

    // Clear
    act(() => {
      result.current.clearMessages()
    })

    expect(result.current.messages).toHaveLength(1)
    expect(result.current.messages[0].role).toBe('assistant')
    expect(result.current.messages[0].content).toContain('你好')
    expect(result.current.isLoading).toBe(false)
  })

  // -------------------------------------------------------------------------
  it('does nothing when sendMessage is called with an empty or whitespace string', async () => {
    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.sendMessage('   ')
    })

    // API must not have been called
    expect(chatApi.sendChatMessage).not.toHaveBeenCalled()
    // Message list still only contains the welcome message
    expect(result.current.messages).toHaveLength(1)
  })
})
