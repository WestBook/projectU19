import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { EventListPage } from './EventListPage'
import * as eventsApi from '@/api/eventsApi'
import type { PageResponse } from '@/shared/types/api'
import type { Event } from '@/features/events/types'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock the entire eventsApi module so we control what getEvents returns.
vi.mock('@/api/eventsApi', () => ({
  getEvents: vi.fn(),
}))

// Mock react-router-dom hooks that are used inside EventListPage.
// We keep the real MemoryRouter/Link etc., only stub out the hooks that
// interact with the URL so tests do not need an actual browser history.
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildPageResponse(events: Event[]): PageResponse<Event> {
  return {
    success: true,
    data: events,
    page: {
      page: 0,
      size: 10,
      totalElements: events.length,
      totalPages: Math.ceil(events.length / 10) || 1,
      hasNext: false,
      hasPrevious: false,
    },
    timestamp: new Date().toISOString(),
  }
}

const SAMPLE_EVENT: Event = {
  id: 'evt-001',
  name: '春季兒童籃球賽',
  ageMin: 8,
  ageMax: 12,
  startTime: '2026-04-01T09:00:00',
  location: '台北市',
}

function renderPage() {
  return render(
    <MemoryRouter>
      <EventListPage />
    </MemoryRouter>,
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EventListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the page header and title without crashing', async () => {
    // Arrange: resolve immediately with empty data
    vi.mocked(eventsApi.getEvents).mockResolvedValue(buildPageResponse([]))

    // Act
    renderPage()

    // Assert: static elements are present
    expect(screen.getByText('兒童體育賽事平台')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '賽事列表' })).toBeInTheDocument()

    // Wait for the async fetch to settle.
    // useEventList fires getEvents on mount (both mount effect and the
    // filter-change effect run on the first render cycle), so we assert
    // it was called at least once rather than pinning to an exact count.
    await waitFor(() => {
      expect(eventsApi.getEvents).toHaveBeenCalled()
    })
  })

  it('shows loading state while waiting for the API', async () => {
    // Arrange: never resolve so loading persists during this check
    let resolvePromise!: (value: PageResponse<Event>) => void
    vi.mocked(eventsApi.getEvents).mockReturnValue(
      new Promise<PageResponse<Event>>((res) => {
        resolvePromise = res
      }),
    )

    // Act
    renderPage()

    // Assert: LoadingSpinner renders with its aria-label
    expect(screen.getByRole('status', { name: '載入賽事中...' })).toBeInTheDocument()

    // Cleanup: resolve the promise so React can finish its state updates
    resolvePromise(buildPageResponse([]))
    await waitFor(() => {
      expect(screen.queryByRole('status', { name: '載入賽事中...' })).not.toBeInTheDocument()
    })
  })

  it('displays event cards when the API returns data', async () => {
    // Arrange
    vi.mocked(eventsApi.getEvents).mockResolvedValue(buildPageResponse([SAMPLE_EVENT]))

    // Act
    renderPage()

    // Assert: wait until the event card heading is visible
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '春季兒童籃球賽' })).toBeInTheDocument()
    })

    // The results summary should mention 1 event
    expect(screen.getByText(/找到/)).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('shows an error alert when the API rejects', async () => {
    // Arrange: simulate a generic server error
    vi.mocked(eventsApi.getEvents).mockRejectedValue(new Error('Server Error'))

    // Act
    renderPage()

    // Assert: ErrorMessage renders with role="alert"
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    // The error text should contain the error message
    expect(screen.getByRole('alert')).toHaveTextContent('載入賽事失敗：Server Error')
  })

  it('shows the empty state when the API returns an empty list', async () => {
    // Arrange
    vi.mocked(eventsApi.getEvents).mockResolvedValue(buildPageResponse([]))

    // Act
    renderPage()

    // Assert
    await waitFor(() => {
      expect(screen.getByText('找不到符合條件的賽事')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: '查看所有賽事' })).toBeInTheDocument()
  })
})
