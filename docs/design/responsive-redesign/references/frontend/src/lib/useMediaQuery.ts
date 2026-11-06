import { useSyncExternalStore } from 'react'

/**
 * Whether a CSS media query matches now, and again when it changes. Use it
 * only where the layout must render different components (the customer's two
 * panes); everything else is done with Tailwind breakpoints.
 *
 * Where `matchMedia` is missing (the test DOM) the answer is `false`, the
 * phone layout.
 *
 * @param query - A media query such as `(min-width: 1280px)`.
 * @returns `true` while the query matches.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia?.(query)
      list?.addEventListener('change', notify)
      return () => list?.removeEventListener('change', notify)
    },
    () => window.matchMedia?.(query).matches ?? false,
    () => false,
  )
}

/** The desktop width of docs/design/responsive.md (Tailwind `xl`). */
export const DESKTOP_QUERY = '(min-width: 1280px)'
