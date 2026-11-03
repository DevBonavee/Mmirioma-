import { describe, expect, it, vi } from 'vitest'
import { POSITION_TIMEOUT_MS, requestDevicePosition } from './devicePosition'

type Success = (position: GeolocationPosition) => void
type Failure = (error: GeolocationPositionError) => void

function geolocationAnswering(answer: (ok: Success, fail: Failure) => void) {
  return { getCurrentPosition: vi.fn<Geolocation['getCurrentPosition']>((ok, fail) => answer(ok, fail as Failure)) }
}

describe('requestDevicePosition', () => {
  it('returns the position with the accuracy the phone reports', async () => {
    const geolocation = geolocationAnswering((ok) =>
      ok({ coords: { latitude: 6.452713, longitude: 7.510348, accuracy: 18 } } as unknown as GeolocationPosition),
    )
    await expect(requestDevicePosition({ geolocation, secure: true })).resolves.toEqual({ ok: true, latitude: 6.452713, longitude: 7.510348, accuracy: 18 })
  })

  it('asks for a high-accuracy fix once, waiting 15 seconds at most and never reusing an old one', async () => {
    const geolocation = geolocationAnswering((ok) => ok({ coords: { latitude: 1, longitude: 2, accuracy: 5 } } as unknown as GeolocationPosition))
    await requestDevicePosition({ geolocation, secure: true })
    expect(geolocation.getCurrentPosition).toHaveBeenCalledTimes(1)
    expect(geolocation.getCurrentPosition.mock.calls[0][2]).toEqual({ enableHighAccuracy: true, timeout: POSITION_TIMEOUT_MS, maximumAge: 0 })
    expect(POSITION_TIMEOUT_MS).toBe(15_000)
  })

  it('says denied when the customer refuses the permission', async () => {
    const geolocation = geolocationAnswering((_ok, fail) => fail({ code: 1 } as GeolocationPositionError))
    await expect(requestDevicePosition({ geolocation, secure: true })).resolves.toEqual({ ok: false, reason: 'denied' })
  })

  it.each([
    ['position unavailable', 2],
    ['timed out', 3],
  ])('says unavailable when the fix is %s', async (_name, code) => {
    const geolocation = geolocationAnswering((_ok, fail) => fail({ code } as GeolocationPositionError))
    await expect(requestDevicePosition({ geolocation, secure: true })).resolves.toEqual({ ok: false, reason: 'unavailable' })
  })

  it('says unsupported, without asking, when the browser has no location or the page is not secure', async () => {
    const geolocation = geolocationAnswering(() => undefined)
    await expect(requestDevicePosition({ geolocation: undefined, secure: true })).resolves.toEqual({ ok: false, reason: 'unsupported' })
    await expect(requestDevicePosition({ geolocation, secure: false })).resolves.toEqual({ ok: false, reason: 'unsupported' })
    expect(geolocation.getCurrentPosition).not.toHaveBeenCalled()
  })
})
