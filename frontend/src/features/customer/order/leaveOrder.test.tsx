// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, RouterProvider, createMemoryRouter, useNavigate } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearDraft, hasUnsentChanges, newDraft, saveDraft } from './draft'
import { LeaveOrderGuard } from './LeaveOrderGuard'
import { isOrderStep, shouldAskBeforeLeaving } from './leaveOrder'
import { OrderDraftProvider } from './OrderDraftProvider'
import { useOrderDraft } from './orderDraftContext'

beforeEach(() => {
  sessionStorage.clear()
  vi.restoreAllMocks()
})

describe('hasUnsentChanges: is the draft more than the starting one', () => {
  it('is false for a fresh draft, whatever its one-time key', () => {
    expect(hasUnsentChanges(newDraft())).toBe(false)
    expect(hasUnsentChanges({ ...newDraft(), idempotency_key: 'another-key' })).toBe(false)
  })

  it.each([
    ['a tanker chosen', () => ({ ...newDraft(), delivery_type: 'tanker' as const })],
    ['a can count changed', () => ({ ...newDraft(), keke: { can_size_litres: 25 as const, can_count: 30 } })],
    ['a receiver name typed', () => ({ ...newDraft(), receiver_name: 'Ada' })],
    ['an address typed', () => ({ ...newDraft(), new_address: { ...newDraft().new_address, address: '12 Sample Close' } })],
  ])('is true once %s', (_label, draft) => {
    expect(hasUnsentChanges(draft())).toBe(true)
  })
})

describe('isOrderStep', () => {
  it.each(['/order', '/order/keke', '/order/tanker', '/order/details', '/order/address', '/order/save-address', '/order/review'])('counts %s', (path) => {
    expect(isOrderStep(path)).toBe(true)
  })

  it.each(['/home', '/orders', '/orders/MO-1/placed', '/ordering', '/menu'])('does not count %s', (path) => {
    expect(isOrderStep(path)).toBe(false)
  })
})

describe('shouldAskBeforeLeaving: the stored draft decides', () => {
  const move = (from: string, to: string) => ({ currentLocation: { pathname: from }, nextLocation: { pathname: to } }) as Parameters<typeof shouldAskBeforeLeaving>[0]

  it('asks to leave an order step for a page outside the order when the draft has something in it', () => {
    saveDraft({ ...newDraft(), receiver_name: 'Ada' })
    expect(shouldAskBeforeLeaving(move('/order/details', '/'))).toBe(true)
    expect(shouldAskBeforeLeaving(move('/order/review', '/home'))).toBe(true)
  })

  it('does not ask for an untouched draft', () => {
    expect(shouldAskBeforeLeaving(move('/order', '/'))).toBe(false)
    saveDraft(newDraft())
    expect(shouldAskBeforeLeaving(move('/order', '/'))).toBe(false)
  })

  it('does not ask when moving between order steps', () => {
    saveDraft({ ...newDraft(), receiver_name: 'Ada' })
    expect(shouldAskBeforeLeaving(move('/order/details', '/order/review'))).toBe(false)
  })

  it('does not ask from a page that is not an order step', () => {
    saveDraft({ ...newDraft(), receiver_name: 'Ada' })
    expect(shouldAskBeforeLeaving(move('/home', '/menu'))).toBe(false)
  })
})

/** An order step with a link home and a button that places the order the way Review does: reset, then navigate, in one tick. */
function OrderStep() {
  const { reset } = useOrderDraft()
  const navigate = useNavigate()
  return (
    <>
      <LeaveOrderGuard />
      <h1>An order step</h1>
      <Link to="/">MmiriOma, home</Link>
      <Link to="/order/review">Next step</Link>
      <button
        type="button"
        onClick={() => {
          reset()
          navigate('/orders/MO-1/placed', { replace: true })
        }}
      >
        Place order
      </button>
    </>
  )
}

function renderOrder() {
  const router = createMemoryRouter(
    [
      {
        element: <OrderDraftProvider><OrderStep /></OrderDraftProvider>,
        children: [{ path: '/order/details' }, { path: '/order/review' }],
      },
      { path: '/', element: <h1>The homepage</h1> },
      { path: '/orders/:reference/placed', element: <h1>Order placed</h1> },
    ],
    { initialEntries: ['/order/details'] },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('the "Leave this order?" prompt', () => {
  it('asks first, with Stay as the default, and keeps the order when the customer stays', async () => {
    saveDraft({ ...newDraft(), receiver_name: 'Ada' })
    const user = userEvent.setup()
    const router = renderOrder()
    await user.click(screen.getByRole('link', { name: 'MmiriOma, home' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Leave this order?' })
    expect(within(dialog).getByText('What you entered is kept on this device for now, but it is not placed.')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Stay' })).toHaveFocus()
    await user.click(within(dialog).getByRole('button', { name: 'Stay' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(router.state.location.pathname).toBe('/order/details')
    expect(JSON.parse(sessionStorage.getItem('mmirioma.orderDraft.v1')!).receiver_name).toBe('Ada')
  })

  it('goes to the homepage when the customer leaves, and the draft is still kept', async () => {
    saveDraft({ ...newDraft(), receiver_name: 'Ada' })
    const user = userEvent.setup()
    const router = renderOrder()
    await user.click(screen.getByRole('link', { name: 'MmiriOma, home' }))
    await user.click(await screen.findByRole('button', { name: 'Leave' }))
    expect(await screen.findByRole('heading', { name: 'The homepage' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
    expect(sessionStorage.getItem('mmirioma.orderDraft.v1')).not.toBeNull()
  })

  it('does not ask for an untouched draft', async () => {
    const user = userEvent.setup()
    renderOrder()
    await user.click(screen.getByRole('link', { name: 'MmiriOma, home' }))
    expect(await screen.findByRole('heading', { name: 'The homepage' })).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('does not ask when the customer moves to the next order step', async () => {
    saveDraft({ ...newDraft(), receiver_name: 'Ada' })
    const user = userEvent.setup()
    const router = renderOrder()
    await user.click(screen.getByRole('link', { name: 'Next step' }))
    expect(router.state.location.pathname).toBe('/order/review')
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('does not ask when the order was just placed, even though React has not re-rendered yet', async () => {
    saveDraft({ ...newDraft(), receiver_name: 'Ada' })
    const user = userEvent.setup()
    renderOrder()
    await user.click(screen.getByRole('button', { name: 'Place order' }))
    expect(await screen.findByRole('heading', { name: 'Order placed' })).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('leaves nothing stored once the draft is cleared', () => {
    saveDraft({ ...newDraft(), receiver_name: 'Ada' })
    clearDraft()
    expect(sessionStorage.getItem('mmirioma.orderDraft.v1')).toBeNull()
  })
})
