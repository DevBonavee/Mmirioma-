// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import zonesSample from '../../../../docs/api/examples/service-zones.json'
import type { ServiceArea } from '../../lib/api/serviceAreas'
import type { MapLibre } from './loadMapLibre'
import { ServiceAreas } from './ServiceAreas'

// The areas and the support contact come from the API; here `publicApi` is replaced, and the map library is a fake
// handed to the component, because jsdom has no WebGL. The real library is loaded only in a browser.
const api = vi.hoisted(() => ({ getServiceAreas: vi.fn(), getPublicContact: vi.fn() }))
vi.mock('./publicApi', () => api)

const AREAS = zonesSample.items as ServiceArea[]

class FakeMap {
  static instances: FakeMap[] = []
  handlers: Record<string, (() => void)[]> = {}
  sources: string[] = []
  layers: string[] = []
  removed = false
  touchZoomRotate = { disableRotation: vi.fn() }
  zoomIn = vi.fn()
  zoomOut = vi.fn()
  options: Record<string, unknown>
  constructor(options: Record<string, unknown>) {
    this.options = options
    FakeMap.instances.push(this)
  }
  on(event: string, handler: () => void) {
    ;(this.handlers[event] ??= []).push(handler)
  }
  emit(event: string) {
    for (const handler of this.handlers[event] ?? []) handler()
  }
  addSource(id: string) {
    this.sources.push(id)
  }
  addLayer(layer: { id: string }) {
    this.layers.push(layer.id)
  }
  remove() {
    this.removed = true
  }
}

class FakeMarker {
  static instances: FakeMarker[] = []
  removed = false
  lngLat: [number, number] | null = null
  options: { element: HTMLElement }
  constructor(options: { element: HTMLElement }) {
    this.options = options
    FakeMarker.instances.push(this)
  }
  setLngLat(lngLat: [number, number]) {
    this.lngLat = lngLat
    return this
  }
  addTo() {
    return this
  }
  remove() {
    this.removed = true
  }
}

const fakeLibrary = { Map: FakeMap, Marker: FakeMarker } as unknown as MapLibre
const loadMap = vi.fn(async () => fakeLibrary)

function renderAreas() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ServiceAreas loadMap={loadMap} />
    </QueryClientProvider>,
  )
}

/** Runs the map's own "load" event, as the library does once the style has arrived. */
async function mapLoads() {
  await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
  act(() => FakeMap.instances[0].emit('load'))
}

