import { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useEventList } from '@/features/events/hooks/useEventList'
import { EventCard } from '@/features/events/components/EventCard'
import { EventFilters } from '@/features/events/components/EventFilters'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { ErrorMessage } from '@/shared/components/ErrorMessage'
import { Pagination } from '@/shared/components/Pagination'
import styles from './EventListPage.module.css'

export function EventListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // Parse initial filters from URL
  const urlAge = searchParams.get('age')
  const urlLocation = searchParams.get('location')
  const urlDateFrom = searchParams.get('dateFrom')
  const urlDateTo = searchParams.get('dateTo')
  const urlPage = searchParams.get('page')

  const { events, pageInfo, loading, error, filters, setFilters, retry } = useEventList()

  // Sync URL params → hook state on first render
  useEffect(() => {
    const initial: Parameters<typeof setFilters>[0] = {}
    if (urlAge) initial.age = Number(urlAge)
    if (urlLocation) initial.location = urlLocation
    if (urlDateFrom) initial.dateFrom = urlDateFrom
    if (urlDateTo) initial.dateTo = urlDateTo
    if (urlPage) initial.page = Number(urlPage)

    if (Object.keys(initial).length > 0) {
      setFilters(initial)
    }
    // Only run on mount - sync URL to state once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync hook state → URL params whenever filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.age !== undefined) params.set('age', String(filters.age))
    if (filters.location) params.set('location', filters.location)
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters.dateTo) params.set('dateTo', filters.dateTo)
    if (filters.page > 0) params.set('page', String(filters.page))
    setSearchParams(params, { replace: true })
  }, [filters, setSearchParams])

  const handleApplyFilters = (partial: Parameters<typeof setFilters>[0]) => {
    setFilters({ ...partial, page: 0 })
  }

  const handleClearFilters = () => {
    setFilters({
      age: undefined,
      location: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      page: 0,
    })
  }

  const handlePageChange = (page: number) => {
    setFilters({ page })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleViewDetail = (id: string) => {
    navigate(`/events/${id}`)
  }

  const totalElements = pageInfo?.totalElements ?? 0
  const totalPages = pageInfo?.totalPages ?? 0
  const currentPage = filters.page

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerBrand}>
            <span className={styles.headerIcon} aria-hidden="true">
              &#127939;
            </span>
            <span className={styles.headerTitle}>兒童體育賽事平台</span>
          </div>
          <nav className={styles.headerNav}>
            <a href="/admin" className={styles.adminLink}>
              管理員登入
            </a>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className={styles.main}>
        <div className={styles.container}>
          {/* Page title */}
          <div className={styles.pageTitle}>
            <h1 className={styles.h1}>賽事列表</h1>
            <p className={styles.subtitle}>探索適合您孩子的體育賽事與活動</p>
          </div>

          {/* Filters */}
          <section className={styles.filtersSection} aria-label="篩選條件">
            <EventFilters
              initialFilters={filters}
              onApply={handleApplyFilters}
              onClear={handleClearFilters}
            />
          </section>

          {/* Results summary */}
          {!loading && !error && (
            <div className={styles.resultsSummary} aria-live="polite" aria-atomic="true">
              {events !== null && (
                <span>
                  找到 <strong>{totalElements}</strong> 個賽事
                </span>
              )}
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className={styles.stateWrapper}>
              <LoadingSpinner size="lg" label="載入賽事中..." />
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className={styles.stateWrapper}>
              <ErrorMessage
                message={
                  error.message.includes('Network') || error.message.includes('NETWORK')
                    ? '無法連線到伺服器，請確認網路連線後重試。'
                    : `載入賽事失敗：${error.message}`
                }
                onRetry={retry}
              />
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && events !== null && events.length === 0 && (
            <div className={styles.stateWrapper}>
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon} aria-hidden="true">
                  &#128270;
                </div>
                <p className={styles.emptyTitle}>找不到符合條件的賽事</p>
                <p className={styles.emptyDesc}>試試調整篩選條件，或清除所有篩選來查看全部賽事。</p>
                <button type="button" className={styles.emptyAction} onClick={handleClearFilters}>
                  查看所有賽事
                </button>
              </div>
            </div>
          )}

          {/* Event grid */}
          {!loading && !error && events !== null && events.length > 0 && (
            <section aria-label="賽事列表">
              <ul className={styles.eventGrid} role="list">
                {events.map((event) => (
                  <li key={event.id} className={styles.eventGridItem}>
                    <EventCard event={event} onViewDetail={handleViewDetail} />
                  </li>
                ))}
              </ul>

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </section>
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
