import type { AdminEvent, RegistrationStatus } from '@/features/admin/types'
import { EventStatsBadge } from './EventStatsBadge'
import styles from './AdminEventTable.module.css'

interface RegistrationStatusBadgeProps {
  status?: RegistrationStatus
  adminStatus: AdminEvent['status']
}

function RegistrationStatusBadge({ status, adminStatus }: RegistrationStatusBadgeProps) {
  if (adminStatus === 'CANCELLED') {
    return <span className={`${styles.badge} ${styles.badgeCancelled}`}>已取消</span>
  }
  if (adminStatus === 'COMPLETED') {
    return <span className={`${styles.badge} ${styles.badgeClosed}`}>已結束</span>
  }
  if (adminStatus === 'DRAFT') {
    return <span className={`${styles.badge} ${styles.badgeClosed}`}>草稿</span>
  }

  switch (status) {
    case 'OPEN':
      return <span className={`${styles.badge} ${styles.badgeOpen}`}>報名開放</span>
    case 'FULL':
      return <span className={`${styles.badge} ${styles.badgeFull}`}>名額已滿</span>
    case 'CLOSED':
      return <span className={`${styles.badge} ${styles.badgeClosed}`}>報名截止</span>
    default:
      return <span className={`${styles.badge} ${styles.badgeOpen}`}>報名開放</span>
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

interface AdminEventTableProps {
  events: AdminEvent[]
}

export function AdminEventTable({ events }: AdminEventTableProps) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th} scope="col">
              賽事名稱
            </th>
            <th className={styles.th} scope="col">
              開始日期
            </th>
            <th className={styles.th} scope="col">
              狀態
            </th>
            <th className={styles.th} scope="col">
              已報名
            </th>
            <th className={styles.th} scope="col">
              收益
            </th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className={styles.tr}>
              <td className={styles.tdName}>
                <span className={styles.eventName}>{event.name}</span>
                {event.location && <span className={styles.eventLocation}>{event.location}</span>}
              </td>
              <td className={styles.td}>
                <span className={styles.dateText}>{formatDate(event.startTime)}</span>
              </td>
              <td className={styles.td}>
                <RegistrationStatusBadge
                  status={event.registrationStatus}
                  adminStatus={event.status}
                />
              </td>
              <td className={styles.td}>
                <EventStatsBadge
                  confirmed={event.statistics?.confirmedOrders ?? event.registeredCount}
                  capacity={event.capacity}
                />
              </td>
              <td className={styles.td}>
                {event.statistics?.totalRevenue !== undefined ? (
                  <span className={styles.revenue}>
                    NT$ {event.statistics.totalRevenue.toLocaleString()}
                  </span>
                ) : (
                  <span className={styles.na}>-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
