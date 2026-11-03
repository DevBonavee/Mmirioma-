/** Query hooks for the public website: the support contact, the service areas and the contact form. */
import { useMutation, useQuery } from '@tanstack/react-query'
import type { PublicContact } from '../../domain/publicSite'
import { DEFAULT_SUPPORT_PHONE, DEFAULT_WHATSAPP } from '../../lib/whatsapp'
import { getPublicContact, getServiceAreas, sendContactMessage } from './publicApi'

export const publicKeys = { contact: ['public', 'contact'] as const, serviceAreas: ['public', 'service-areas'] as const }

/** Used while loading or when the server cannot be reached, so help is always reachable. */
const FALLBACK: PublicContact = { phone: DEFAULT_SUPPORT_PHONE, whatsapp: DEFAULT_WHATSAPP }

/**
 * The support contact from the backend (FR-055). `whatsapp` is `null` when
 * WhatsApp support is switched off: screens then hide their WhatsApp buttons
 * and show the phone instead (docs/api/public-site.md).
 */
export function useSupportContact(): PublicContact {
  const contact = useQuery({ queryKey: publicKeys.contact, queryFn: getPublicContact, staleTime: 5 * 60_000, retry: false })
  return contact.data ?? FALLBACK
}

/** The WhatsApp number to chat with (E.164), or `null` while WhatsApp support is off. */
export function useWhatsappNumber(): string | null {
  return useSupportContact().whatsapp
}

/**
 * The active service areas with their position (`GET /service-zones`, #346).
 * Not retried: a failure shows the page's "Try again" at once. The server
 * caches the list for a minute, so the same here (a zone just switched off
 * should not stay on the map for long).
 */
export function useServiceAreas() {
  return useQuery({ queryKey: publicKeys.serviceAreas, queryFn: getServiceAreas, staleTime: 60_000, retry: false })
}

/**
 * Send a message from the Contact page (`POST /public/contact`, #344). Never
 * retried (the contract has no idempotency key, so a retry could store it
 * twice). `gcTime: 0` drops the finished mutation, whose `variables` hold the
 * visitor's name, phone and message, from the cache as soon as the form lets
 * go of it (NFR-003).
 */
export function useSendContactMessage() {
  return useMutation({ mutationFn: sendContactMessage, retry: false, gcTime: 0 })
}
