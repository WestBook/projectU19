import type { EventDetail } from '@/features/events/types'
import styles from './EventSummaryCard.module.css'

interface EventSummaryCardProps {
  event: EventDetail
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('zh-TW', {
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

export function EventSummaryCard({ event }: EventSummaryCardProps) {
  return (
    <div className={styles.card} aria-label="賽事確認摘要">
      <div className={styles.cardHeader}>賽事確認</div>
      <div className={styles.cardBody}>
        <p className={styles.eventName}>{event.name}</p>
        <div className={styles.metaRow}>
          <span className={styles.metaItem}>
            <span aria-hidden="true">&#128197;</span>
            {formatDateTime(event.startTime)}
          </span>
          <span className={styles.metaItem}>
            <span aria-hidden="true">&#128205;</span>
            {event.location}
          </span>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.metaItem}>
            <span aria-hidden="true">&#128102;</span>
            {event.ageRestriction.minAge}-{event.ageRestriction.maxAge} 歲
          </span>
          <span className={`${styles.metaItem} ${styles.fee}`}>
            <span aria-hidden="true">&#128176;</span>
            {formatFee(event.fee)}
          </span>
        </div>
      </div>
    </div>
  )
}
