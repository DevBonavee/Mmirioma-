import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { PaneContext, ShellScopeContext, type PaneKind, type ShellScopeValue } from './shellContext'

/**
 * Sets the width (and header navigation) of every `MobileShell` below it.
 * Customer/partner areas use fluid workspaces; signed-out routes use a readable
 * card. Without a scope the shell retains the legacy phone-preview policy.
 */
export function ShellScope({ width, nav, children }: ShellScopeValue & { children: ReactNode }) {
  return <ShellScopeContext value={{ width, nav }}>{children}</ShellScopeContext>
}

/**
 * One pane of a two-pane layout. Screens inside keep their own top bar,
 * scroll area and footer; they just stop drawing the page frame.
 */
export function Pane({ kind, className, children }: { kind: Exclude<PaneKind, null>; className?: string; children: ReactNode }) {
  return (
    <PaneContext value={kind}>
      <div data-pane={kind} className={cx('flex min-h-0 min-w-0 flex-col', className)}>
        {children}
      </div>
    </PaneContext>
  )
}
