// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DeliveryLocation } from '../../../domain/orders'
import type { PositionResult } from '../../../lib/devicePosition'
import type { MapLibre } from '../../marketing/loadMapLibre'
import { LocationCard } from './LocationCard'

type Handler = (event: { originalEvent?: unknown }) => void

/** A stand-in for MapLibre: it records the maps it makes and lets a test fire their events. */
class FakeMap {
  static made: FakeMap[] = []
  handlers = new Map<string, Handler>()
  centre = { lat: 6.45, lng: 7.51 }
  removed = false
  touchZoomRotate = { disableRotation: () => undefined }
  options: Record<string, unknown>
  constructor(options: Record<string, unknown>) {
    this.options = options
    FakeMap.made.push(this)
    const centre = options.center as [number, number] | undefined
    if (centre) this.centre = { lat: centre[1], lng: centre[0] }
  }
  on(event: string, handler: Handler) {
    this.handlers.set(event, handler)
    return this
  }
  fire(event: string, payload: { originalEvent?: unknown } = {}) {
    act(() => this.handlers.get(event)?.(payload))
  }
  getCenter() {
    return this.centre
  }
  getZoom() {
    return 16
  }
  jumpTo(options: { center: [number, number] }) {
    this.centre = { lat: options.center[1], lng: options.center[0] }
  }
  zoomIn() {}
  zoomOut() {}
  remove() {
    this.removed = true
  }
}
const loadFakeMap = () => Promise.resolve({ Map: FakeMap } as unknown as MapLibre)

const AREA_CENTRE = { latitude: 6.4447, longitude: 7.5108 }

/** The pin's owner, as a screen is: it keeps the value the card reports. */
function Harness({
  getPosition,
  loadMap = loadFakeMap,
  areaCentre = AREA_CENTRE,
  onChange,
  initial = null,
}: {
  getPosition: () => Promise<PositionResult>
  loadMap?: () => Promise<MapLibre>
  areaCentre?: { latitude: number; longitude: number } | null
  onChange: (value: DeliveryLocation | null) => void
  initial?: DeliveryLocation | null
}) {
  const [value, setValue] = useState<DeliveryLocation | null>(initial)
  return (
    <MemoryRouter>
      <LocationCard
        value={value}
        onChange={(next) => {
          setValue(next)
          onChange(next)
        }}
        areaCentre={areaCentre}
        allCentres={areaCentre ? [areaCentre] : []}
        getPosition={getPosition}
        loadMap={loadMap}
      />
    </MemoryRouter>
  )
}

function setOnline(online: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: online })
  act(() => {
    window.dispatchEvent(new Event(online ? 'online' : 'offline'))
  })
}

afterEach(() => {
  FakeMap.made = []
  setOnline(true)
})

const fix = (accuracy: number): PositionResult => ({ ok: true, latitude: 6.4527134, longitude: 7.5103481, accuracy })

describe('the location card, before the customer taps', () => {
  it('explains first and asks the phone for nothing', () => {
    const getPosition = vi.fn()
    render(<Harness getPosition={getPosition} onChange={vi.fn()} />)
    expect(screen.getByText('Add a pin at your gate')).toBeInTheDocument()
    expect(screen.getByText(/We ask for your phone's location only when you tap the button, and you can type your address instead/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Use my location' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Privacy notice' })).toHaveAttribute('href', '/privacy')
    expect(getPosition).not.toHaveBeenCalled()
    expect(FakeMap.made).toHaveLength(0)
  })

  it('never touches the browser location on its own', () => {
    const getCurrentPosition = vi.fn()
    const watchPosition = vi.fn()
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition, watchPosition } })
    render(<Harness getPosition={undefined as never} onChange={vi.fn()} />)
    expect(getCurrentPosition).not.toHaveBeenCalled()
    expect(watchPosition).not.toHaveBeenCalled()
  })
})

