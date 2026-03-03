import type { ReactNode } from 'react'
import styles from './FormField.module.css'

interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: ReactNode
  htmlFor?: string
}

export function FormField({
  label,
  required = false,
  error,
  hint,
  children,
  htmlFor,
}: FormFieldProps) {
  return (
    <div className={`${styles.field} ${error ? styles.fieldError : ''}`}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label}
        {required && (
          <span className={styles.required} aria-label="必填">
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && <p className={styles.hint}>{hint}</p>}
      {error && (
        <p className={styles.errorMsg} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
