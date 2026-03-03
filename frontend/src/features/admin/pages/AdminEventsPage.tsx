import { useState, useCallback, useEffect } from 'react'
import { adminGetEvents, adminCreateEvent } from '@/api/adminApi'
import type { AdminGetEventsParams } from '@/api/adminApi'
import type { AdminEvent } from '@/features/admin/types'
import { useAdminToken } from '@/features/admin/hooks/useAdminToken'
import { useCreateEventForm } from '@/features/admin/hooks/useCreateEventForm'
import { TokenLoginForm } from '@/features/admin/components/TokenLoginForm'
import { AdminEventTable } from '@/features/admin/components/AdminEventTable'
import { AdminEventCard } from '@/features/admin/components/AdminEventCard'
import { CreateEventModal } from '@/features/admin/components/CreateEventModal'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { ErrorMessage } from '@/shared/components/ErrorMessage'
import { Pagination } from '@/shared/components/Pagination'
import type { PageInfo } from '@/shared/types/api'
import styles from './AdminEventsPage.module.css'

const STATUS_OPTIONS = [
  { value: '', label: '全部狀態' },
  { value: 'ACTIVE', label: '進行中' },
  { value: 'DRAFT', label: '草稿' },
  { value: 'COMPLETED', label: '已結束' },
  { value: 'CANCELLED', label: '已取消' },
]

const PAGE_SIZE = 10

export function AdminEventsPage() {
  const { isLoggedIn, setToken, clearToken } = useAdminToken()

  // List state
  const [events, setEvents] = useState<AdminEvent[] | null>(null)
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [currentPage, setCurrentPage] = useState(0)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const formHook = useCreateEventForm()

  const fetchEvents = useCallback(async (params: AdminGetEventsParams) => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminGetEvents(params)
      setEvents(res.data)
      setPageInfo(res.page)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '載入失敗'
      setError(msg)
      setEvents(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch on filter/page change (only when logged in)
  useEffect(() => {
    if (!isLoggedIn) return
    void fetchEvents({
      status: statusFilter || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page: currentPage,
      size: PAGE_SIZE,
    })
  }, [isLoggedIn, statusFilter, dateFrom, dateTo, currentPage, fetchEvents])

  const handleRetry = () => {
    void fetchEvents({
      status: statusFilter || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page: currentPage,
      size: PAGE_SIZE,
    })
  }

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(0)
    // fetchEvents will be re-triggered by the useEffect deps
  }

  const handleOpenModal = () => {
    formHook.resetForm()
    setSubmitError(null)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    if (submitting) return
    setModalOpen(false)
    setSubmitError(null)
  }

  const handleCreateSubmit = async () => {
    if (!formHook.validate()) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      const request = formHook.buildRequest()
      await adminCreateEvent(request)
      setModalOpen(false)
      setSuccessMessage(`賽事「${request.name}」已成功建立`)
      formHook.resetForm()
      // Refresh list
      void fetchEvents({
        status: statusFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page: 0,
        size: PAGE_SIZE,
      })
      setCurrentPage(0)
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '建立賽事失敗，請稍後再試'
      setSubmitError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // Not logged in: show token form
  if (!isLoggedIn) {
    return <TokenLoginForm onSubmit={setToken} />
  }

  const totalPages = pageInfo?.totalPages ?? 0
  const totalElements = pageInfo?.totalElements ?? 0

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerBrand}>
            <span className={styles.headerIcon} aria-hidden="true">
              &#127939;
            </span>
            <span className={styles.headerTitle}>管理後台</span>
          </div>
          <button type="button" className={styles.logoutBtn} onClick={clearToken}>
            登出
          </button>
        </div>
      </header>

      {/* Main */}
      <main className={styles.main}>
        <div className={styles.container}>
          {/* Page heading row */}
          <div className={styles.pageHeadingRow}>
            <div>
              <h1 className={styles.h1}>賽事管理</h1>
              {!loading && !error && events !== null && (
                <p className={styles.subtitle} aria-live="polite">
                  共 <strong>{totalElements}</strong> 個賽事
                </p>
              )}
            </div>
            <button type="button" className={styles.newEventBtn} onClick={handleOpenModal}>
              + 新增賽事
            </button>
          </div>

          {/* Success message */}
          {successMessage && (
            <div className={styles.successBanner} role="status" aria-live="polite">
              <span aria-hidden="true">&#10003;</span> {successMessage}
            </div>
          )}

          {/* Filters */}
          <form className={styles.filters} onSubmit={handleApplyFilters} noValidate>
            <div className={styles.filterGroup}>
              <label htmlFor="filter-status" className={styles.filterLabel}>
                狀態
              </label>
              <select
                id="filter-status"
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setCurrentPage(0)
                }}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label htmlFor="filter-date-from" className={styles.filterLabel}>
                起日
              </label>
              <input
                id="filter-date-from"
                type="date"
                className={styles.filterInput}
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value)
                  setCurrentPage(0)
                }}
              />
            </div>

            <div className={styles.filterGroup}>
              <label htmlFor="filter-date-to" className={styles.filterLabel}>
                迄日
              </label>
              <input
                id="filter-date-to"
                type="date"
                className={styles.filterInput}
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value)
                  setCurrentPage(0)
                }}
              />
            </div>

            {(statusFilter || dateFrom || dateTo) && (
              <button
                type="button"
                className={styles.clearFiltersBtn}
                onClick={() => {
                  setStatusFilter('')
                  setDateFrom('')
                  setDateTo('')
                  setCurrentPage(0)
                }}
              >
                清除篩選
              </button>
            )}
          </form>

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
                  error.includes('401') ||
                  error.includes('Unauthorized') ||
                  error.includes('UNAUTHORIZED')
                    ? 'Token 無效或已過期，請重新登入。'
                    : error.includes('NETWORK') || error.includes('Network')
                      ? '無法連線到伺服器，請確認後端服務是否啟動。'
                      : `載入失敗：${error}`
                }
                onRetry={handleRetry}
              />
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && events !== null && events.length === 0 && (
            <div className={styles.stateWrapper}>
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon} aria-hidden="true">
                  &#128197;
                </div>
                <p className={styles.emptyTitle}>尚無賽事</p>
                <p className={styles.emptyDesc}>
                  {statusFilter || dateFrom || dateTo
                    ? '目前篩選條件下沒有符合的賽事，試試調整篩選條件。'
                    : '點擊右上角「+ 新增賽事」開始建立第一個賽事。'}
                </p>
                {!statusFilter && !dateFrom && !dateTo && (
                  <button type="button" className={styles.emptyAction} onClick={handleOpenModal}>
                    + 新增賽事
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Desktop table / Mobile card list */}
          {!loading && !error && events !== null && events.length > 0 && (
            <section aria-label="賽事列表">
              {/* Desktop table */}
              <div className={styles.desktopOnly}>
                <AdminEventTable events={events} />
              </div>

              {/* Mobile cards */}
              <ul className={styles.mobileCardList} role="list">
                {events.map((event) => (
                  <li key={event.id}>
                    <AdminEventCard event={event} />
                  </li>
                ))}
              </ul>

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => {
                  setCurrentPage(page)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              />
            </section>
          )}
        </div>
      </main>

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onSubmit={() => {
          void handleCreateSubmit()
        }}
        submitting={submitting}
        submitError={submitError}
        formHook={formHook}
      />
    </div>
  )
}