describe('allowing the location', () => {
  it('shows "Finding your location…" while the phone answers, then places the pin from it', async () => {
    const user = userEvent.setup()
    let answer: (result: PositionResult) => void = () => undefined
    const getPosition = vi.fn(() => new Promise<PositionResult>((resolve) => (answer = resolve)))
    const onChange = vi.fn()
    render(<Harness getPosition={getPosition} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Use my location' }))
    expect(screen.getByText('Finding your location…')).toBeInTheDocument()
    expect(getPosition).toHaveBeenCalledTimes(1)
    await act(async () => answer(fix(18)))
    // Six decimal places, and the source says the phone found it.
    expect(onChange).toHaveBeenLastCalledWith({ latitude: 6.452713, longitude: 7.510348, source: 'device_location' })
    expect(screen.getByText(/accurate to about 20 m\. Move the map so the pin sits on your gate\./)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove pin' })).toBeInTheDocument()
  })

  it('says so when the phone is only roughly sure, with the phone\'s own figure', async () => {
    const user = userEvent.setup()
    render(<Harness getPosition={() => Promise.resolve(fix(143))} onChange={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Use my location' }))
    expect(await screen.findByText("Your phone's location is rough (about 140 m). Move the map so the pin sits on your gate.")).toBeInTheDocument()
  })

  it('starts the map at the pin and turns the source to map_pin once the customer moves the map', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness getPosition={() => Promise.resolve(fix(18))} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Use my location' }))
    await waitFor(() => expect(FakeMap.made).toHaveLength(1))
    const map = FakeMap.made[0]
    expect(map.options.center).toEqual([7.510348, 6.452713])
    map.fire('load')
    // The code moving the map is not the customer moving it.
    map.centre = { lat: 6.4531, lng: 7.5107 }
    map.fire('moveend', {})
    expect(onChange).toHaveBeenCalledTimes(1)
    map.fire('moveend', { originalEvent: new Event('touchend') })
    expect(onChange).toHaveBeenLastCalledWith({ latitude: 6.4531, longitude: 7.5107, source: 'map_pin' })
    expect(screen.getByText('Pin moved. It sits on the spot in the centre of the map.')).toBeInTheDocument()
  })

  it('ignores an answer that arrives after the customer cancelled', async () => {
    const user = userEvent.setup()
    let answer: (result: PositionResult) => void = () => undefined
    const onChange = vi.fn()
    render(<Harness getPosition={() => new Promise<PositionResult>((resolve) => (answer = resolve))} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Use my location' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByText('Add a pin at your gate')).toBeInTheDocument()
    await act(async () => answer(fix(10)))
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByText('Add a pin at your gate')).toBeInTheDocument()
  })
})

describe('when the location is not given', () => {
  it('denied: says location is off and leaves typing and placing a pin by hand', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness getPosition={() => Promise.resolve({ ok: false, reason: 'denied' })} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Use my location' }))
    expect(await screen.findByText('Location is off for MmiriOma')).toBeInTheDocument()
    expect(screen.getByText(/type your address below, or place the pin yourself/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Use my location' })).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Place the pin myself' }))
    expect(screen.getByRole('button', { name: 'Remove pin' })).toBeInTheDocument()
  })

  it('unavailable: offers "Try again" and asks the phone again only then', async () => {
    const user = userEvent.setup()
    const getPosition = vi.fn<() => Promise<PositionResult>>().mockResolvedValueOnce({ ok: false, reason: 'unavailable' }).mockResolvedValueOnce(fix(30))
    const onChange = vi.fn()
    render(<Harness getPosition={getPosition} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Use my location' }))
    expect(await screen.findByText("We couldn't find your location")).toBeInTheDocument()
    expect(getPosition).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1))
    expect(getPosition).toHaveBeenCalledTimes(2)
  })

  it('not supported: says the browser cannot share it and leaves the other ways', async () => {
    const user = userEvent.setup()
    render(<Harness getPosition={() => Promise.resolve({ ok: false, reason: 'unsupported' })} onChange={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Use my location' }))
    expect(await screen.findByText("This browser can't share your location")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Place the pin myself' })).toBeEnabled()
  })

  it('offline: says so, asks for nothing and loads no map', () => {
    setOnline(false)
    const getPosition = vi.fn()
    render(<Harness getPosition={getPosition} onChange={vi.fn()} />)
    expect(screen.getByText("You're offline")).toBeInTheDocument()
    expect(screen.getByText("Type your address below. You can add a pin when you're back online.")).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(getPosition).not.toHaveBeenCalled()
    expect(FakeMap.made).toHaveLength(0)
  })

  it('comes back to the explanation when the connection returns', () => {
    setOnline(false)
    render(<Harness getPosition={vi.fn()} onChange={vi.fn()} />)
    setOnline(true)
    expect(screen.getByText('Add a pin at your gate')).toBeInTheDocument()
  })
})

describe('placing the pin by hand', () => {
  it('saves no point until the map is moved, so an area centre is never kept as a gate', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness getPosition={vi.fn()} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Place the pin myself' }))
    expect(screen.getByText('Move the map so the pin sits on your gate.')).toBeInTheDocument()
    await waitFor(() => expect(FakeMap.made).toHaveLength(1))
    // It starts at the chosen area's centre (design, open question 2).
    expect(FakeMap.made[0].options.center).toEqual([AREA_CENTRE.longitude, AREA_CENTRE.latitude])
    FakeMap.made[0].fire('load')
    expect(onChange).not.toHaveBeenCalled()
    FakeMap.made[0].centre = { lat: 6.4455, lng: 7.5112 }
    FakeMap.made[0].fire('moveend', { originalEvent: new Event('mouseup') })
    expect(onChange).toHaveBeenCalledWith({ latitude: 6.4455, longitude: 7.5112, source: 'map_pin' })
  })

  it('is not offered until there is an area to start from, and says to choose one', () => {
    render(<Harness getPosition={vi.fn()} onChange={vi.fn()} areaCentre={null} />)
    expect(screen.getByRole('button', { name: 'Place the pin myself' })).toBeDisabled()
    expect(screen.getByText('Choose your area below, then you can place a pin.')).toBeInTheDocument()
  })

  it('"Remove pin" clears the pin and returns to the explanation', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const saved: DeliveryLocation = { latitude: 6.4455, longitude: 7.5112, source: 'map_pin' }
    render(<Harness getPosition={vi.fn()} onChange={onChange} initial={saved} />)
    expect(screen.getByText('A pin is saved with this address. Move the map to change it.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove pin' }))
    expect(onChange).toHaveBeenLastCalledWith(null)
    expect(screen.getByText('Add a pin at your gate')).toBeInTheDocument()
  })
})

