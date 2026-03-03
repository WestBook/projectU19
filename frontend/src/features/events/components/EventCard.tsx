import type { Event } from '@/features/events/types'
import styles from './EventCard.module.css'

interface EventCardProps {
  event: Event
  onViewDetail?: (id: string) => void
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = String(date.getHours()).padStart(2, '0')
  const mins = String(date.getMinutes()).padStart(2, '0')
  return `${month}/${day} ${hours}:${mins}`
}

export function EventCard({ event, onViewDetail }: EventCardProps) {
  const handleClick = () => {
    if (onViewDetail) {
      onViewDetail(event.id)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <article
      className={styles.card}
      role={onViewDetail ? 'button' : undefined}
      tabIndex={onViewDetail ? 0 : undefined}
      onClick={onViewDetail ? handleClick : undefined}
      onKeyDown={onViewDetail ? handleKeyDown : undefined}
      aria-label={`賽事：${event.name}`}
    >
      <h3 className={styles.name}>{event.name}</h3>

      <ul className={styles.metaList}>
        <li className={styles.metaItem}>
          <span className={styles.metaIcon} aria-hidden="true">
            &#128197;
          </span>
          <span>{formatDateTime(event.startTime)}</span>
        </li>
        <li className={styles.metaItem}>
          <span className={styles.metaIcon} aria-hidden="true">
            &#128205;
          </span>
          <span>{event.location}</span>
        </li>
        <li className={styles.metaItem}>
          <span className={styles.metaIcon} aria-hidden="true">
            &#128102;
          </span>
          <span>
            {event.ageMin}-{event.ageMax} 歲
          </span>
        </li>
      </ul>

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.detailButton}
          onClick={(e) => {
            e.stopPropagation()
            if (onViewDetail) onViewDetail(event.id)
          }}
          aria-label={`查看 ${event.name} 詳情`}
        >
          查看詳情 &#8594;
        </button>
      </div>
    </article>
  )
}
