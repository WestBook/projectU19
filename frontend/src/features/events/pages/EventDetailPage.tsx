import { useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getEventById } from '@/api/eventsApi'
import { useApi } from '@/shared/hooks/useApi'
import { ApiError } from '@/api/client'
import { ErrorMessage } from '@/shared/components/ErrorMessage'
import { SkeletonLoader } from '@/shared/components/SkeletonLoader'
import type { EventDetail, RegistrationStatus } from '@/features/events/types'
import type { ApiResponse } from '@/shared/types/api'
import styles from './EventDetailPage.module.css'

// ---- helpers ----------------------------------------------------------------

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatFee(fee: number): string {
  if (fee === 0) return '免費'
  return `NT$ ${fee.toLocaleString('zh-TW')}`
}

const STATUS_LABELS: Record<RegistrationStatus, string> = {
  OPEN: '報名開放中',
  CLOSED: '報名截止',
  FULL: '名額已滿',
}

// ---- sub-components ---------------------------------------------------------

function StatusBadge({ status }: { status: RegistrationStatus }) {
  const classMap: Record<RegistrationStatus, string> = {
    OPEN: styles.statusOpen,
    CLOSED: styles.statusClosed,
    FULL: styles.statusFull,
  }
  return (
    <span
      className={`${styles.statusBadge} ${classMap[status]}`}
      aria-label={`報名狀態：${STATUS_LABELS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

function CapacityBar({ registered, capacity }: { registered: number; capacity: number }) {
  const percent = capacity > 0 ? Math.min((registered / capacity) * 100, 100) : 0
  const isFull = percent >= 100

  return (
    <div>
      <div
        className={styles.capacityBar}
        role="progressbar"
        aria-valuenow={registered}
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-label={`已報名 ${registered} / ${capacity} 人`}
      >
        <div
          className={`${styles.capacityFill} ${isFull ? styles.capacityFillFull : ''}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className={styles.capacityText}>
        已報名 <strong>{registered}</strong> / {capacity} 人（{Math.round(percent)}%）
      </p>
    </div>
  )
}

function CtaButton({ status, eventId }: { status: RegistrationStatus; eventId: string }) {
  const navigate = useNavigate()

  const handleRegister = () => {
    navigate(`/orders/new?eventId=${eventId}`)
  }

  if (status === 'OPEN') {
    return (
      <button type="button" className={styles.ctaButtonOpen} onClick={handleRegister}>
        立即報名 &#8594;
      </button>
    )
  }

  const label = status === 'FULL' ? '名額已滿' : '報名截止'
  return (
    <button type="button" className={styles.ctaButtonDisabled} disabled aria-disabled="true">
      {label}
    </button>
  )
}

// ---- skeleton ---------------------------------------------------------------

function EventDetailSkeleton() {
  return (
    <div className={styles.skeletonWrapper} role="status" aria-label="載入賽事詳情中...">
      {/* badge + title */}
      <SkeletonLoader width="80px" height="22px" borderRadius="9999px" />
      <SkeletonLoader width="70%" height="32px" />
      <SkeletonLoader width="40%" height="18px" />

      {/* info card */}
      <div className={styles.skeletonCard}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={styles.skeletonRow}>
            <SkeletonLoader width="24px" height="24px" borderRadius="50%" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <SkeletonLoader width="30%" height="12px" />
              <SkeletonLoader width="60%" height="18px" />
            </div>
          </div>
        ))}
      </div>

      {/* description */}
      <SkeletonLoader width="100%" height="16px" />
      <SkeletonLoader width="92%" height="16px" />
      <SkeletonLoader width="85%" height="16px" />
      <SkeletonLoader width="78%" height="16px" />
    </div>
  )
}

// ---- not found --------------------------------------------------------------

function NotFoundState({ onBack }: { onBack: () => void }) {
  return (
    <div className={styles.notFoundState}>
      <div className={styles.notFoundIcon} aria-hidden="true">
        &#128269;
      </div>
      <p className={styles.notFoundTitle}>找不到此賽事</p>
      <p className={styles.notFoundDesc}>此賽事可能已下架或網址有誤，請返回賽事列表重新查找。</p>
      <button type="button" className={styles.notFoundAction} onClick={onBack}>
        &#8592; 返回賽事列表
      </button>
    </div>
  )
}