describe('the map frame', () => {
  it('says the typed address is enough when the map cannot load, and loads again on "Try again"', async () => {
    const user = userEvent.setup()
    const loadMap = vi.fn<() => Promise<MapLibre>>().mockRejectedValueOnce(new Error('offline')).mockImplementation(loadFakeMap)
    render(<Harness getPosition={vi.fn()} onChange={vi.fn()} loadMap={loadMap} />)
    await user.click(screen.getByRole('button', { name: 'Place the pin myself' }))
    expect(await screen.findByText(/The map isn't loading\./)).toBeInTheDocument()
    expect(screen.getByText(/Your typed address is enough; we'll use your area's delivery rate\./)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(FakeMap.made).toHaveLength(1))
    expect(loadMap).toHaveBeenCalledTimes(2)
  })

  it('gives the map a label for screen readers and removes it when the card goes', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<Harness getPosition={vi.fn()} onChange={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Place the pin myself' }))
    expect(screen.getByRole('region', { name: 'Map. Move the map to put the pin on your gate.' })).toBeInTheDocument()
    await waitFor(() => expect(FakeMap.made).toHaveLength(1))
    unmount()
    expect(FakeMap.made[0].removed).toBe(true)
  })
})

describe('personal data (NFR-003)', () => {
  it('keeps the position out of the console and browser storage', async () => {
    const user = userEvent.setup()
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((method) => vi.spyOn(console, method).mockImplementation(() => undefined))
    localStorage.clear()
    sessionStorage.clear()
    render(<Harness getPosition={() => Promise.resolve(fix(18))} onChange={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Use my location' }))
    await screen.findByRole('button', { name: 'Remove pin' })
    for (const spy of spies) {
      expect(JSON.stringify(spy.mock.calls)).not.toMatch(/6\.45|7\.51/)
    }
    expect(JSON.stringify({ ...localStorage })).not.toMatch(/6\.45|7\.51/)
    expect(JSON.stringify({ ...sessionStorage })).not.toMatch(/6\.45|7\.51/)
    for (const spy of spies) spy.mockRestore()
  })
})
