import { useEffect, useRef, useState } from 'react'
import { MapPin } from '../../../components/art/Art'
import { Button } from '../../../components/ui/Button'
import { loadMapLibre, MAP_STYLE_URL, type MapLibre } from '../../marketing/loadMapLibre'

/** A point on the map, in WGS 84 degrees. */
export interface LatLng {
  latitude: number
  longitude: number
}

/** The map is given up on after this long without loading (style or tiles never arrived). */
const LOAD_TIMEOUT_MS = 10_000
/** Zoom of a placed pin: a street, close enough to put the pin on a gate. */
const PIN_ZOOM = 16
/** Margin around the points when the map fits several, in pixels; and the closest it zooms in. */
const FIT_PADDING = 40
const FIT_MAX_ZOOM = 13
/** Two centres closer than this (degrees, about 10 cm) are the same place. */
const SAME_PLACE = 1e-6

const ZOOM_BUTTON =
  'flex size-12 cursor-pointer items-center justify-center border-0 bg-white text-[24px] leading-none font-bold text-ink hover:bg-gray-bg focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary'

interface PinMapProps {
  /**
   * The place to show. Without one the map fits `fit` instead. When it changes
   * to a place the map is not already centred on (a phone fix, another area),
   * the map jumps there; a place the customer just moved the map to is the
   * centre already, so nothing moves under their thumb.
   */
  target: LatLng | null
  /** Points to fit while there is no `target`: the listed areas' centres (design, open question 2). */
  fit?: LatLng[]
  /** A saved pin shown as it is: the map cannot be moved and has no zoom buttons. */
  readOnly?: boolean
  /** Called when the customer moves the map (touch, mouse or keyboard) with the new centre, under the fixed pin. */
  onMoved?: (centre: LatLng) => void
  /** Loads the map library. Tests pass a fake; the default imports MapLibre. */
  loadMap?: () => Promise<MapLibre>
}

/**
 * The map frame of the address pin (L2 in docs/design/customer-device-location.md):
 * a live map with the pin fixed in the centre. The customer moves the map under
 * the pin, which suits one thumb and the keyboard (arrow keys move, `+` and `-`
 * zoom). The library's attribution stays visible.
 *
 * The map is an enhancement and never the only way to give an address: while
 * it loads the frame says so, and if the library, the style or the tiles do not
 * arrive in time it says the typed address is enough and offers "Try again".
 *
 * Effects: the first creates the map (and removes it on cleanup, so leaving the
 * screen leaves nothing running); the second moves an existing map when
 * `target` changes. Props are read through refs so a new `onMoved` function
 * never rebuilds the map.
 */
export function PinMap({ target, fit = [], readOnly = false, onMoved, loadMap = loadMapLibre }: PinMapProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import('maplibre-gl').Map | null>(null)
  const loadedRef = useRef(false)
  const targetRef = useRef(target)
  const fitRef = useRef(fit)
  const onMovedRef = useRef(onMoved)
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [attempt, setAttempt] = useState(0)

  // Keep the latest props for the map's event handlers, without rebuilding the map.
  useEffect(() => {
    targetRef.current = target
    fitRef.current = fit
    onMovedRef.current = onMoved
  })

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const fail = () => {
      if (cancelled || loadedRef.current) return
      cancelled = true
      clearTimeout(timer)
      mapRef.current?.remove()
      mapRef.current = null
      setState('failed')
    }

    loadMap()
      .then((library) => {
        if (cancelled) return
        const start = targetRef.current
        const points = fitRef.current
        const view: import('maplibre-gl').MapOptions = start
          ? { container: host, style: MAP_STYLE_URL, center: [start.longitude, start.latitude], zoom: PIN_ZOOM }
          : points.length > 0
            ? {
                container: host,
                style: MAP_STYLE_URL,
                bounds: [
                  [Math.min(...points.map((p) => p.longitude)), Math.min(...points.map((p) => p.latitude))],
                  [Math.max(...points.map((p) => p.longitude)), Math.max(...points.map((p) => p.latitude))],
                ],
                fitBoundsOptions: { padding: FIT_PADDING, maxZoom: FIT_MAX_ZOOM, animate: false },
              }
            : { container: host, style: MAP_STYLE_URL }
        const map = new library.Map({ ...view, interactive: !readOnly, dragRotate: false, pitchWithRotate: false })
        mapRef.current = map
        map.touchZoomRotate?.disableRotation()
        timer = setTimeout(fail, LOAD_TIMEOUT_MS)
        // Until the first load, an error means the style or the tiles are not coming.
        map.on('error', () => {
          if (!loadedRef.current) fail()
        })
        map.on('load', () => {
          if (cancelled) return
          loadedRef.current = true
          clearTimeout(timer)
          setState('ready')
        })
        // `originalEvent` is set only when the customer moved the map, not when the code did.
        map.on('moveend', (event) => {
          if (!event.originalEvent) return
          const centre = map.getCenter()
          onMovedRef.current?.({ latitude: centre.lat, longitude: centre.lng })
        })
      })
      .catch(fail)

    return () => {
      cancelled = true
      loadedRef.current = false
      clearTimeout(timer)
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [attempt, loadMap, readOnly])

  const latitude = target?.latitude
  const longitude = target?.longitude
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loadedRef.current || latitude === undefined || longitude === undefined) return
    const centre = map.getCenter()
    if (Math.abs(centre.lat - latitude) < SAME_PLACE && Math.abs(centre.lng - longitude) < SAME_PLACE) return
    map.jumpTo({ center: [longitude, latitude], zoom: Math.max(map.getZoom(), PIN_ZOOM) })
  }, [latitude, longitude, state])

  const zoom = (direction: 1 | -1) => {
    const map = mapRef.current
    if (!map) return
    if (direction === 1) map.zoomIn({ animate: false })
    else map.zoomOut({ animate: false })
  }

  if (state === 'failed') {
    return (
      <div role="status" className="flex flex-col items-start gap-2.5 rounded-stat bg-sky p-3.5 text-[13.5px] leading-[1.45] text-primary-dark">
        <span>
          <b>The map isn't loading.</b> Your typed address is enough; we'll use your area's delivery rate.
        </span>
        <Button
          variant="alt"
          size="sm"
          block={false}
          onClick={() => {
            setState('loading')
            setAttempt((n) => n + 1)
          }}
        >
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div className="relative h-[220px] overflow-hidden rounded-stat bg-map">
      <div
        ref={hostRef}
        role="region"
        aria-label={readOnly ? 'Map showing the pin saved with this address.' : 'Map. Move the map to put the pin on your gate.'}
        className="absolute inset-0"
      />
      {state === 'loading' && (
        <div role="status" className="absolute inset-0 flex items-center justify-center bg-map text-caption font-bold text-mute">
          Loading map…
        </div>
      )}
      {state === 'ready' && (
        <>
          <MapPin
            color="#1570D8"
            ringColor="rgba(21,112,216,.35)"
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[88%]"
          />
          {!readOnly && (
            <div className="absolute top-2.5 left-2.5 flex flex-col overflow-hidden rounded-xl border border-solid border-line shadow-control">
              <button type="button" aria-label="Zoom in" className={ZOOM_BUTTON} onClick={() => zoom(1)}>
                +
              </button>
              <button type="button" aria-label="Zoom out" className={`${ZOOM_BUTTON} border-t border-solid border-t-line`} onClick={() => zoom(-1)}>
                −
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
