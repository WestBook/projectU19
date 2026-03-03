import { useState, useCallback, useRef, useEffect } from 'react'
import { ApiError } from '@/api/client'

export interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: ApiError | Error | null
}

export interface UseApiResult<TParams, TResult> extends UseApiState<TResult> {
  execute: (params?: TParams) => Promise<TResult | null>
  retry: () => void
}

export interface UseApiOptions {
  /** When true, the API function is called automatically on mount */
  immediate?: boolean
}

/**
 * Generic hook that wraps any async API function with loading/error/data state.
 *
 * @param apiFn   - The typed API function to call (e.g. getEvents)
 * @param options - Optional configuration
 *
 * @example
 * const { data, loading, error, execute, retry } = useApi(getEvents)
 * await execute({ age: 10 })
 * retry()
 */
export function useApi<TParams, TResult>(
  apiFn: (params?: TParams) => Promise<TResult>,
  options: UseApiOptions = {}
): UseApiResult<TParams, TResult> {
  const { immediate = false } = options

  const [state, setState] = useState<UseApiState<TResult>>({
    data: null,
    loading: false,
    error: null,
  })

  // Store the last params used so retry() can replay the same call
  const lastParamsRef = useRef<TParams | undefined>(undefined)
  // Keep apiFn stable even if the consumer passes an inline function
  const apiFnRef = useRef(apiFn)
  useEffect(() => {
    apiFnRef.current = apiFn
  }, [apiFn])

  const execute = useCallback(async (params?: TParams): Promise<TResult | null> => {
    lastParamsRef.current = params
    setState({ data: null, loading: true, error: null })

    try {
      const result = await apiFnRef.current(params)
      setState({ data: result, loading: false, error: null })
      return result
    } catch (err) {
      const error =
        err instanceof ApiError ? err : err instanceof Error ? err : new Error(String(err))
      setState({ data: null, loading: false, error })
      return null
    }
  }, [])

  const retry = useCallback(() => {
    void execute(lastParamsRef.current)
  }, [execute])

  // Auto-execute on mount when immediate = true
  useEffect(() => {
    if (immediate) {
      void execute(lastParamsRef.current)
    }
    // We intentionally run this only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    ...state,
    execute,
    retry,
  }
}
