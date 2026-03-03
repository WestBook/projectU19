import styles from './Pagination.module.css'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const isFirst = currentPage === 0
  const isLast = currentPage === totalPages - 1

  return (
    <nav className={styles.nav} aria-label="分頁導覽">
      <button
        type="button"
        className={styles.pageButton}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={isFirst}
        aria-label="上一頁"
        style={{ visibility: isFirst ? 'hidden' : 'visible' }}
      >
        &#8592; 上頁
      </button>

      <span className={styles.pageInfo} aria-current="page" aria-live="polite">
        第 {currentPage + 1} 頁 / 共 {totalPages} 頁
      </span>

      <button
        type="button"
        className={styles.pageButton}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={isLast}
        aria-label="下一頁"
        style={{ visibility: isLast ? 'hidden' : 'visible' }}
      >
        下頁 &#8594;
      </button>
    </nav>
  )
}
