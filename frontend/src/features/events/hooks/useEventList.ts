import { useState, useEffect, useCallback, useRef } from 'react'
import { useApi } from '@/shared/hooks/useApi'
import { getEvents } from '@/api/eventsApi'
import type { GetEventsParams } from '@/api/eventsApi'
import type { Event } from '@/features/events/types'
import type { PageInfo } from '@/shared/types/api'

export interface EventFilters {
  age?: number
  location?: string
  dateFrom?: string
  dateTo?: string
  page: number
  size: number
  sort?: string
}

export interface UseEventListResult {
  events: Event[] | null
  pageInfo: PageInfo | null
  loading: boolean
  error: Error | null
  filters: EventFilters
  setFilters: (filters: Partial<EventFilters>) => void
  retry: () => void
}

const DEFAULT_FILTERS: EventFilters = {
  age: undefined,
  location: undefined,
  dateFrom: undefined,
  dateTo: undefined,
  page: 0,
  size: 10,
  sort: undefined,
}

/**
 * Wraps getEvents with filter state management.
 * Automatically fetches on mount and whenever filters change.
 *
 * @example
 * const { events, pageInfo, loading, error, filters, setFilters, retry } = useEventList()
 * setFilters({ location: '台北', page: 1 })
 */
export function useEventList(): UseEventListResult {
  const [filters, setFiltersState] = useState<EventFilters>(DEFAULT_FILTERS)
  const { data, loading, error, execute, retry } = useApi(getEvents)

  // Track whether the initial fetch has been triggered so filter-change
  // effect does not duplicate it on first render
  const hasMountedRef = useRef(false)

  const buildParams = useCallback((f: EventFilters): GetEventsParams => {
    return {
      age: f.age,
      location: f.location,
      dateFrom: f.dateFrom,
      dateTo: f.dateTo,
      page: f.page,
      size: f.size,
      sort: f.sort,
    }
  }, [])

  // Fetch on mount with initial filters
  useEffect(() => {
    hasMountedRef.current = true
    void execute(buildParams(DEFAULT_FILTERS))
    // Intentionally run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-fetch whenever filters change after mount
  useEffect(() => {
    if (!hasMountedRef.current) return
    void execute(buildParams(filters))
  }, [filters, execute, buildParams])

  const setFilters = useCallback((partial: Partial<EventFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial }))
  }, [])

  return {
    events: data?.data ?? null,
    pageInfo: data?.page ?? null,
    loading,
    error,
    filters,
    setFilters,
    retry,
  }
}
