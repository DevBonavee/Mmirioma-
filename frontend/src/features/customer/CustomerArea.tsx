import { Outlet } from 'react-router-dom'
import { RequireRole } from '../auth/RequireRole'
import { LeaveOrderGuard } from './order/LeaveOrderGuard'
import { OrderDraftProvider } from './order/OrderDraftProvider'

/** Layout route for every signed-in customer screen. */
export function CustomerArea() {
  return (
    <RequireRole role="customer">
      <OrderDraftProvider>
        <LeaveOrderGuard />
        <Outlet />
      </OrderDraftProvider>
    </RequireRole>
  )
}
