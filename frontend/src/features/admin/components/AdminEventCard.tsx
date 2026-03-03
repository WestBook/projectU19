import type { AdminEvent, RegistrationStatus } from '@/features/admin/types'
import { EventStatsBadge } from './EventStatsBadge'
import styles from './AdminEventCard.module.css'

function getStatusLabel(
  regStatus?: RegistrationStatus,
  adminStatus?: AdminEvent['status']
): string {
  if (adminStatus === 'CANCELLED') return '已取消'
  if (adminStatus === 'COMPLETED') return '已結束'
  if (adminStatus === 'DRAFT') return '草稿'
  switch (regStatus) {
    case 'OPEN':
      return '報名開放'
    case 'FULL':
      return '名額已滿'
    case 'CLOSED':
      return '報名截止'
    default:
      return '報名開放'
  }
}

function getStatusClass(
  regStatus?: RegistrationStatus,
  adminStatus?: AdminEvent['status']
): string {
  if (adminStatus === 'CANCELLED') return styles.cancelled
  if (adminStatus === 'COMPLETED' || adminStatus === 'DRAFT') return styles.closed
  switch (regStatus) {
    case 'OPEN':
      return styles.open
    case 'FULL':
      return styles.full
    case 'CLOSED':
      return styles.closed
    default:
      return styles.open
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return iso
  }
}

interface AdminEventCardProps {
  event: AdminEvent
}

export function AdminEventCard({ event }: AdminEventCardProps) {
  const statusLabel = getStatusLabel(event.registrationStatus, event.status)
  const statusClass = getStatusClass(event.registrationStatus, event.status)

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.name}>{event.name}</h3>
        <span className={`${styles.badge} ${statusClass}`}>{statusLabel}</span>
      </div>

      {event.location && <p className={styles.location}>{event.location}</p>}

      <div className={styles.meta}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>開始日期</span>
          <span className={styles.metaValue}>{formatDate(event.startTime)}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>已報名</span>
          <div className={styles.metaValue}>
            <EventStatsBadge
              confirmed={event.statistics?.confirmedOrders ?? event.registeredCount}
              capacity={event.capacity}
            />
          </div>
        </div>
        {event.statistics?.totalRevenue !== undefined && (
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>收益</span>
            <span className={styles.revenue}>
              NT$ {event.statistics.totalRevenue.toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
