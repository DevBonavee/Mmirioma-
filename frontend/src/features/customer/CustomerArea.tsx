import { Outlet } from 'react-router-dom'
import { ShellScope } from '../../components/layout/ShellScope'
import { RequireRole } from '../auth/RequireRole'
import { CustomerDesktopNav } from './components/CustomerChrome'
import { LeaveOrderGuard } from './order/LeaveOrderGuard'
import { OrderDraftProvider } from './order/OrderDraftProvider'

/**
 * Layout route for every signed-in customer screen. It makes the shell the
 * fluid workspace width, with header navigation on desktop, instead of a
 * fixed phone/tablet column.
 */
export function CustomerArea() {
  return (
    // The scope wraps the guard too, so its loading screen is already the customer width.
    <ShellScope width="customer" nav={<CustomerDesktopNav />}>
      <RequireRole role="customer">
        <OrderDraftProvider>
          <LeaveOrderGuard />
          <Outlet />
        </OrderDraftProvider>
      </RequireRole>
    </ShellScope>
  )
}
