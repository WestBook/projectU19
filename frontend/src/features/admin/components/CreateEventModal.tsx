import { useEffect, useRef } from 'react'
import { FormField } from '@/shared/components/FormField'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import type { useCreateEventForm } from '@/features/admin/hooks/useCreateEventForm'
import styles from './CreateEventModal.module.css'

type FormHook = ReturnType<typeof useCreateEventForm>

interface CreateEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: () => void
  submitting: boolean
  submitError: string | null
  formHook: FormHook
}

const AGE_OPTIONS = Array.from({ length: 19 }, (_, i) => i + 2) // 2 to 20

export function CreateEventModal({
  isOpen,
  onClose,
  onSubmit,
  submitting,
  submitError,
  formHook,
}: CreateEventModalProps) {
  const { form, errors, handleChange } = formHook
  const dialogRef = useRef<HTMLDivElement>(null)
  const firstFocusRef = useRef<HTMLInputElement>(null)

  // Focus trap and keyboard handling
  useEffect(() => {
    if (!isOpen) return

    const previouslyFocused = document.activeElement as HTMLElement
    firstFocusRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
      // Basic focus trap
      if (e.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (!focusable || focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      previouslyFocused?.focus()
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className={styles.backdrop}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="新增賽事"
    >
      <div className={styles.modal} ref={dialogRef}>
        {/* Modal header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>新增賽事</h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="關閉"
            disabled={submitting}
          >
            &#10005;
          </button>
        </div>

        {/* Scrollable form body */}
        <div className={styles.modalBody}>
          <form
            id="create-event-form"
            onSubmit={(e) => {
              e.preventDefault()
              onSubmit()
            }}
            noValidate
          >
            {/* Basic info */}
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>基本資訊</legend>

              <FormField label="賽事名稱" required error={errors.name} htmlFor="ev-name">
                <input
                  id="ev-name"
                  ref={firstFocusRef}
                  type="text"
                  className={styles.input}
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="例：春季兒童籃球營"
                  aria-required="true"
                />
              </FormField>

              <FormField label="說明" required error={errors.description} htmlFor="ev-desc">
                <textarea
                  id="ev-desc"
                  className={styles.textarea}
                  rows={3}
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="賽事說明..."
                  aria-required="true"
                />
              </FormField>
            </fieldset>

            {/* Age restriction */}
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>年齡限制</legend>

              <div className={styles.row}>
                <FormField label="最小年齡" required error={errors.ageMin} htmlFor="ev-age-min">
                  <select
                    id="ev-age-min"
                    className={styles.select}
                    value={form.ageMin}
                    onChange={(e) => handleChange('ageMin', e.target.value)}
                  >
                    {AGE_OPTIONS.map((age) => (
                      <option key={age} value={age}>
                        {age} 歲
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="最大年齡" required error={errors.ageMax} htmlFor="ev-age-max">
                  <select
                    id="ev-age-max"
                    className={styles.select}
                    value={form.ageMax}
                    onChange={(e) => handleChange('ageMax', e.target.value)}
                  >
                    {AGE_OPTIONS.map((age) => (
                      <option key={age} value={age}>
                        {age} 歲
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className={styles.checkboxRow}>
                <input
                  id="ev-strict-age"
                  type="checkbox"
                  className={styles.checkbox}
                  checked={form.strictAgeEnforcement}
                  onChange={(e) => handleChange('strictAgeEnforcement', e.target.checked)}
                />
                <label htmlFor="ev-strict-age" className={styles.checkboxLabel}>
                  嚴格年齡驗證
                </label>
              </div>
            </fieldset>

            {/* Event time */}
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>賽事時間</legend>

              <div className={styles.datetimeGroup}>
                <span className={styles.datetimeLabel}>開始</span>
                <div className={styles.datetimeInputs}>
                  <FormField label="" error={errors.startDate} htmlFor="ev-start-date">
                    <input
                      id="ev-start-date"
                      type="date"
                      className={styles.input}
                      value={form.startDate}
                      onChange={(e) => handleChange('startDate', e.target.value)}
                      aria-label="開始日期"
                      aria-required="true"
                    />
                  </FormField>
                  <FormField label="" htmlFor="ev-start-time">
                    <input
                      id="ev-start-time"
                      type="time"
                      className={styles.input}
                      value={form.startTime}
                      onChange={(e) => handleChange('startTime', e.target.value)}
                      aria-label="開始時間"
                    />
                  </FormField>
                </div>
              </div>

              <div className={styles.datetimeGroup}>
                <span className={styles.datetimeLabel}>結束</span>
                <div className={styles.datetimeInputs}>
                  <FormField label="" error={errors.endDate} htmlFor="ev-end-date">
                    <input
                      id="ev-end-date"
                      type="date"
                      className={styles.input}
                      value={form.endDate}
                      onChange={(e) => handleChange('endDate', e.target.value)}
                      aria-label="結束日期"
                      aria-required="true"
                    />
                  </FormField>
                  <FormField label="" htmlFor="ev-end-time">
                    <input
                      id="ev-end-time"
                      type="time"
                      className={styles.input}
                      value={form.endTime}
                      onChange={(e) => handleChange('endTime', e.target.value)}
                      aria-label="結束時間"
                    />
                  </FormField>
                </div>
              </div>
            </fieldset>

            {/* Location */}
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>地點資訊</legend>

              <FormField label="地點" required error={errors.location} htmlFor="ev-location">
                <input
                  id="ev-location"
                  type="text"
                  className={styles.input}
                  value={form.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="例：台北市立體育館"
                  aria-required="true"
                />
              </FormField>

              <FormField label="詳細地址" htmlFor="ev-address">
                <input
                  id="ev-address"
                  type="text"
                  className={styles.input}
                  value={form.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="例：台北市信義區信義路五段 1 號"
                />
              </FormField>
            </fieldset>

            {/* Registration settings */}
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>報名設定</legend>

              <FormField label="容納人數" required error={errors.capacity} htmlFor="ev-capacity">
                <input
                  id="ev-capacity"
                  type="number"
                  min="1"
                  className={styles.input}
                  value={form.capacity}
                  onChange={(e) => handleChange('capacity', e.target.value)}
                  aria-required="true"
                />
              </FormField>

              <div className={styles.datetimeGroup}>
                <span className={styles.datetimeLabel}>報名截止</span>
                <div className={styles.datetimeInputs}>
                  <FormField
                    label=""
                    error={errors.registrationDeadlineDate}
                    htmlFor="ev-deadline-date"
                  >
                    <input
                      id="ev-deadline-date"
                      type="date"
                      className={styles.input}
                      value={form.registrationDeadlineDate}
                      onChange={(e) => handleChange('registrationDeadlineDate', e.target.value)}
                      aria-label="截止日期"
                      aria-required="true"
                    />
                  </FormField>
                  <FormField label="" htmlFor="ev-deadline-time">
                    <input
                      id="ev-deadline-time"
                      type="time"
                      className={styles.input}
                      value={form.registrationDeadlineTime}
                      onChange={(e) => handleChange('registrationDeadlineTime', e.target.value)}
                      aria-label="截止時間"
                    />
                  </FormField>
                </div>
              </div>

              <FormField label="報名費用（元）" required error={errors.fee} htmlFor="ev-fee">
                <input
                  id="ev-fee"
                  type="number"
                  min="0"
                  className={styles.input}
                  value={form.fee}
                  onChange={(e) => handleChange('fee', e.target.value)}
                  aria-required="true"
                />
              </FormField>
            </fieldset>

            {/* Organizer */}
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>主辦資訊</legend>

              <FormField label="主辦單位" required error={errors.organizer} htmlFor="ev-organizer">
                <input
                  id="ev-organizer"
                  type="text"
                  className={styles.input}
                  value={form.organizer}
                  onChange={(e) => handleChange('organizer', e.target.value)}
                  placeholder="例：台北市體育局"
                  aria-required="true"
                />
              </FormField>

              <FormField label="聯絡信箱" required error={errors.contactEmail} htmlFor="ev-email">
                <input
                  id="ev-email"
                  type="email"
                  className={styles.input}
                  value={form.contactEmail}
                  onChange={(e) => handleChange('contactEmail', e.target.value)}
                  placeholder="example@mail.com"
                  aria-required="true"
                />
              </FormField>

              <FormField label="聯絡電話" required error={errors.contactPhone} htmlFor="ev-phone">
                <input
                  id="ev-phone"
                  type="tel"
                  className={styles.input}
                  value={form.contactPhone}
                  onChange={(e) => handleChange('contactPhone', e.target.value)}
                  placeholder="02-XXXX-XXXX"
                  aria-required="true"
                />
              </FormField>
            </fieldset>

            {/* Submit error */}
            {submitError && (
              <div className={styles.submitError} role="alert">
                <span aria-hidden="true">&#9888;</span> {submitError}
              </div>
            )}
          </form>
        </div>

        {/* Modal footer */}
        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={submitting}
          >
            取消
          </button>
          <button
            type="submit"
            form="create-event-form"
            className={styles.submitBtn}
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? (
              <span className={styles.submittingInner}>
                <LoadingSpinner size="sm" label="建立中..." />
              </span>
            ) : (
              '建立賽事'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
