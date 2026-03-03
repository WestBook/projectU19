import type { Message } from '../hooks/useChat'
import styles from './ChatWidget.module.css'

interface ChatMessageBubbleProps {
  message: Message
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.role === 'user'

  if (message.isLoading) {
    return (
      <div className={styles.messageRow} data-role="assistant">
        <span className={styles.avatar} aria-hidden="true">
          &#129302;
        </span>
        <div
          className={`${styles.bubble} ${styles.bubbleAssistant} ${styles.bubbleLoading}`}
          aria-label="AI 思考中"
        >
          <span className={styles.loadingDot} />
          <span className={styles.loadingDot} />
          <span className={styles.loadingDot} />
        </div>
      </div>
    )
  }

  if (message.isError) {
    return (
      <div className={styles.messageRow} data-role="assistant">
        <span className={styles.avatar} aria-hidden="true">
          &#129302;
        </span>
        <div className={`${styles.bubble} ${styles.bubbleError}`} role="alert">
          <span aria-hidden="true">&#9888;&#65039;</span> 無法取得回應，請稍後再試
        </div>
      </div>
    )
  }

  return (
    <div className={styles.messageRow} data-role={message.role}>
      {!isUser && (
        <span className={styles.avatar} aria-hidden="true">
          &#129302;
        </span>
      )}
      <div
        className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleAssistant}`}
        aria-label={isUser ? '您的訊息' : 'AI 回應'}
      >
        {message.content}
      </div>
    </div>
  )
}
