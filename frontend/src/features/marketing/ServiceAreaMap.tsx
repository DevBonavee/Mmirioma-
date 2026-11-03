import { useEffect, useRef, useState } from 'react'
import type { ServiceArea } from '../../lib/api/serviceAreas'
import { loadMapLibre, MAP_STYLE_URL as STYLE_URL, type MapLibre } from './loadMapLibre'

/** The map is given up on after this long without loading (tiles or style never arrived). */
const LOAD_TIMEOUT_MS = 10_000

/** Margin around the zones when the map fits them, in pixels; and the closest it zooms in. */
const FIT_PADDING = 40
const FIT_MAX_ZOOM = 14

const prefersReducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Every point of every zone: its centre and boundary, as `[longitude, latitude]`. */
function allPositions(areas: ServiceArea[]): [number, number][] {
  return areas.flatMap((area) => [
    [area.centre.longitude, area.centre.latitude] as [number, number],
    ...(area.boundary?.coordinates.flatMap((ring) => ring.map((p): [number, number] => [p[0], p[1]])) ?? []),
  ])
}

/** A zone's name as a pin on the map. Text only (`textContent`), so a name can never inject markup. */
function pinElement(name: string): HTMLElement {
  const element = document.createElement('div')
  element.className = 'rounded-full bg-white px-2.5 py-1 text-[13px] font-bold whitespace-nowrap text-ink shadow-md'
  element.textContent = name
  return element
}

const ZOOM_BUTTON =
  'flex size-12 cursor-pointer items-center justify-center border-0 bg-white text-[24px] leading-none font-bold text-ink hover:bg-mk-chip focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary'

interface ServiceAreaMapProps {
  /** The active zones to draw; a zone with a boundary is an area, one without is a pin at its centre. */
  areas: ServiceArea[]
  /** Shown instead of the map when it cannot load. Called once per failure. */
  onUnavailable?: () => void
  /** Loads the map library. Tests pass a fake; the default imports MapLibre. */
  loadMap?: () => Promise<MapLibre>
}

/**
 * The landing page's service-area map (#346, docs/design/landing-service-areas.md).
 *
 * The map is an enhancement: the list of area names beside it never depends
 * on it. It loads only when it comes near the viewport; one finger scrolls
 * the page and two move the map (cooperative gestures); the zoom buttons are
 * 48 px; the library's attribution stays visible; with reduced motion it
 * jumps to its view instead of animating. If the library, the style or the
 * tiles do not arrive, or WebGL is missing, it is replaced by a one-line note.
 *
 * Effects: the first watches the box and sets `near` once, when it is close
 * to the viewport (`near` starts true where `IntersectionObserver` is
 * missing). The
 * second creates the map when `near` and the zones are known, and its cleanup
 * removes the markers and the map, so changing zones or leaving the page
 * leaves nothing running.
 */
export function ServiceAreaMap({ areas, onUnavailable, loadMap = loadMapLibre }: ServiceAreaMapProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import('maplibre-gl').Map | null>(null)
  // Where the browser cannot tell when the box is near, load at once.
  const [near, setNear] = useState(() => typeof IntersectionObserver === 'undefined')
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')

  useEffect(() => {
    const box = boxRef.current
    if (!box || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true)
          observer.disconnect()
        }
      },
      { rootMargin: '300px' },
    )
    observer.observe(box)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!near || !hostRef.current) return
    const host = hostRef.current
    let cancelled = false
    let loaded = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const markers: { remove: () => unknown }[] = []

    const fail = () => {
      if (cancelled || loaded) return
      cancelled = true
      clearTimeout(timer)
      mapRef.current?.remove()
      mapRef.current = null
      setState('failed')
      onUnavailable?.()
    }

    loadMap()
      .then((library) => {
        if (cancelled) return
        const positions = allPositions(areas)
        const lons = positions.map((p) => p[0])
        const lats = positions.map((p) => p[1])
        const bounds: [[number, number], [number, number]] = [
          [Math.min(...lons), Math.min(...lats)],
          [Math.max(...lons), Math.max(...lats)],
        ]
        const map = new library.Map({
          container: host,
          style: STYLE_URL,
          bounds,
          fitBoundsOptions: { padding: FIT_PADDING, maxZoom: FIT_MAX_ZOOM, animate: false },
          cooperativeGestures: true,
          dragRotate: false,
          pitchWithRotate: false,
        })
        mapRef.current = map
        map.touchZoomRotate.disableRotation()
        timer = setTimeout(fail, LOAD_TIMEOUT_MS)
        // Until the first load, an error means the style or the tiles are not coming.
        map.on('error', () => {
          if (!loaded) fail()
        })
        map.on('load', () => {
          if (cancelled) return
          loaded = true
          clearTimeout(timer)
          const outlined = areas.filter((area) => area.boundary)
          map.addSource('service-areas', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: outlined.map((area) => ({
                type: 'Feature',
                properties: { name: area.name },
                geometry: { type: 'Polygon', coordinates: area.boundary?.coordinates ?? [] },
              })),
            },
          })
          map.addLayer({ id: 'service-areas-fill', type: 'fill', source: 'service-areas', paint: { 'fill-color': '#1570D8', 'fill-opacity': 0.18 } })
          map.addLayer({ id: 'service-areas-line', type: 'line', source: 'service-areas', paint: { 'line-color': '#1570D8', 'line-width': 2 } })
          for (const area of areas) {
            markers.push(new library.Marker({ element: pinElement(area.name) }).setLngLat([area.centre.longitude, area.centre.latitude]).addTo(map))
          }
          setState('ready')
        })
      })
      .catch(fail)

    return () => {
      cancelled = true
      clearTimeout(timer)
      for (const marker of markers) marker.remove()
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [near, areas, loadMap, onUnavailable])

  const zoom = (direction: 1 | -1) => {
    const map = mapRef.current
    if (!map) return
    const options = { animate: !prefersReducedMotion() }
    if (direction === 1) map.zoomIn(options)
    else map.zoomOut(options)
  }

  if (state === 'failed') {
    return (
      <p role="status" className="m-0 rounded-[18px] bg-mk-chip px-5 py-4 text-[15px] text-slate">
        The map could not be loaded. The areas we serve are listed here.
      </p>
    )
  }

  return (
    <div ref={boxRef} className="relative h-[280px] overflow-hidden rounded-[18px] bg-mk-chip sm:h-[360px]">
      <div ref={hostRef} role="region" aria-label="Map of our service areas" className="absolute inset-0" />
      {state === 'loading' && <div aria-hidden="true" className="absolute inset-0 animate-pulse bg-mk-chip" />}
      {state === 'ready' && (
        <div className="absolute top-3 left-3 flex flex-col overflow-hidden rounded-xl border border-solid border-[#DCE8F5] shadow-md">
          <button type="button" aria-label="Zoom in" className={ZOOM_BUTTON} onClick={() => zoom(1)}>
            +
          </button>
          <button type="button" aria-label="Zoom out" className={`${ZOOM_BUTTON} border-t border-solid border-t-[#DCE8F5]`} onClick={() => zoom(-1)}>
            −
          </button>
        </div>
      )}
    </div>
  )
}
