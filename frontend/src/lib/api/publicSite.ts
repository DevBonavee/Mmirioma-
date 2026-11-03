/**
 * Public website endpoints (docs/api/public-site.md): the support contact
 * (agreed in #8, built in #56) and the contact form (agreed and built in
 * #339). No session and no CSRF token: the website calls them before anyone
 * signs in.
 */
import type { ProblemType } from '../../domain/orders'
import type { PublicContact } from '../../domain/publicSite'
import { apiClient, type ApiClient } from './client'

/**
 * The support phone and, when WhatsApp support is on, its WhatsApp number
 * (`GET /api/v1/public/contact`, FR-055).
 *
 * @throws {ApiError} `too_many_attempts` (429) or a network error.
 */
export function getPublicContact(client: ApiClient = apiClient): Promise<PublicContact> {
  return client.request<PublicContact>('/api/v1/public/contact')
}

/** A website visitor's message (`POST /public/contact` request body). */
export interface ContactMessageInput {
  /** 1 to 100 characters after trimming. */
  name: string
  /** A Nigerian mobile number in any accepted form; the server normalizes it to E.164. */
  phone: string
  /** 3 to 1000 characters after trimming. */
  message: string
  /** One of the in-app support types. Left out, the server stores `other`. */
  topic?: ProblemType
  /**
   * The honeypot: a field people never see. Sent as typed (an empty string
   * for a person); any text makes the server answer 201 and store nothing.
   */
  website: string
}

/** The `201` answer: the reference the visitor quotes when they call. */
export interface ContactMessageReceipt {
  /** `SR-` and 8 characters, e.g. `SR-6H2P8W3D`. */
  reference: string
  /** When the message arrived, ISO 8601 UTC. */
  created_at: string
}

/**
 * Send a website visitor's message to the team (`POST /api/v1/public/contact`,
 * #339). It is stored as a support request and answered by phone; the answer
 * promises no reply time.
 *
 * @throws {ApiError} `validation_error` (422, `details` name the field, never
 *   the value), `too_many_attempts` (429, `details.retry_after_seconds`),
 *   `service_unavailable` (503) or a network error.
 */
export function sendContactMessage(input: ContactMessageInput, client: ApiClient = apiClient): Promise<ContactMessageReceipt> {
  return client.request<ContactMessageReceipt>('/api/v1/public/contact', { method: 'POST', body: input })
}
