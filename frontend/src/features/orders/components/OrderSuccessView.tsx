import { useNavigate } from 'react-router-dom'
import type { Order, OrderWarning } from '@/features/orders/types'
import styles from './OrderSuccessView.module.css'

interface OrderSuccessViewProps {
  order: Order
}

function formatDeadline(iso: string): string {
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

function WarningItem({ warning }: { warning: OrderWarning }) {
  return (
    <div className={styles.warningItem}>
      <span className={styles.warningIcon} aria-hidden="true">
        &#9888;
      </span>
      <span>{warning.message}</span>
    </div>
  )
}

export function OrderSuccessView({ order }: OrderSuccessViewProps) {
  const navigate = useNavigate()

  const hasWarnings = order.warnings && order.warnings.length > 0

  return (
    <div className={styles.wrapper} role="main" aria-label="報名成功">
      <div className={styles.card}>
        {/* Success icon */}
        <div className={styles.iconCircle} aria-hidden="true">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 className={styles.title}>報名成功！</h1>
        <p className={styles.subtitle}>我們已收到您的報名申請</p>

        {/* Order detail */}
        <div className={styles.detailBox}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>賽事名稱</span>
            <span className={styles.detailValue}>{order.eventName}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>訂單號碼</span>
            <span className={`${styles.detailValue} ${styles.orderId}`}>{order.id}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>報名費用</span>
            <span className={`${styles.detailValue} ${styles.fee}`}>
              {order.fee === 0 ? '免費' : `NT$ ${order.fee.toLocaleString('zh-TW')}`}
            </span>
          </div>
          {order.paymentDeadline && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>付款期限</span>
              <span className={`${styles.detailValue} ${styles.deadline}`}>
                {formatDeadline(order.paymentDeadline)}
              </span>
            </div>
          )}
        </div>

        {/* Warnings */}
        {hasWarnings && (
          <div className={styles.warningBox} role="alert" aria-label="注意事項">
            <p className={styles.warningTitle}>注意事項</p>
            {order.warnings!.map((w, idx) => (
              <WarningItem key={idx} warning={w} />
            ))}
          </div>
        )}

        {/* CTA */}
        <button type="button" className={styles.backButton} onClick={() => navigate('/events')}>
          回到賽事列表
        </button>
      </div>
    </div>
  )
}
