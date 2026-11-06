import type { ReactNode } from 'react'
import { MobileShell } from '../../../components/layout/MobileShell'
import { Pane } from '../../../components/layout/ShellScope'
import { DESKTOP_QUERY, useMediaQuery } from '../../../lib/useMediaQuery'
import { CustomerTopBar } from '../components/CustomerChrome'
import { AddressForm } from './AddressForm'
import { OrderDetail } from './OrderDetail'
import { Orders } from './Orders'
import { SavedAddresses } from './SavedAddresses'

/**
 * Two panes from 1280 px (docs/design/responsive.md): a 380 px list on the
 * left and the chosen item on the right. The panes hold the same screens a
 * phone shows one at a time, so every state and action stays the same.
 */
function TwoPanes({ list, detail }: { list: ReactNode; detail: ReactNode }) {
  return (
    <MobileShell>
      <CustomerTopBar bell={false} />
      <div className="flex min-h-0 flex-1">
        <Pane kind="list" className="w-[380px] shrink-0 border-r border-line">
          {list}
        </Pane>
        <Pane kind="detail" className="flex-1">
          {detail}
        </Pane>
      </div>
    </MobileShell>
  )
}

/** The right pane before anything is chosen. */
function PickPrompt({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 px-8 text-center">
      <h2 className="m-0 text-section font-extrabold">{title}</h2>
      <p className="m-0 text-sub text-mute">{text}</p>
    </div>
  )
}

/** `/orders`: the list alone below 1280 px, list and details from 1280 px. */
export function OrdersRoute() {
  const split = useMediaQuery(DESKTOP_QUERY)
  if (!split) return <Orders />
  return <TwoPanes list={<Orders />} detail={<PickPrompt title="Choose an order" text="Its details and timeline show here." />} />
}

/** `/orders/:reference`: the details page below 1280 px, beside the list from 1280 px. */
export function OrderDetailRoute() {
  const split = useMediaQuery(DESKTOP_QUERY)
  if (!split) return <OrderDetail />
  return <TwoPanes list={<Orders />} detail={<OrderDetail />} />
}

/** `/addresses`: the list alone below 1280 px, list and an empty right pane from 1280 px. */
export function AddressesRoute() {
  const split = useMediaQuery(DESKTOP_QUERY)
  if (!split) return <SavedAddresses />
  return <TwoPanes list={<SavedAddresses />} detail={<PickPrompt title="Edit or add an address" text="Choose Edit on an address, or add a new one." />} />
}

/** `/addresses/new` and `/addresses/:id/edit`: the form page below 1280 px, beside the list from 1280 px. */
export function AddressFormRoute() {
  const split = useMediaQuery(DESKTOP_QUERY)
  if (!split) return <AddressForm />
  return <TwoPanes list={<SavedAddresses />} detail={<AddressForm />} />
}
