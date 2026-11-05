// Shared Vitest setup. Adds DOM matchers (toBeInTheDocument, ...) and unmounts
// rendered components after each test, because Vitest globals are off and
// Testing Library cannot register its automatic cleanup.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom does not play media: its load() and play() only log "Not implemented". Stub them so a screen
// with a <video> (the sign-in hero) renders without noise.
if (typeof HTMLMediaElement !== 'undefined') {
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve())
}

afterEach(() => {
  cleanup()
})
