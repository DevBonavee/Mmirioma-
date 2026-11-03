import { createContext, useContext, type ReactNode } from 'react'

/**
 * How wide `MobileShell` is from 768 px up (docs/design/responsive.md):
 *
 * - `phone`: a 430 px column. The default, and what the rider and driver app uses.
 * - `customer`: 720 px on a tablet, up to 1120 px from 1280 px, with the
 *   navigation in the header.
 * - `card`: 480 px, for the customer's signed-out screens (sign in, sign up).
 *
 * Below 768 px all three are the same full-width phone screen.
 */
export type ShellWidth = 'phone' | 'customer' | 'card'

/** What a group of screens tells `MobileShell` about itself. */
export interface ShellScopeValue {
  width: ShellWidth
  /** Header navigation shown from 1280 px in place of the bottom tab bar (customer only). */
  nav?: ReactNode
}

export const ShellScopeContext = createContext<ShellScopeValue>({ width: 'phone' })

/** The shell settings of the screen being drawn. */
export function useShellScope(): ShellScopeValue {
  return useContext(ShellScopeContext)
}

/**
 * Set when a screen is drawn inside one pane of a two-pane layout (customer
 * Orders and Addresses from 1280 px): `list` is the left pane, `detail` the
 * right one. The screen then fills its pane instead of the page: no frame,
 * and the left pane shows no top bar because the page header serves it.
 */
export type PaneKind = 'list' | 'detail' | null

export const PaneContext = createContext<PaneKind>(null)

/** The pane this screen is drawn in, or `null` when it fills the page. */
export function usePane(): PaneKind {
  return useContext(PaneContext)
}
