import { describe, expect, it, vi } from 'vitest'
import { ApiError, createApiClient } from './client'
import { getPublicContact, sendContactMessage, type ContactMessageInput } from './publicSite'
import contactExample from '../../../../docs/api/examples/public-contact.json'
import messageExample from '../../../../docs/api/examples/public-contact-request.json'
import receiptExample from '../../../../docs/api/examples/public-contact-receipt.json'

function clientReturning(body: unknown, status = 200) {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
  return { fetch, client: createApiClient({ baseUrl: 'http://api.test', fetch }) }
}

describe('GET /public/contact (#57)', () => {
  it('returns the contract example as it is', async () => {
    const { fetch, client } = clientReturning(contactExample)
    await expect(getPublicContact(client)).resolves.toEqual({ phone: '+2348133774902', whatsapp: '+2348133774902' })
    expect(fetch.mock.calls[0][0]).toBe('http://api.test/api/v1/public/contact')
  })

  it('keeps whatsapp null when WhatsApp support is off', async () => {
    const { client } = clientReturning({ phone: '+2348133774902', whatsapp: null })
    expect((await getPublicContact(client)).whatsapp).toBeNull()
  })

  it('passes 429 too_many_attempts through', async () => {
    const { client } = clientReturning({ error: { code: 'too_many_attempts', message: 'Too many attempts', details: { retry_after_seconds: 60 } } }, 429)
    await expect(getPublicContact(client)).rejects.toMatchObject({ status: 429, code: 'too_many_attempts' } satisfies Partial<ApiError>)
  })
})

describe('POST /public/contact (#339, #344)', () => {
  const input = messageExample as ContactMessageInput

  it('posts the contract example and returns the receipt as it is', async () => {
    const { fetch, client } = clientReturning(receiptExample, 201)
    await expect(sendContactMessage(input, client)).resolves.toEqual({ reference: 'SR-6H2P8W3D', created_at: '2026-11-02T10:15:00Z' })
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('http://api.test/api/v1/public/contact')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual(messageExample)
  })

  it('sends no topic when none was chosen, so the server stores "other"', async () => {
    const { fetch, client } = clientReturning(receiptExample, 201)
    await sendContactMessage({ name: 'Sample Visitor', phone: '08000000001', message: 'Hello there', website: '' }, client)
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).not.toHaveProperty('topic')
  })

  it.each([
    [422, 'validation_error', [{ loc: ['body', 'phone'], msg: 'Value error', type: 'value_error' }]],
    [429, 'too_many_attempts', { retry_after_seconds: 1200 }],
    [503, 'service_unavailable', null],
  ])('passes %i %s through with its details', async (status, code, details) => {
    const { client } = clientReturning({ error: { code, message: 'x', details } }, status)
    await expect(sendContactMessage(input, client)).rejects.toMatchObject({ status, code, details } satisfies Partial<ApiError>)
  })
})
