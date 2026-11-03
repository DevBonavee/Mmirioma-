// @vitest-environment jsdom
import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '../../../app/queryClient'
import { mockLogin } from '../../../mocks/authMock'
import { listAddresses } from '../../../mocks/customerMock'
import { resetMockDb } from '../../../mocks/db'
import { DEMO_PASSWORD } from '../../../mocks/seed'
import { AddressForm } from './AddressForm'
import { SavedAddresses } from './SavedAddresses'

// The map library needs WebGL, which jsdom lacks: the map frame then shows its "isn't loading" note,
// and everything else about the pin (the phone's position, the saving) is what these tests check.
vi.mock('../../marketing/loadMapLibre', () => ({
  MAP_STYLE_URL: 'https://tiles.test/style',
  loadMapLibre: () => Promise.reject(new Error('no WebGL in the test browser')),
}))

// Renders slowly on a busy machine or CI runner; give the lookups room.
const WAIT = 10_000

function renderAt(path: string) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/addresses" element={<SavedAddresses />} />
          <Route path="/addresses/new" element={<AddressForm />} />
          <Route path="/addresses/:id/edit" element={<AddressForm />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** A phone that answers at once with a fix, and counts how often it was asked. */
function phoneAt(latitude: number, longitude: number, accuracy = 12) {
  const getCurrentPosition = vi.fn<Geolocation['getCurrentPosition']>((ok) =>
    ok({ coords: { latitude, longitude, accuracy } } as unknown as GeolocationPosition),
  )
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } })
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true })
  return getCurrentPosition
}

async function fillAddress(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByRole('textbox', { name: /^Name/ }, { timeout: WAIT }), 'Shop')
  await user.type(screen.getByRole('textbox', { name: /^Delivery address/ }), '5 Market Road, Enugu')
  await user.click(await screen.findByRole('radio', { name: /Independence Layout/ }, { timeout: WAIT }))
}

beforeEach(async () => {
  resetMockDb()
  sessionStorage.clear()
  await mockLogin({ phone: '0803 123 4567', password: DEMO_PASSWORD })
})

afterEach(() => {
  Reflect.deleteProperty(navigator, 'geolocation')
})

