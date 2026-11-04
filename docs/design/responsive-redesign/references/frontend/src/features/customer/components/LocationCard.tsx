import { useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { CARD } from '../../../components/ui/Card'
import type { DeliveryLocation } from '../../../domain/orders'
import { cx } from '../../../lib/cx'
import { requestDevicePosition, type PositionFailure, type PositionResult } from '../../../lib/devicePosition'
import type { MapLibre } from '../../marketing/loadMapLibre'
import { PinMap, type LatLng } from './PinMap'

type Mode = 'explain' | 'finding' | PositionFailure | 'map'

/** Whether the browser says it is online; re-read when it goes online or offline. */
function useOnline(): boolean {
  return useSyncExternalStore(
    (notify) => {
      window.addEventListener('online', notify)
      window.addEventListener('offline', notify)
      return () => {
        window.removeEventListener('online', notify)
        window.removeEventListener('offline', notify)
      }
    },
    () => navigator.onLine,
    () => true,
  )
}

/** The contract stores 6 decimal places (about 0.1 m); send no more. */
const round6 = (degrees: number) => Math.round(degrees * 1e6) / 1e6

/** The phone's accuracy as the card shows it: rounded to 10 m, never 0. */
const roundedMetres = (accuracy: number) => Math.max(10, Math.round(accuracy / 10) * 10)

/** A phone fix this much worse than a house plot is "rough" (design, "Found"). */
const ROUGH_ACCURACY_M = 100

interface LocationCardProps {
  /** The pin as it stands: `null` before the customer has one. */
  value: DeliveryLocation | null
  /** Called with a new pin, or `null` when the customer removes it. */
  onChange: (value: DeliveryLocation | null) => void
  /** Where the chosen area is, so "Place the pin myself" starts there (design, open question 2). */
  areaCentre: LatLng | null
  /** The listed areas' centres, shown together until an area is chosen. */
  allCentres: LatLng[]
  /** Asks the phone for its position. Tests pass a fake; the default uses the browser's location. */
  getPosition?: () => Promise<PositionResult>
  /** Loads the map library. Tests pass a fake. */
  loadMap?: () => Promise<MapLibre>
}

/**
 * The location card of the address screens (L1 in
 * docs/design/customer-device-location.md): an optional pin for a delivery
 * address, from the phone's location or placed by hand. Typing the address
 * stays the whole flow for anyone who says no, so every state here leaves the
 * fields beside it usable.
 *
 * - **Nothing is asked until the tap.** The explanation shows first; the
 *   phone's location is requested only when the customer taps "Use my
 *   location" (maps.md section 8), never on page load, at sign-up or when the
 *   screen opens.
 * - **The source follows what the customer did.** The phone's position, not
 *   moved, is `device_location`; once the customer moves the map under the
 *   pin it is `map_pin`. "Place the pin myself" saves no point until the map
 *   is moved, so the area's centre is never saved as if it were a gate.
 * - **A pin is never checked here.** Whether MmiriOma delivers there stays the
 *   area the customer picks (design, open question 1).
 * - **Personal data.** The position stays in this component and the form until
 *   the address is saved; nothing is logged or written to browser storage here.
 */
export function LocationCard({ value, onChange, areaCentre, allCentres, getPosition = requestDevicePosition, loadMap }: LocationCardProps) {
  const titleId = useId()
  const online = useOnline()
  const [mode, setMode] = useState<Mode>(value ? 'map' : 'explain')
  // The phone's own figure for the last fix, kept until the customer moves the map.
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [moved, setMoved] = useState(false)
  // Which "Use my location" tap is current, so a cancelled one is ignored when it answers.
  const tap = useRef(0)

  function useMyLocation() {
    const mine = ++tap.current
    setMode('finding')
    void getPosition().then((result) => {
      if (mine !== tap.current) return
      if (!result.ok) {
        setMode(result.reason)
        return
      }
      setAccuracy(result.accuracy)
      setMoved(false)
      onChange({ latitude: round6(result.latitude), longitude: round6(result.longitude), source: 'device_location' })
      setMode('map')
    })
  }

  function cancel() {
    tap.current++
    setMode('explain')
  }

  function removePin() {
    tap.current++
    setAccuracy(null)
    setMoved(false)
    onChange(null)
    setMode('explain')
  }

  const canPlaceByHand = areaCentre !== null || allCentres.length > 0
  const placeByHand = (
    <Button variant="alt" onClick={() => setMode('map')} disabled={!canPlaceByHand} aria-describedby={canPlaceByHand ? undefined : `${titleId}-area`}>
      Place the pin myself
    </Button>
  )
  const areaHint = !canPlaceByHand && (
    <span id={`${titleId}-area`} className="text-caption text-mute">
      Choose your area below, then you can place a pin.
    </span>
  )

  let body: ReactNode
  if (!online && mode !== 'map') {
    body = (
      <>
        <Heading id={titleId}>You're offline</Heading>
        <p className="m-0 text-[13.5px] leading-[1.45] text-slate">Type your address below. You can add a pin when you're back online.</p>
      </>
    )
  } else if (mode === 'explain') {
    body = (
      <>
        <Heading id={titleId}>Add a pin at your gate</Heading>
        <p className="m-0 text-[13.5px] leading-[1.45] text-slate">
          A pin helps the rider find you. We ask for your phone's location only when you tap the button, and you can type your address instead. We keep the pin
          with this address and never use it to track you.
        </p>
        <div className="flex flex-col gap-2">
          <Button onClick={useMyLocation}>Use my location</Button>
          {placeByHand}
          {areaHint}
        </div>
        <PrivacyLink />
      </>
    )
  } else if (mode === 'finding') {
    body = (
      <>
        <Heading id={titleId}>Finding your location…</Heading>
        <p role="status" className="m-0 text-[13.5px] leading-[1.45] text-slate">
          Your phone may ask you to allow it. You don't need to: you can type your address instead.
        </p>
        <Button variant="alt" onClick={cancel}>
          Cancel
        </Button>
      </>
    )
  } else if (mode === 'denied') {
    body = (
      <>
        <Heading id={titleId}>Location is off for MmiriOma</Heading>
        <p className="m-0 text-[13.5px] leading-[1.45] text-slate">
          You can turn it on in your browser's site settings. You don't need it: type your address below, or place the pin yourself.
        </p>
        {placeByHand}
        {areaHint}
      </>
    )
  } else if (mode === 'unavailable') {
    body = (
      <>
        <Heading id={titleId}>We couldn't find your location</Heading>
        <p className="m-0 text-[13.5px] leading-[1.45] text-slate">Try again in the open, or type your address below.</p>
        <div className="flex flex-col gap-2">
          <Button onClick={useMyLocation}>Try again</Button>
          {placeByHand}
          {areaHint}
        </div>
      </>
    )
  } else if (mode === 'unsupported') {
    body = (
      <>
        <Heading id={titleId}>This browser can't share your location</Heading>
        <p className="m-0 text-[13.5px] leading-[1.45] text-slate">Type your address below, or place the pin yourself.</p>
        {placeByHand}
        {areaHint}
      </>
    )
  } else {
    let line: string
    if (moved) line = 'Pin moved. It sits on the spot in the centre of the map.'
    else if (accuracy !== null && accuracy > ROUGH_ACCURACY_M)
      line = `Your phone's location is rough (about ${roundedMetres(accuracy)} m). Move the map so the pin sits on your gate.`
    else if (accuracy !== null) line = `Pin placed from your phone's location, accurate to about ${roundedMetres(accuracy)} m. Move the map so the pin sits on your gate.`
    else if (value) line = 'A pin is saved with this address. Move the map to change it.'
    else line = 'Move the map so the pin sits on your gate.'
    body = (
      <>
        <Heading id={titleId}>Your pin</Heading>
        <p role="status" className="m-0 text-[13.5px] leading-[1.45] text-slate">
          {line}
        </p>
        <PinMap
          target={value ?? areaCentre}
          fit={allCentres}
          loadMap={loadMap}
          onMoved={(centre) => {
            setMoved(true)
            setAccuracy(null)
            onChange({ latitude: round6(centre.latitude), longitude: round6(centre.longitude), source: 'map_pin' })
          }}
        />
        <Button variant="alt" onClick={removePin}>
          Remove pin
        </Button>
      </>
    )
  }

  return (
    <section aria-labelledby={titleId} className={cx(CARD, 'flex flex-col gap-2.5 p-3.5')}>
      {body}
    </section>
  )
}

function Heading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="m-0 text-[15px] font-extrabold">
      {children}
    </p>
  )
}

function PrivacyLink() {
  return (
    <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="hit-44 inline-flex items-center text-caption font-bold text-primary">
      Privacy notice
    </Link>
  )
}
