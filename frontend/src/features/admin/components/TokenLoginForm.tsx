import { useState } from 'react'
import styles from './TokenLoginForm.module.css'

interface TokenLoginFormProps {
  onSubmit: (token: string) => void
}

export function TokenLoginForm({ onSubmit }: TokenLoginFormProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!value.trim()) {
      setError('請輸入管理員 Token')
      return
    }
    setError('')
    onSubmit(value.trim())
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.iconRow} aria-hidden="true">
          &#128274;
        </div>
        <h1 className={styles.title}>管理後台</h1>
        <p className={styles.subtitle}>請輸入管理員 Token 以繼續</p>

        <form onSubmit={handleSubmit} noValidate className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="admin-token" className={styles.label}>
              Admin Token{' '}
              <span className={styles.required} aria-label="必填">
                *
              </span>
            </label>
            <input
              id="admin-token"
              type="password"
              className={`${styles.input} ${error ? styles.inputError : ''}`}
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                if (error) setError('')
              }}
              placeholder="輸入管理員 Token"
              autoComplete="current-password"
              aria-required="true"
              aria-describedby={error ? 'token-error' : undefined}
            />
            {error && (
              <p id="token-error" className={styles.errorMsg} role="alert">
                {error}
              </p>
            )}
          </div>

          <button type="submit" className={styles.submitBtn}>
            進入管理後台
          </button>
        </form>
      </div>
    </div>
  )
}