describe('the new address screen and the phone location', () => {
  it('asks for no location on opening, and does not offer the old "Move pin" placeholder', async () => {
    const getCurrentPosition = phoneAt(6.4527, 7.5103)
    renderAt('/addresses/new')
    expect(await screen.findByText('Add a pin at your gate', undefined, { timeout: WAIT })).toBeInTheDocument()
    expect(screen.queryByText('Move pin')).not.toBeInTheDocument()
    expect(getCurrentPosition).not.toHaveBeenCalled()
  })

  it('saves the address without any pin when the customer never used the card', async () => {
    const getCurrentPosition = phoneAt(6.4527, 7.5103)
    const user = userEvent.setup()
    renderAt('/addresses/new')
    await fillAddress(user)
    await user.click(screen.getByRole('button', { name: 'Save address' }))
    await waitFor(async () => expect((await listAddresses()).some((a) => a.label === 'Shop')).toBe(true), { timeout: WAIT })
    expect((await listAddresses()).find((a) => a.label === 'Shop')?.location).toBeNull()
    expect(getCurrentPosition).not.toHaveBeenCalled()
  })

  it('saves the phone\'s position with the address, and the saved list shows "Pin on map"', async () => {
    const getCurrentPosition = phoneAt(6.4527134, 7.5103481)
    const user = userEvent.setup()
    renderAt('/addresses/new')
    await fillAddress(user)
    await user.click(screen.getByRole('button', { name: 'Use my location' }))
    expect(await screen.findByText(/Pin placed from your phone's location, accurate to about 10 m/)).toBeInTheDocument()
    expect(getCurrentPosition).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Save address' }))
    expect(await screen.findByText('Pin on map', undefined, { timeout: WAIT })).toBeInTheDocument()
    expect((await listAddresses()).find((a) => a.label === 'Shop')?.location).toEqual({
      latitude: 6.452713,
      longitude: 7.510348,
      source: 'device_location',
    })
  })

  it('keeps typing fully usable when the customer refuses the location', async () => {
    const getCurrentPosition = vi.fn<Geolocation['getCurrentPosition']>((_ok, fail) => fail?.({ code: 1 } as GeolocationPositionError))
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } })
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true })
    const user = userEvent.setup()
    renderAt('/addresses/new')
    await fillAddress(user)
    await user.click(screen.getByRole('button', { name: 'Use my location' }))
    expect(await screen.findByText('Location is off for MmiriOma')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save address' }))
    await waitFor(async () => expect((await listAddresses()).some((a) => a.label === 'Shop')).toBe(true), { timeout: WAIT })
    expect((await listAddresses()).find((a) => a.label === 'Shop')?.location).toBeNull()
  })

  it("tells the customer when the server refuses the pin, and keeps the fields and the pin", async () => {
    // Far outside Enugu State: the server's bounds check answers 422 on the location (docs/api/delivery-location.md).
    phoneAt(0, 0)
    const user = userEvent.setup()
    renderAt('/addresses/new')
    await fillAddress(user)
    await user.click(screen.getByRole('button', { name: 'Use my location' }))
    await screen.findByRole('button', { name: 'Remove pin' })
    await user.click(screen.getByRole('button', { name: 'Save address' }))
    expect(
      await screen.findByText("We can't use that pin: it's outside the area we deliver to. Move it, or remove the pin and save without it.", undefined, {
        timeout: WAIT,
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /^Name/ })).toHaveValue('Shop')
    expect(screen.getByRole('textbox', { name: /^Delivery address/ })).toHaveValue('5 Market Road, Enugu')
    expect(screen.getByRole('button', { name: 'Remove pin' })).toBeInTheDocument()
    expect((await listAddresses()).some((a) => a.label === 'Shop')).toBe(false)
    // Removing the pin lets the same address save.
    await user.click(screen.getByRole('button', { name: 'Remove pin' }))
    await user.click(screen.getByRole('button', { name: 'Save address' }))
    await waitFor(async () => expect((await listAddresses()).some((a) => a.label === 'Shop')).toBe(true), { timeout: WAIT })
  })
})

describe('editing an address that has a pin', () => {
  async function addPinnedAddress() {
    phoneAt(6.4527, 7.5103)
    const user = userEvent.setup()
    const view = renderAt('/addresses/new')
    await fillAddress(user)
    await user.click(screen.getByRole('button', { name: 'Use my location' }))
    await screen.findByRole('button', { name: 'Remove pin' })
    await user.click(screen.getByRole('button', { name: 'Save address' }))
    await screen.findByText('Pin on map', undefined, { timeout: WAIT })
    view.unmount()
    return (await listAddresses()).find((a) => a.label === 'Shop')!
  }

  it('shows the saved pin, and "Remove pin" then saving takes it off the address', async () => {
    const pinned = await addPinnedAddress()
    const user = userEvent.setup()
    renderAt(`/addresses/${pinned.id}/edit`)
    expect(await screen.findByText('A pin is saved with this address. Move the map to change it.', undefined, { timeout: WAIT })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove pin' }))
    await user.click(screen.getByRole('button', { name: 'Save address' }))
    await waitFor(async () => expect((await listAddresses()).find((a) => a.id === pinned.id)?.location).toBeNull(), { timeout: WAIT })
  })

  it('leaves the pin on the address when it is saved without touching it', async () => {
    const pinned = await addPinnedAddress()
    const user = userEvent.setup()
    renderAt(`/addresses/${pinned.id}/edit`)
    await screen.findByText('A pin is saved with this address. Move the map to change it.', undefined, { timeout: WAIT })
    await user.click(screen.getByRole('button', { name: 'Save address' }))
    await screen.findByText('Pin on map', undefined, { timeout: WAIT })
    expect((await listAddresses()).find((a) => a.id === pinned.id)?.location).toMatchObject({ source: 'device_location' })
  })
})
