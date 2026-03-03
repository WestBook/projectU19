import { useState, useCallback } from 'react'
import { useChat } from '../hooks/useChat'
import { ChatMessageList } from './ChatMessageList'
import { ChatInput } from './ChatInput'
import styles from './ChatWidget.module.css'

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const { messages, isLoading, sendMessage, clearMessages } = useChat()

  // Quick questions are shown only while we only have the welcome message
  const showQuickQuestions = messages.length === 1

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleQuickQuestion = useCallback(
    (question: string) => {
      void sendMessage(question)
    },
    [sendMessage]
  )

  const handleSend = useCallback(
    (text: string) => {
      void sendMessage(text)
    },
    [sendMessage]
  )

  return (
    <div className={styles.widgetContainer}>
      {/* Expanded chat panel */}
      <div
        className={`${styles.chatPanel} ${isOpen ? styles.chatPanelOpen : ''}`}
        role="dialog"
        aria-modal="false"
        aria-label="AI 賽事助手"
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <span aria-hidden="true">&#129302;</span>
            <span>AI 賽事助手</span>
          </div>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.headerButton}
              onClick={clearMessages}
              aria-label="清除對話"
              title="清除對話"
            >
              &#8722;
            </button>
            <button
              type="button"
              className={styles.headerButton}
              onClick={handleClose}
              aria-label="關閉聊天視窗"
              title="關閉"
            >
              &#10005;
            </button>
          </div>
        </div>

        {/* Message list */}
        <ChatMessageList
          messages={messages}
          onQuickQuestion={handleQuickQuestion}
          showQuickQuestions={showQuickQuestions}
        />

        {/* Input area */}
        <ChatInput onSend={handleSend} disabled={isLoading} />
      </div>

      {/* Floating toggle button */}
      <button
        type="button"
        className={`${styles.toggleButton} ${isOpen ? styles.toggleButtonActive : ''}`}
        onClick={handleToggle}
        aria-label={isOpen ? '關閉 AI 賽事助手' : '開啟 AI 賽事助手'}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <span aria-hidden="true">&#10005;</span>
        ) : (
          <span aria-hidden="true">&#128172;</span>
        )}
      </button>
    </div>
  )
}
