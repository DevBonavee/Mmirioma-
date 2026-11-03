import { describe, expect, it, vi } from 'vitest'
import zonesSample from '../../../../docs/api/examples/service-zones.json'
import { createApiClient } from './client'
import { listServiceAreas, parseServiceAreas } from './serviceAreas'

function clientAnswering(body: unknown, status = 200) {
  const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
  return { fetchMock, client: createApiClient({ baseUrl: 'http://api.test', fetch: fetchMock }) }
}

describe('listServiceAreas (docs/api/admin-directory.md, #346)', () => {
  it('reads the contract example: a zone without a boundary and one with', async () => {
    const { fetchMock, client } = clientAnswering(zonesSample)
    const areas = await listServiceAreas(undefined, client)
    expect(new URL(String(fetchMock.mock.calls[0][0])).pathname).toBe('/api/v1/service-zones')
    expect(areas.map((a) => a.name)).toEqual(['Independence Layout', 'Ogui Road'])
    expect(areas[0].boundary).toBeNull()
    expect(areas[0].centre).toEqual({ latitude: 6.4447, longitude: 7.5108 })
    expect(areas[1].boundary?.coordinates[0]).toHaveLength(5)
  })

  it('accepts an empty list: no zone is active', () => {
    expect(parseServiceAreas({ items: [] })).toEqual([])
  })

  it.each([
    ['a missing centre', { items: [{ id: 'z', name: 'A', boundary: null }] }],
    ['a centre out of range', { items: [{ id: 'z', name: 'A', centre: { latitude: 91, longitude: 7 }, boundary: null }] }],
    ['a boundary that is not a polygon', { items: [{ id: 'z', name: 'A', centre: { latitude: 6, longitude: 7 }, boundary: { type: 'Point', coordinates: [] } }] }],
    ['a missing boundary field', { items: [{ id: 'z', name: 'A', centre: { latitude: 6, longitude: 7 } }] }],
    ['no items', {}],
  ])('reports %s as invalid_response, never as a map', async (_name, body) => {
    const { client } = clientAnswering(body)
    await expect(listServiceAreas(undefined, client)).rejects.toMatchObject({ code: 'invalid_response' })
  })

  it('passes a server error through', async () => {
    const { client } = clientAnswering({ error: { code: 'service_unavailable', message: 'No', details: null } }, 503)
    await expect(listServiceAreas(undefined, client)).rejects.toMatchObject({ status: 503, code: 'service_unavailable' })
  })
})