// ---- main page --------------------------------------------------------------

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const fetchEvent = useCallback(() => getEventById(id ?? ''), [id])

  const { data, loading, error, execute, retry } = useApi<void, ApiResponse<EventDetail>>(
    fetchEvent
  )

  useEffect(() => {
    void execute()
  }, [execute])

  const handleBack = () => navigate('/events')

  const isNotFound = error instanceof ApiError && error.code === 'RESOURCE_NOT_FOUND'

  const event = data?.data ?? null

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <button
            type="button"
            className={styles.backButton}
            onClick={handleBack}
            aria-label="返回賽事列表"
          >
            <span className={styles.backArrow} aria-hidden="true">
              &#8592;
            </span>
            返回賽事列表
          </button>
        </div>
      </header>

      {/* Main */}
      <main className={styles.main}>
        <div className={styles.container}>
          {/* Loading: skeleton */}
          {loading && <EventDetailSkeleton />}

          {/* Error: 404 */}
          {!loading && isNotFound && <NotFoundState onBack={handleBack} />}

          {/* Error: general */}
          {!loading && error && !isNotFound && (
            <div className={styles.stateWrapper}>
              <ErrorMessage message={`載入賽事失敗：${error.message}`} onRetry={retry} />
            </div>
          )}

          {/* Success */}
          {!loading && !error && event && (
            <>
              {/* Status badge */}
              <StatusBadge status={event.registrationStatus} />

              {/* Title area */}
              <div className={styles.titleArea}>
                <h1 className={styles.eventTitle}>{event.name}</h1>
                {event.organizer && <p className={styles.organizer}>{event.organizer} 主辦</p>}
              </div>

              {/* Info card */}
              <div className={styles.infoCard}>
                {/* Date/Time */}
                <div className={styles.infoRow}>
                  <span className={styles.infoIcon} aria-hidden="true">
                    &#128197;
                  </span>
                  <div className={styles.infoContent}>
                    <p className={styles.infoLabel}>賽事時間</p>
                    <p className={styles.infoValue}>{formatDateTime(event.startTime)}</p>
                    {event.endTime && (
                      <p className={styles.infoValueSecondary}>
                        &#126; {formatDateTime(event.endTime)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Location */}
                <div className={styles.infoRow}>
                  <span className={styles.infoIcon} aria-hidden="true">
                    &#128205;
                  </span>
                  <div className={styles.infoContent}>
                    <p className={styles.infoLabel}>地點</p>
                    <p className={styles.infoValue}>{event.location}</p>
                    {event.address && <p className={styles.infoValueSecondary}>{event.address}</p>}
                  </div>
                </div>

                {/* Age restriction */}
                <div className={styles.infoRow}>
                  <span className={styles.infoIcon} aria-hidden="true">
                    &#128102;
                  </span>
                  <div className={styles.infoContent}>
                    <p className={styles.infoLabel}>年齡限制</p>
                    <p className={styles.infoValue}>
                      {event.ageRestriction.minAge} - {event.ageRestriction.maxAge} 歲
                    </p>
                    {event.ageRestriction.description && (
                      <p className={styles.infoValueSecondary}>
                        {event.ageRestriction.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Fee */}
                <div className={styles.infoRow}>
                  <span className={styles.infoIcon} aria-hidden="true">
                    &#128176;
                  </span>
                  <div className={styles.infoContent}>
                    <p className={styles.infoLabel}>報名費用</p>
                    <p className={`${styles.infoValue} ${styles.feeValue}`}>
                      {formatFee(event.fee)}
                    </p>
                  </div>
                </div>

                {/* Capacity */}
                <div className={styles.infoRow}>
                  <span className={styles.infoIcon} aria-hidden="true">
                    &#128202;
                  </span>
                  <div className={styles.infoContent}>
                    <p className={styles.infoLabel}>名額</p>
                    <CapacityBar registered={event.registeredCount} capacity={event.capacity} />
                  </div>
                </div>
              </div>

              {/* Description */}
              {event.description && (
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.sectionIcon} aria-hidden="true">
                      &#128203;
                    </span>
                    賽事說明
                  </div>
                  <p className={styles.descriptionText}>{event.description}</p>
                </div>
              )}

              {/* Deadline + contact as meta grid */}
              <div className={styles.metaGrid}>
                {event.registrationDeadline && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoIcon} aria-hidden="true">
                      &#128197;
                    </span>
                    <div className={styles.infoContent}>
                      <p className={styles.infoLabel}>報名截止</p>
                      <p className={styles.infoValue}>{formatDate(event.registrationDeadline)}</p>
                    </div>
                  </div>
                )}

                {(event.contactEmail || event.contactPhone) && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoIcon} aria-hidden="true">
                      &#128222;
                    </span>
                    <div className={styles.infoContent}>
                      <p className={styles.infoLabel}>聯絡資訊</p>
                      {event.contactEmail && (
                        <p className={styles.infoValue}>
                          <a href={`mailto:${event.contactEmail}`}>{event.contactEmail}</a>
                        </p>
                      )}
                      {event.contactPhone && (
                        <p className={styles.infoValueSecondary}>
                          <a href={`tel:${event.contactPhone}`}>{event.contactPhone}</a>
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Sticky CTA - only shown when event loaded */}
      {!loading && !error && event && (
        <div className={styles.ctaBar}>
          <div className={styles.ctaInner}>
            <CtaButton status={event.registrationStatus} eventId={event.id} />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <p className={styles.footerText}>&copy; 2026 兒童體育賽事平台. 保留所有權利。</p>
        </div>
      </footer>
    </div>
  )
}
