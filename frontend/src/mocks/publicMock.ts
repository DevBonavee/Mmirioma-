/**
 * Mock of the public website endpoints (docs/api/public-site.md).
 * No sign-in needed: anyone on the website can call them.
 */
import type { PublicContact } from '../domain/publicSite'
import type { ContactMessageInput, ContactMessageReceipt } from '../lib/api/publicSite'
import type { ServiceArea } from '../lib/api/serviceAreas'
import { normalizeNigerianPhone } from '../lib/format/phone'
import { DEFAULT_SUPPORT_PHONE } from '../lib/whatsapp'
import { delay, mockError, newSupportReference } from './store'

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

/** The backend's per-phone limit on stored website messages (public-site.md, "Rate limits"). */
const MESSAGES_PER_PHONE = 3
const WINDOW_MS = 60 * 60 * 1000
const TOPICS = new Set(['late', 'wrong_quantity', 'payment', 'rider', 'other'])

/**
 * When each phone's recent messages arrived, in this tab's memory only. The
 * mock never stores the name, phone or message in localStorage (NFR-003), so
 * the limit resets on reload, as the backend's does on restart.
 */
const sentAt = new Map<string, number[]>()

function invalid(field: string, msg: string): never {
  throw mockError(422, 'validation_error', 'Request validation failed', [{ loc: ['body', field], msg, type: 'value_error' }])
}

/**
 * `POST /public/contact` (#339): the contract's rules, so every state of the
 * Contact page can be seen in mock mode. A filled honeypot gets a made-up
 * reference and nothing is kept; a fourth message from one phone within an
 * hour gets 429 `too_many_attempts`. The per-IP limit is not mocked.
 */
export async function sendContactMessage(input: ContactMessageInput): Promise<ContactMessageReceipt> {
  await delay(null)
  const name = input.name.trim()
  const message = input.message.trim()
  const phone = normalizeNigerianPhone(input.phone)
  if (name.length < 1 || name.length > 100) invalid('name', 'String should have 1 to 100 characters')
  if (!phone) invalid('phone', 'Enter a Nigerian mobile number')
  if (message.length < 3 || message.length > 1000) invalid('message', 'String should have 3 to 1000 characters')
  if (input.topic !== undefined && !TOPICS.has(input.topic)) invalid('topic', 'Input should be a support type')

  const receipt = () => ({ reference: newSupportReference(), created_at: new Date().toISOString() })
  if (input.website !== '') return receipt()

  const now = Date.now()
  const recent = (sentAt.get(phone) ?? []).filter((t) => now - t < WINDOW_MS)
  if (recent.length >= MESSAGES_PER_PHONE) {
    const wait = Math.ceil((recent[0] + WINDOW_MS - now) / 1000)
    throw mockError(429, 'too_many_attempts', 'Too many attempts. Please wait and try again.', { retry_after_seconds: wait })
  }
  sentAt.set(phone, [...recent, now])
  return receipt()
}

/** Forget the per-phone counts (tests). */
export function resetContactMessages(): void {
  sentAt.clear()
}