beforeEach(() => {
  FakeMap.instances = []
  FakeMarker.instances = []
  loadMap.mockClear()
  loadMap.mockImplementation(async () => fakeLibrary)
  api.getServiceAreas.mockReset()
  api.getServiceAreas.mockResolvedValue(AREAS)
  api.getPublicContact.mockReset()
  api.getPublicContact.mockResolvedValue({ phone: '+2348133774902', whatsapp: '+2348133774902' })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('ServiceAreas: the list and the states (#346)', () => {
  it('shows a loading box and three grey chips while the areas load', () => {
    api.getServiceAreas.mockReturnValue(new Promise(() => {}))
    renderAreas()
    expect(screen.getByRole('status', { name: 'Loading service areas' })).toHaveAttribute('aria-busy', 'true')
    expect(loadMap).not.toHaveBeenCalled()
  })

  it('lists the real areas by name, and never says "Sample list"', async () => {
    renderAreas()
    const list = await screen.findByRole('list', { name: 'Service areas' })
    expect(within(list).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Independence Layout', 'Ogui Road'])
    expect(screen.queryByText(/sample list/i)).toBeNull()
  })

  it('says so, with the call or WhatsApp link and no map, when no zone is active', async () => {
    api.getServiceAreas.mockResolvedValue([])
    renderAreas()
    expect(await screen.findByText('We have not opened a delivery area yet.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Check your area on WhatsApp/ })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Map of our service areas' })).toBeNull()
    expect(screen.queryByRole('list', { name: 'Service areas' })).toBeNull()
    expect(loadMap).not.toHaveBeenCalled()
  })

  it('offers the phone number instead when WhatsApp support is off', async () => {
    api.getServiceAreas.mockResolvedValue([])
    api.getPublicContact.mockResolvedValue({ phone: '+2348133774902', whatsapp: null })
    renderAreas()
    expect(await screen.findByRole('link', { name: /Call .* to check your area/ })).toHaveAttribute('href', 'tel:+2348133774902')
  })

  it('shows an error with the link and "Try again", and tries again', async () => {
    const user = userEvent.setup()
    api.getServiceAreas.mockRejectedValueOnce(new Error('network'))
    renderAreas()
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not load the areas.')
    expect(screen.getByRole('link', { name: /Check your area/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('list', { name: 'Service areas' })).toBeInTheDocument()
    expect(api.getServiceAreas).toHaveBeenCalledTimes(2)
  })
})

describe('ServiceAreas: the map (#346)', () => {
  it('loads the map library only when the map comes near the viewport', async () => {
    let intersect: (entries: { isIntersecting: boolean }[]) => void = () => {}
    const disconnect = vi.fn()
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: typeof intersect) {
          intersect = callback
        }
        observe() {}
        disconnect = disconnect
      },
    )
    renderAreas()
    await screen.findByRole('list', { name: 'Service areas' })
    expect(loadMap).not.toHaveBeenCalled()
    act(() => intersect([{ isIntersecting: false }]))
    expect(loadMap).not.toHaveBeenCalled()
    act(() => intersect([{ isIntersecting: true }]))
    await waitFor(() => expect(loadMap).toHaveBeenCalledTimes(1))
    expect(disconnect).toHaveBeenCalled()
  })

  it('fits every zone, with cooperative gestures and no rotation', async () => {
    renderAreas()
    await mapLoads()
    const { options, touchZoomRotate } = FakeMap.instances[0]
    // The centres and the boundary of both zones: west 7.5, south 6.44, east 7.52, north 6.46.
    expect(options.bounds).toEqual([
      [7.5, 6.44],
      [7.52, 6.46],
    ])
    expect(options).toMatchObject({ cooperativeGestures: true, dragRotate: false, pitchWithRotate: false })
    expect(touchZoomRotate.disableRotation).toHaveBeenCalled()
  })

  it('draws an outline only for a zone with a boundary, and a named pin for every zone', async () => {
    renderAreas()
    await mapLoads()
    const map = FakeMap.instances[0]
    expect(map.sources).toEqual(['service-areas'])
    expect(map.layers).toEqual(['service-areas-fill', 'service-areas-line'])
    expect(FakeMarker.instances.map((m) => m.options.element.textContent)).toEqual(['Independence Layout', 'Ogui Road'])
    // A pin sits at the zone's centre, as [longitude, latitude].
    expect(FakeMarker.instances[0].lngLat).toEqual([7.5108, 6.4447])
  })

  it('writes a zone name as text, so a name can never inject markup', async () => {
    api.getServiceAreas.mockResolvedValue([{ ...AREAS[0], name: '<img src=x onerror=alert(1)>' }])
    renderAreas()
    await mapLoads()
    const element = FakeMarker.instances[0].options.element
    expect(element.textContent).toBe('<img src=x onerror=alert(1)>')
    expect(element.children).toHaveLength(0)
  })

  it('offers zoom buttons and a labelled region once the map has loaded', async () => {
    const user = userEvent.setup()
    renderAreas()
    expect(screen.queryByRole('button', { name: 'Zoom in' })).toBeNull()
    await mapLoads()
    expect(screen.getByRole('region', { name: 'Map of our service areas' })).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Zoom in' }))
    await user.click(screen.getByRole('button', { name: 'Zoom out' }))
    expect(FakeMap.instances[0].zoomIn).toHaveBeenCalledWith({ animate: true })
    expect(FakeMap.instances[0].zoomOut).toHaveBeenCalledWith({ animate: true })
  })

  it('does not animate the zoom under reduced motion', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('prefers-reduced-motion'), media: query }))
    renderAreas()
    await mapLoads()
    await user.click(await screen.findByRole('button', { name: 'Zoom in' }))
    expect(FakeMap.instances[0].zoomIn).toHaveBeenCalledWith({ animate: false })
  })

  it('removes the map and its pins when the page is left', async () => {
    const view = renderAreas()
    await mapLoads()
    view.unmount()
    expect(FakeMap.instances[0].removed).toBe(true)
    expect(FakeMarker.instances.every((m) => m.removed)).toBe(true)
  })
})

describe('ServiceAreas: when the map cannot load (#346)', () => {
  const NOTE = 'The map could not be loaded. The areas we serve are listed here.'

  it('keeps the list and says so when the library cannot be loaded', async () => {
    loadMap.mockRejectedValue(new Error('chunk failed'))
    renderAreas()
    expect(await screen.findByText(NOTE)).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Service areas' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Map of our service areas' })).toBeNull()
  })

  it('keeps the list and says so when the browser cannot create a map (no WebGL)', async () => {
    loadMap.mockResolvedValue({
      Map: class {
        constructor() {
          throw new Error('Failed to initialize WebGL')
        }
      },
    } as unknown as MapLibre)
    renderAreas()
    expect(await screen.findByText(NOTE)).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Service areas' })).toBeInTheDocument()
  })

  it('says so when the style or the tiles fail before the map has loaded', async () => {
    renderAreas()
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    act(() => FakeMap.instances[0].emit('error'))
    expect(await screen.findByText(NOTE)).toBeInTheDocument()
    expect(FakeMap.instances[0].removed).toBe(true)
  })

  it('says so when the map never finishes loading', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    renderAreas()
    await waitFor(() => expect(FakeMap.instances).toHaveLength(1))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_001)
    })
    expect(screen.getByText(NOTE)).toBeInTheDocument()
  })

  it('keeps a map that has loaded when a later tile fails', async () => {
    renderAreas()
    await mapLoads()
    act(() => FakeMap.instances[0].emit('error'))
    expect(screen.queryByText(NOTE)).toBeNull()
    expect(screen.getByRole('region', { name: 'Map of our service areas' })).toBeInTheDocument()
  })
})
