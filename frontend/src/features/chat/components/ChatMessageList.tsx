import { useEffect, useRef } from 'react'
import type { Message } from '../hooks/useChat'
import { ChatMessageBubble } from './ChatMessageBubble'
import styles from './ChatWidget.module.css'

interface ChatMessageListProps {
  messages: Message[]
  onQuickQuestion?: (question: string) => void
  showQuickQuestions?: boolean
}

export function ChatMessageList({
  messages,
  onQuickQuestion,
  showQuickQuestions,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className={styles.messageList} role="log" aria-live="polite" aria-label="對話記錄">
      {messages.map((message, index) => (
        <div key={message.id} className={styles.messageEntry}>
          <ChatMessageBubble message={message} />
          {/* Show quick questions below the first welcome message only */}
          {index === 0 && showQuickQuestions && onQuickQuestion && (
            <QuickQuestionsInline onSelect={onQuickQuestion} />
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}

interface QuickQuestionsInlineProps {
  onSelect: (question: string) => void
}

function QuickQuestionsInline({ onSelect }: QuickQuestionsInlineProps) {
  const QUICK_QUESTIONS = ['有什麼適合 10 歲的賽事？', '如何報名賽事？', '費用怎麼計算？']

  return (
    <div className={styles.quickQuestionsWrapper} aria-label="建議問題">
      <p className={styles.quickQuestionsLabel}>建議問題</p>
      <div className={styles.quickQuestionsGroup}>
        {QUICK_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            className={styles.quickQuestionButton}
            onClick={() => onSelect(q)}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}
