import { createContext, useContext, type ReactNode } from 'react'

/**
 * Page-width policies. Customer and partner workspaces fill the available
 * width, including public authentication pages. Only legacy phone previews
 * are capped. Width is independent of the page's scroll owner and navigation.
 */
export type ShellWidth = 'phone' | 'customer' | 'partner' | 'card'

/** What a group of screens tells `MobileShell` about itself. */
export interface ShellScopeValue {
  width: ShellWidth
  /** Header navigation shown from 1280 px in place of the bottom tab bar. */
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
