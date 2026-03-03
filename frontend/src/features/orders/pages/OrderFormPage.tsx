import { useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getEventById } from '@/api/eventsApi'
import { useApi } from '@/shared/hooks/useApi'
import { ApiError } from '@/api/client'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { EventSummaryCard } from '@/features/orders/components/EventSummaryCard'
import { ParentInfoForm } from '@/features/orders/components/ParentInfoForm'
import { ChildInfoForm } from '@/features/orders/components/ChildInfoForm'
import { EmergencyContactForm } from '@/features/orders/components/EmergencyContactForm'
import { OrderSuccessView } from '@/features/orders/components/OrderSuccessView'
import { useOrderForm } from '@/features/orders/hooks/useOrderForm'
import { FormField } from '@/shared/components/FormField'
import type { EventDetail } from '@/features/events/types'
import type { ApiResponse } from '@/shared/types/api'
import styles from './OrderFormPage.module.css'
import formStyles from '@/features/orders/components/FormSection.module.css'

// ---- Banner variants --------------------------------------------------------

type BannerVariant = 'error' | 'warning'

interface BannerProps {
  variant: BannerVariant
  message: string
  onBack?: () => void
  onDismiss?: () => void
}

function Banner({ variant, message, onBack, onDismiss }: BannerProps) {
  return (
    <div
      className={`${styles.banner} ${variant === 'error' ? styles.bannerError : styles.bannerWarning}`}
      role="alert"
      aria-live="polite"
    >
      <span className={styles.bannerIcon} aria-hidden="true">
        {variant === 'error' ? '&#10060;' : '&#9888;'}
      </span>
      <span className={styles.bannerText}>{message}</span>
      {onBack && (
        <button type="button" className={styles.bannerAction} onClick={onBack}>
          返回賽事
        </button>
      )}
      {onDismiss && (
        <button
          type="button"
          className={styles.bannerDismiss}
          onClick={onDismiss}
          aria-label="關閉提示"
        >
          &#215;
        </button>
      )}
    </div>
  )
}

// ---- Fee summary ------------------------------------------------------------

interface FeeSummaryProps {
  fee: number
  paymentDeadline?: string
}

