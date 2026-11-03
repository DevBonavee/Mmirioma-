// @vitest-environment jsdom
import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '../../../../app/queryClient'
import type { DeliveryLocation } from '../../../../domain/orders'
import { mockLogin } from '../../../../mocks/authMock'
import * as customerMock from '../../../../mocks/customerMock'
import * as customerApi from '../../customerApi'
import { resetMockDb } from '../../../../mocks/db'
import { DEMO_PASSWORD } from '../../../../mocks/seed'
import { newDraft, saveDraft } from '../../order/draft'
import { OrderDraftProvider } from '../../order/OrderDraftProvider'
import { Review } from './Review'

// Watch the order the screen sends, and still run the mock's own rules.
vi.mock('../../customerApi', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../customerApi')>()
  return { ...original, createOrder: vi.fn(original.createOrder) }
})

// Renders slowly on a busy machine or CI runner; give the lookups room.
const WAIT = 10_000

const PIN: DeliveryLocation = { latitude: 6.452713, longitude: 7.510348, source: 'map_pin' }

function renderReview() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={['/order/review']}>
        <Routes>
          <Route path="/order/review" element={<OrderDraftProvider><Review /></OrderDraftProvider>} />
          <Route path="*" element={<p>Left the review</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(async () => {
  resetMockDb()
  sessionStorage.clear()
  vi.mocked(customerApi.createOrder).mockClear()
  await mockLogin({ phone: '0803 123 4567', password: DEMO_PASSWORD })
})

describe("the order keeps its own copy of the address's pin (FR-024, #345)", () => {
  it('sends the saved address\'s pin with the order', async () => {
    const [home] = await customerMock.listAddresses()
    await customerMock.updateAddress(home.id, {
      label: home.label,
      address: home.address,
      landmark: home.landmark,
      zone_id: home.zone!.id,
      make_default: true,
      location: PIN,
    })
    saveDraft({ ...newDraft(), address_id: home.id, receiver_name: 'Sample Customer', receiver_phone: '0803 123 4567' })
    const user = userEvent.setup()
    renderReview()
    await user.click(await screen.findByRole('button', { name: /^Place order · ₦/ }, { timeout: WAIT }))
    await waitFor(() => expect(customerApi.createOrder).toHaveBeenCalledTimes(1), { timeout: WAIT })
    expect(vi.mocked(customerApi.createOrder).mock.calls[0][0].delivery_location).toEqual(PIN)
  })

  it('sends the pin chosen for a new address even when that address is not saved', async () => {
    const [home] = await customerMock.listAddresses()
    saveDraft({
      ...newDraft(),
      receiver_name: 'Sample Customer',
      receiver_phone: '0803 123 4567',
      new_address: {
        address: '9 Pin Street, Independence Layout, Enugu',
        landmark: '',
        label: 'Delivery address',
        save: 'once',
        zone: { id: home.zone!.id, name: home.zone!.name },
        location: PIN,
      },
    })
    const user = userEvent.setup()
    renderReview()
    await user.click(await screen.findByRole('button', { name: /^Place order · ₦/ }, { timeout: WAIT }))
    await waitFor(() => expect(customerApi.createOrder).toHaveBeenCalledTimes(1), { timeout: WAIT })
    expect(vi.mocked(customerApi.createOrder).mock.calls[0][0].delivery_location).toEqual(PIN)
  })

  it('sends no pin for an address that has none', async () => {
    const [home] = await customerMock.listAddresses()
    saveDraft({ ...newDraft(), address_id: home.id, receiver_name: 'Sample Customer', receiver_phone: '0803 123 4567' })
    const user = userEvent.setup()
    renderReview()
    await user.click(await screen.findByRole('button', { name: /^Place order · ₦/ }, { timeout: WAIT }))
    await waitFor(() => expect(customerApi.createOrder).toHaveBeenCalledTimes(1), { timeout: WAIT })
    expect(vi.mocked(customerApi.createOrder).mock.calls[0][0].delivery_location ?? null).toBeNull()
  })
})
