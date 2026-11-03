// @vitest-environment jsdom
import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '../../../../app/queryClient'
import { mockLogin, mockRegister } from '../../../../mocks/authMock'
import { listAddresses, updateAddress } from '../../../../mocks/customerMock'
import { resetMockDb } from '../../../../mocks/db'
import { DEMO_PASSWORD } from '../../../../mocks/seed'
import { newDraft, saveDraft } from '../../order/draft'
import { OrderDraftProvider } from '../../order/OrderDraftProvider'
import { DeliveryDetails } from './DeliveryDetails'

// The map library needs WebGL, which jsdom lacks: a map frame then shows its "isn't loading" note.
vi.mock('../../../marketing/loadMapLibre', () => ({
  MAP_STYLE_URL: 'https://tiles.test/style',
  loadMapLibre: () => Promise.reject(new Error('no WebGL in the test browser')),
}))

// Renders slowly on a busy machine or CI runner; give the lookups room.
const WAIT = 10_000

function renderDetails() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={['/order/details']}>
        <Routes>
          <Route path="/order/details" element={<OrderDraftProvider><DeliveryDetails /></OrderDraftProvider>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** A draft left by another account: it points at an address this account does not have. */
function leaveForeignDraft() {
  saveDraft({ ...newDraft(), address_id: 'addr-of-someone-else' })
}

beforeEach(() => {
  resetMockDb()
  sessionStorage.clear()
})

describe('a draft address id the account does not own is not trusted (#272)', () => {
  it('shows the address field for an account with no saved addresses', async () => {
    await mockRegister({ name: 'New Customer', phone: '08051112233', password: 'Sample-Passw0rd-1', accepted_terms: true })
    leaveForeignDraft()
    renderDetails()
    expect(await screen.findByRole('textbox', { name: 'Delivery address' }, { timeout: WAIT })).toBeInTheDocument()
  })

  it('selects the account\'s own default address when it has saved ones', async () => {
    await mockLogin({ phone: '0803 123 4567', password: DEMO_PASSWORD })
    leaveForeignDraft()
    renderDetails()
    const select = await screen.findByRole('combobox', { name: 'Delivery address' }, { timeout: WAIT })
    expect(select).toHaveValue('addr-home')
  })
})

describe('the pin on Delivery details (#345)', () => {
  it('offers the location card for a new address, asks the phone for nothing, and has no "Move pin" placeholder', async () => {
    const getCurrentPosition = vi.fn()
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } })
    await mockRegister({ name: 'New Customer', phone: '08051112233', password: 'Sample-Passw0rd-1', accepted_terms: true })
    renderDetails()
    expect(await screen.findByText('Add a pin at your gate', undefined, { timeout: WAIT })).toBeInTheDocument()
    expect(screen.queryByText('Move pin')).not.toBeInTheDocument()
    expect(screen.queryByText(/Map pins are not available yet/)).not.toBeInTheDocument()
    expect(getCurrentPosition).not.toHaveBeenCalled()
    Reflect.deleteProperty(navigator, 'geolocation')
  })

  it('shows a saved address\'s pin as it is, to change from Saved addresses, and no card to set another', async () => {
    await mockLogin({ phone: '0803 123 4567', password: DEMO_PASSWORD })
    const [home] = await listAddresses()
    await updateAddress(home.id, {
      label: home.label,
      address: home.address,
      landmark: home.landmark,
      zone_id: home.zone!.id,
      make_default: true,
      location: { latitude: 6.452713, longitude: 7.510348, source: 'map_pin' },
    })
    renderDetails()
    expect(await screen.findByText('This address has a pin. To change it, edit the address in Saved addresses.', undefined, { timeout: WAIT })).toBeInTheDocument()
    expect(screen.queryByText('Add a pin at your gate')).not.toBeInTheDocument()
  })

  it('says nothing about a pin for a saved address that has none', async () => {
    await mockLogin({ phone: '0803 123 4567', password: DEMO_PASSWORD })
    renderDetails()
    await screen.findByRole('combobox', { name: 'Delivery address' }, { timeout: WAIT })
    expect(screen.queryByText(/This address has a pin/)).not.toBeInTheDocument()
    expect(screen.queryByText('Add a pin at your gate')).not.toBeInTheDocument()
  })
})
