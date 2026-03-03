import '@testing-library/jest-dom'

// jsdom does not implement window.scrollTo; stub it so tests that trigger
// handlePageChange (which calls window.scrollTo) do not throw.
Object.defineProperty(window, 'scrollTo', {
  value: vi.fn(),
  writable: true,
})
