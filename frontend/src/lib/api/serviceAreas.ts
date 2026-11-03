/**
 * The active service areas with their position, for the landing page's map
 * (`GET /service-zones`, docs/api/admin-directory.md, "Amendment #346",
 * agreed 2026-11-03). Needs no session.
 *
 * The response is checked at runtime with Zod: a value the contract does not
 * allow is reported as `ApiError` `invalid_response`, so the page shows its
 * error state instead of a wrong map. `centre` is always present; `boundary`
 * is `null` when the administrator set none, and the map then draws a pin.
 *
 * If the contract changes, update this schema in the same PR.
 */

import { z } from 'zod'
import { apiClient, ApiError, type ApiClient } from './client'

const positionSchema = z.tuple([z.number(), z.number()]).rest(z.number())

/** One service area as the public list returns it. No fees (customers see the total only). */
export const serviceAreaSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** WGS 84 decimal degrees. */
  centre: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }),
  /** A GeoJSON `Polygon`: one ring of `[longitude, latitude]` positions, or `null`. */
  boundary: z.object({ type: z.literal('Polygon'), coordinates: z.array(z.array(positionSchema)) }).nullable(),
})
export type ServiceArea = z.infer<typeof serviceAreaSchema>

const serviceAreaListSchema = z.object({ items: z.array(serviceAreaSchema) })

/**
 * Check a value against the contract.
 *
 * @throws {ApiError} `invalid_response` if it does not match.
 */
export function parseServiceAreas(value: unknown): ServiceArea[] {
  const result = serviceAreaListSchema.safeParse(value)
  if (!result.success) {
    throw new ApiError({
      kind: 'parse',
      status: 200,
      code: 'invalid_response',
      message: 'The server returned an unexpected response.',
      cause: result.error,
    })
  }
  return result.data.items
}

/**
 * Active service areas, by name (`GET /service-zones`).
 *
 * @param signal - Aborts the request.
 * @param client - The API client; tests pass one with a fake `fetch`.
 * @throws {ApiError} `invalid_response`; `network_error`.
 */
export async function listServiceAreas(signal?: AbortSignal, client: ApiClient = apiClient): Promise<ServiceArea[]> {
  return parseServiceAreas(await client.request<unknown>('/api/v1/service-zones', { signal }))
}
