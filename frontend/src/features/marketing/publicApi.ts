/**
 * The public website's server calls (docs/api/public-site.md). Mock mode uses
 * `src/mocks/publicMock.ts`; real-API mode calls the client in
 * `src/lib/api/publicSite.ts` and `serviceAreas.ts`.
 *
 * The mock is imported on first use, not at the top: the public pages are in
 * the main bundle, and the mock database should not make it bigger.
 */
import type { PublicContact } from '../../domain/publicSite'
import { USE_MOCKS } from '../../lib/api/mode'
import * as real from '../../lib/api/publicSite'
import type { ContactMessageInput, ContactMessageReceipt } from '../../lib/api/publicSite'
import { listServiceAreas, type ServiceArea } from '../../lib/api/serviceAreas'

const loadMock = () => import('../../mocks/publicMock')

/** The support contact (`GET /api/v1/public/contact`, FR-055). */
export function getPublicContact(): Promise<PublicContact> {
  return USE_MOCKS ? loadMock().then((m) => m.getPublicContact()) : real.getPublicContact()
}

/** A visitor's message from the Contact page (`POST /api/v1/public/contact`, #339). */
export function sendContactMessage(input: ContactMessageInput): Promise<ContactMessageReceipt> {
  return USE_MOCKS ? loadMock().then((m) => m.sendContactMessage(input)) : real.sendContactMessage(input)
}

/** The active service areas with their position (`GET /api/v1/service-zones`, #346). */
export function getServiceAreas(): Promise<ServiceArea[]> {
  return USE_MOCKS ? loadMock().then((m) => m.getServiceAreas()) : listServiceAreas()
}
