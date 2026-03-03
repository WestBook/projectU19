import styles from './EventStatsBadge.module.css'

interface EventStatsBadgeProps {
  confirmed: number
  capacity: number
  compact?: boolean
}

export function EventStatsBadge({ confirmed, capacity, compact = false }: EventStatsBadgeProps) {
  const pct = capacity > 0 ? Math.min((confirmed / capacity) * 100, 100) : 0
  const isFull = confirmed >= capacity

  if (compact) {
    return (
      <span className={`${styles.compactBadge} ${isFull ? styles.full : ''}`}>
        {confirmed}/{capacity}
      </span>
    )
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.numbers}>
        <span className={styles.confirmed}>{confirmed}</span>
        <span className={styles.sep}>/</span>
        <span className={styles.capacity}>{capacity}</span>
      </div>
      <div className={styles.track} aria-hidden="true">
        <div
          className={`${styles.fill} ${isFull ? styles.fillFull : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
