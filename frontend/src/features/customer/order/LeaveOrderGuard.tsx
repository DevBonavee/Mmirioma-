import { useBlocker } from 'react-router-dom'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { shouldAskBeforeLeaving } from './leaveOrder'

/**
 * Asks "Leave this order?" before the customer leaves an unfinished order for
 * another page, by the logo or any other link (docs/design/landing-v1.md,
 * "Leaving an unfinished order"). Stay is the default. The draft is kept either
 * way: it survives a reload, so the text says it is kept but not placed.
 *
 * Render once inside the customer area. It needs a data router (`useBlocker`).
 */
export function LeaveOrderGuard() {
  const blocker = useBlocker(shouldAskBeforeLeaving)
  return (
    <ConfirmDialog
      open={blocker.state === 'blocked'}
      title="Leave this order?"
      confirmLabel="Leave"
      cancelLabel="Stay"
      tone="primary"
      onConfirm={() => blocker.state === 'blocked' && blocker.proceed()}
      onCancel={() => blocker.state === 'blocked' && blocker.reset()}
    >
      What you entered is kept on this device for now, but it is not placed.
    </ConfirmDialog>
  )
}
