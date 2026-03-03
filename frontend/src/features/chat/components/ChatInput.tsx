import { useState, useRef } from 'react'
import styles from './ChatWidget.module.css'

interface ChatInputProps {
  onSend: (text: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    // Auto-grow textarea
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 100)}px`
  }

  return (
    <div className={styles.inputArea}>
      <textarea
        ref={textareaRef}
        className={styles.inputTextarea}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="輸入訊息... (Enter 送出，Shift+Enter 換行)"
        disabled={disabled}
        rows={1}
        aria-label="輸入訊息"
        aria-disabled={disabled}
      />
      <button
        type="button"
        className={styles.sendButton}
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        aria-label="送出訊息"
      >
        送
      </button>
    </div>
  )
}
