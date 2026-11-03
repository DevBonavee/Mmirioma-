import { Outlet } from 'react-router-dom'
import { ShellScope } from '../../components/layout/ShellScope'
import { RequireRole } from '../auth/RequireRole'
import { CustomerDesktopNav } from './components/CustomerChrome'
import { LeaveOrderGuard } from './order/LeaveOrderGuard'
import { OrderDraftProvider } from './order/OrderDraftProvider'

/**
 * Layout route for every signed-in customer screen. It makes the shell the
 * customer width (720 px on a tablet, up to 1120 px from 1280 px, with the
 * header navigation) instead of the 430 px phone column.
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
