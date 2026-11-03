/**
 * Mock of the public website endpoint (docs/api/public-site.md).
 * No sign-in needed: anyone on the website can call it.
 */
import type { PublicContact } from '../domain/publicSite'
import type { ServiceArea } from '../lib/api/serviceAreas'
import { DEFAULT_SUPPORT_PHONE } from '../lib/whatsapp'
import { delay } from './store'

/** The support contact, as the backend's settings give it (WhatsApp on, #8). */
export async function getPublicContact(): Promise<PublicContact> {
  await delay(null, 120)
  return { phone: DEFAULT_SUPPORT_PHONE, whatsapp: DEFAULT_SUPPORT_PHONE }
}

/**
 * SAMPLE DATA: three made-up areas near Enugu, for mock mode only. The real
 * list is whatever the administrator has switched on; the first has an
 * outline and the others are pins, so both are seen in the demo.
 */
export async function getServiceAreas(): Promise<ServiceArea[]> {
  await delay(null, 120)
  return [
    {
      id: 'sample-zone-1',
      name: 'Sample Zone Independence Layout',
      centre: { latitude: 6.4447, longitude: 7.5108 },
      boundary: { type: 'Polygon', coordinates: [[[7.5, 6.44], [7.52, 6.44], [7.52, 6.46], [7.5, 6.46], [7.5, 6.44]]] },
    },
    { id: 'sample-zone-2', name: 'Sample Zone Ogui Road', centre: { latitude: 6.4561, longitude: 7.5205 }, boundary: null },
    { id: 'sample-zone-3', name: 'Sample Zone New Haven', centre: { latitude: 6.4343, longitude: 7.4965 }, boundary: null },
  ]
}
