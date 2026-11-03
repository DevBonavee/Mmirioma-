import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { PaneContext, ShellScopeContext, type PaneKind, type ShellScopeValue } from './shellContext'

/**
 * Sets the width (and header navigation) of every `MobileShell` below it.
 * The customer area and the customer's signed-out screens use it; without it
 * the shell is the 430 px phone column.
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
