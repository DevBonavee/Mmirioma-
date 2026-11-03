/**
 * Small helpers the address screens share for the map pin (#345): where the
 * map starts, and how a refused pin is told apart from other 422s.
 */
import { ApiError } from '../../../lib/api/client'
import type { AreaChoice } from '../order/livePrice'
import { useServiceZones } from '../queries'
import type { LatLng } from './PinMap'

/** L3's wording for a pin the server refused (docs/design/customer-device-location.md). */
export const REFUSED_PIN_MESSAGE = "We can't use that pin: it's outside the area we deliver to. Move it, or remove the pin and save without it."

/** L3's wording for an area that is no longer listed (404 `service_zone_not_found`). */
export const AREA_GONE_MESSAGE = 'That area is no longer listed. Choose your area again.'

/**
 * Where the pin map starts without the phone's position (design, open question
 * 2, decided in review): the centre of the area the customer chose, else all
 * the listed areas' centres together. Both come from the list the area picker
 * already loads, so no configuration value is needed.
 *
 * @param area - The area chosen on this screen, if any.
 * @returns The chosen area's centre (`null` when none or unknown) and every listed centre.
 */
export function useMapStart(area: AreaChoice): { areaCentre: LatLng | null; allCentres: LatLng[] } {
  const zones = useServiceZones().data ?? []
  const allCentres = zones.flatMap((z) => (z.centre ? [z.centre] : []))
  const chosen = area && area !== 'not_listed' ? zones.find((z) => z.id === area.id) : undefined
  return { areaCentre: chosen?.centre ?? null, allCentres }
}

/**
 * Whether a 422 `validation_error` names the pin (`loc` ends in `location` on
 * addresses, `delivery_location` on orders; docs/api/delivery-location.md), so
 * the screen shows L3's pin message and not a generic one.
 */
export function isRefusedPin(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.code !== 'validation_error' || !Array.isArray(error.details)) return false
  return (error.details as { loc?: unknown[] }[]).some((d) => {
    const field = d.loc?.at(-1)
    return field === 'location' || field === 'delivery_location'
  })
}

/** Whether the error is 404 `service_zone_not_found`: the picked area was removed meanwhile. */
export function isAreaGone(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'service_zone_not_found'
}
