import { useState, useCallback } from 'react'

const STORAGE_KEY = 'admin_token'

export interface UseAdminTokenResult {
  token: string
  isLoggedIn: boolean
  setToken: (token: string) => void
  clearToken: () => void
}

export function useAdminToken(): UseAdminTokenResult {
  const [token, setTokenState] = useState<string>(() => localStorage.getItem(STORAGE_KEY) ?? '')

  const setToken = useCallback((newToken: string) => {
    const trimmed = newToken.trim()
    localStorage.setItem(STORAGE_KEY, trimmed)
    setTokenState(trimmed)
  }, [])

  const clearToken = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setTokenState('')
  }, [])

  return {
    token,
    isLoggedIn: token.length > 0,
    setToken,
    clearToken,
  }
}