function FeeSummary({ fee, paymentDeadline }: FeeSummaryProps) {
  const formatDeadline = (iso: string) => {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()} 前`
  }

  return (
    <div className={styles.feeSummary}>
      <div className={styles.feeSummaryRow}>
        <span className={styles.feeSummaryLabel}>報名費</span>
        <span className={styles.feeSummaryAmount}>
          {fee === 0 ? '免費' : `NT$ ${fee.toLocaleString('zh-TW')}`}
        </span>
      </div>
      {paymentDeadline && (
        <div className={styles.feeSummaryRow}>
          <span className={styles.feeSummaryLabel}>付款期限</span>
          <span className={styles.feeSummaryDeadline}>{formatDeadline(paymentDeadline)}</span>
        </div>
      )}
    </div>
  )
}

// ---- Main page --------------------------------------------------------------

export function OrderFormPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const eventId = searchParams.get('eventId') ?? ''

  // Redirect if no eventId provided
  useEffect(() => {
    if (!eventId) {
      navigate('/events', { replace: true })
    }
  }, [eventId, navigate])

  // Fetch event detail
  const fetchEvent = useCallback(() => getEventById(eventId), [eventId])
  const {
    data: eventResponse,
    loading: eventLoading,
    error: eventError,
  } = useApi<void, ApiResponse<EventDetail>>(fetchEvent, { immediate: true })

  const event = eventResponse?.data ?? null

  // Redirect if event not found
  useEffect(() => {
    if (eventError instanceof ApiError && eventError.code === 'RESOURCE_NOT_FOUND') {
      navigate('/events', { replace: true })
    }
  }, [eventError, navigate])

  // Order form
  const {
    formData,
    errors,
    serverErrors,
    submitting,
    success,
    createdOrder,
    apiError,
    handleChange,
    handleBlur,
    handleSubmit,
    resetApiError,
  } = useOrderForm()

  const handleBack = () => {
    if (eventId) {
      navigate(`/events/${eventId}`)
    } else {
      navigate('/events')
    }
  }

  // Show success view
  if (success && createdOrder) {
    return <OrderSuccessView order={createdOrder} />
  }

  // Determine banner message based on API error code
  const getBannerProps = (): {
    variant: BannerVariant
    message: string
    showBack: boolean
  } | null => {
    if (!apiError) return null
    switch (apiError.code) {
      case 'AGE_NOT_ELIGIBLE':
        return { variant: 'error', message: '小孩年齡不符合此賽事的年齡限制', showBack: false }
      case 'EVENT_FULL':
        return { variant: 'error', message: '賽事名額已滿，無法完成報名', showBack: true }
      case 'REGISTRATION_CLOSED':
        return { variant: 'error', message: '賽事報名已截止', showBack: true }
      case 'DUPLICATE_REGISTRATION':
        return { variant: 'warning', message: '此小孩已報名過此賽事', showBack: false }
      case 'VALIDATION_ERROR':
        // Field-level errors shown inline; still show a short banner
        return { variant: 'error', message: '請修正以下欄位的錯誤後再送出', showBack: false }
      default:
        return {
          variant: 'error',
          message: apiError.message || '系統發生錯誤，請稍後再試',
          showBack: false,
        }
    }
  }

  const bannerProps = getBannerProps()

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <button
            type="button"
            className={styles.backButton}
            onClick={handleBack}
            aria-label="返回賽事詳情"
          >
            <span aria-hidden="true">&#8592;</span>
            返回賽事詳情
          </button>
          <span className={styles.headerTitle}>賽事報名</span>
        </div>
      </header>

      {/* Main content */}
      <main className={styles.main}>
        <div className={styles.container}>
          {/* Loading state */}
          {eventLoading && (
            <div className={styles.loadingWrapper}>
              <LoadingSpinner label="載入賽事資訊中..." />
            </div>
          )}

          {/* Event load error (non-404) */}
          {!eventLoading &&
            eventError &&
            !(eventError instanceof ApiError && eventError.code === 'RESOURCE_NOT_FOUND') && (
              <div className={styles.errorWrapper} role="alert">
                <p>載入賽事資訊失敗：{eventError.message}</p>
                <button type="button" className={styles.retryBtn} onClick={() => navigate(0)}>
                  重試
                </button>
              </div>
            )}

          {/* Form (shown once event loaded) */}
          {!eventLoading && !eventError && event && (
            <>
              {/* API error banner */}
              {bannerProps && (
                <Banner
                  variant={bannerProps.variant}
                  message={bannerProps.message}
                  onBack={bannerProps.showBack ? handleBack : undefined}
                  onDismiss={!bannerProps.showBack ? resetApiError : undefined}
                />
              )}

              {/* Event summary card */}
              <EventSummaryCard event={event} />

              {/* Form */}
              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault()
                  void handleSubmit(eventId, event)
                }}
                aria-label="報名表單"
              >
                <ParentInfoForm
                  formData={formData}
                  errors={errors}
                  serverErrors={serverErrors}
                  onChange={handleChange}
                  onBlur={(field) => handleBlur(field, event)}
                />

                <ChildInfoForm
                  formData={formData}
                  errors={errors}
                  serverErrors={serverErrors}
                  eventDetail={event}
                  onChange={handleChange}
                  onBlur={(field) => handleBlur(field, event)}
                />

                <EmergencyContactForm
                  formData={formData}
                  errors={errors}
                  serverErrors={serverErrors}
                  onChange={handleChange}
                  onBlur={(field) => handleBlur(field, event)}
                />

                {/* Notes section */}
                <section className={formStyles.section} aria-labelledby="notes-section-title">
                  <h2 className={formStyles.sectionTitle} id="notes-section-title">
                    Step 4：備註（選填）
                  </h2>
                  <div className={formStyles.fields}>
                    <FormField
                      label="備註"
                      error={errors.notes || serverErrors.notes}
                      htmlFor="notes"
                    >
                      <textarea
                        id="notes"
                        className={`${formStyles.textarea} ${errors.notes || serverErrors.notes ? formStyles.inputError : ''}`}
                        value={formData.notes}
                        onChange={(e) => handleChange('notes', e.target.value)}
                        onBlur={() => handleBlur('notes', event)}
                        placeholder="有任何特殊需求或備注事項，請在此填寫..."
                        maxLength={500}
                        rows={4}
                      />
                      <p
                        className={`${formStyles.charCount} ${formData.notes.length > 450 ? formStyles.charCountWarn : ''}`}
                        aria-live="polite"
                      >
                        {formData.notes.length} / 500
                      </p>
                    </FormField>
                  </div>
                </section>

                {/* Fee summary */}
                <FeeSummary fee={event.fee} paymentDeadline={event.registrationDeadline} />

                {/* Submit button */}
                <div className={styles.submitArea}>
                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={submitting}
                    aria-disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className={styles.submitSpinner} aria-hidden="true" />
                        送出中...
                      </>
                    ) : (
                      '確認報名並送出'
                    )}
                  </button>
                  <p className={styles.submitNote}>送出後將以電子郵件通知報名結果</p>
                </div>
              </form>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <p className={styles.footerText}>&copy; 2026 兒童體育賽事平台. 保留所有權利。</p>
        </div>
      </footer>
    </div>
  )
}
