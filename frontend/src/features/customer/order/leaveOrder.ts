import type { BlockerFunction } from 'react-router-dom'
import { hasUnsentChanges, loadDraft } from './draft'

/** The order steps: type, quantity, delivery details, address, save address and review. */
export function isOrderStep(pathname: string): boolean {
  return pathname === '/order' || pathname.startsWith('/order/')
}

/**
 * Whether a move should ask "Leave this order?" (#337): it goes from an order
 * step to a page outside the order, and the stored draft has something in it.
 *
 * The draft is read from storage, not from React state, on purpose. Placing an
 * order calls `reset()` and then `navigate()` in the same tick, before React has
 * re-rendered; `reset()` clears the stored draft at once, so the move to
 * "Order placed" is not mistaken for leaving an unfinished order.
 */
export const shouldAskBeforeLeaving: BlockerFunction = ({ currentLocation, nextLocation }) =>
  isOrderStep(currentLocation.pathname) && !isOrderStep(nextLocation.pathname) && hasUnsentChanges(loadDraft())
