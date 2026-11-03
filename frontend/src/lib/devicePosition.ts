/**
 * The phone's position, asked for only when the customer taps "Use my location"
 * (docs/design/customer-device-location.md, decision 2; maps.md section 8).
 * Nothing in the app calls this on page load, at sign-up or when a screen
 * opens. The position is kept in the browser until the address is saved; it is
 * never logged.
 */

/** Why no position came back, in the words the card uses (design, "Location card"). */
export type PositionFailure = 'denied' | 'unavailable' | 'unsupported'

export type PositionResult =
  | { ok: true; latitude: number; longitude: number; /** Metres, as the phone reports it. */ accuracy: number }
  | { ok: false; reason: PositionFailure }

/** The design waits 15 seconds for a fix before it says the location is unavailable. */
export const POSITION_TIMEOUT_MS = 15_000

/** The two browser values this needs, so tests can pass fakes. */
export interface PositionHost {
  geolocation?: Pick<Geolocation, 'getCurrentPosition'>
  secure: boolean
}

function browserHost(): PositionHost {
  return { geolocation: typeof navigator === 'undefined' ? undefined : navigator.geolocation, secure: typeof window !== 'undefined' && window.isSecureContext }
}

/**
 * Ask the browser for the current position once. The browser shows its own
 * permission prompt on top of the page.
 *
 * @param host - The browser's location API and whether the page is secure; defaults to the real ones.
 * @returns The position with its accuracy, or why there is none: `denied`
 *   (permission refused), `unavailable` (no fix or timed out) or `unsupported`
 *   (no location API, or not a secure page). Never rejects.
 */
export function requestDevicePosition(host: PositionHost = browserHost()): Promise<PositionResult> {
  const { geolocation, secure } = host
  if (!geolocation || !secure) return Promise.resolve({ ok: false, reason: 'unsupported' })
  return new Promise((resolve) => {
    geolocation.getCurrentPosition(
      (position) => resolve({ ok: true, latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy }),
      // 1 is PERMISSION_DENIED; position unavailable (2) and timeout (3) both mean "no fix".
      (error) => resolve({ ok: false, reason: error.code === 1 ? 'denied' : 'unavailable' }),
      { enableHighAccuracy: true, timeout: POSITION_TIMEOUT_MS, maximumAge: 0 },
    )
  })
}
