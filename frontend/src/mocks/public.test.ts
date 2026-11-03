import { beforeEach, describe, expect, it } from 'vitest'
import { whatsappLink } from '../lib/whatsapp'
import { getPublicContact, resetContactMessages, sendContactMessage } from './publicMock'

describe('whatsappLink', () => {
  it('builds a wa.me link with digits only and the message typed in', () => {
    expect(whatsappLink('+2348011112222', 'Hi & hello?')).toBe('https://wa.me/2348011112222?text=Hi%20%26%20hello%3F')
    expect(whatsappLink('+2348011112222')).toBe('https://wa.me/2348011112222')
  })

  it('falls back to the official support number', () => {
    expect(whatsappLink(null)).toBe('https://wa.me/2348133774902')
  })
})

describe('support contact mock (docs/api/public-site.md)', () => {
  it('answers like the backend with WhatsApp on: the official number for both (FR-055)', async () => {
    expect(await getPublicContact()).toEqual({ phone: '+2348133774902', whatsapp: '+2348133774902' })
  })
})

describe('contact form mock (POST /public/contact, #339)', () => {
  const message = { name: 'Sample Visitor', phone: '08000000001', message: 'Do you deliver to my street?', website: '' }

  beforeEach(() => resetContactMessages())

  it('answers with an SR- reference and the time it arrived', async () => {
    const receipt = await sendContactMessage(message)
    expect(receipt.reference).toMatch(/^SR-[0-9A-HJKMNP-TV-Z]{8}$/)
    expect(Number.isNaN(Date.parse(receipt.created_at))).toBe(false)
  })

  it('refuses a fourth message from one phone within the hour, in any format, with the wait', async () => {
    for (const phone of ['08000000001', '+2348000000001', '2348000000001']) await sendContactMessage({ ...message, phone })
    await expect(sendContactMessage(message)).rejects.toMatchObject({ status: 429, code: 'too_many_attempts', details: { retry_after_seconds: expect.any(Number) } })
  })

  it('answers a filled honeypot like a real message and does not count it', async () => {
    for (let i = 0; i < 5; i++) expect((await sendContactMessage({ ...message, website: 'https://spam.example' })).reference).toMatch(/^SR-/)
    await expect(sendContactMessage(message)).resolves.toMatchObject({ reference: expect.stringMatching(/^SR-/) })
  })

  it.each([
    ['name', { name: '   ' }],
    ['phone', { phone: '12345' }],
    ['message', { message: 'hi' }],
    ['message', { message: 'x'.repeat(1001) }],
  ])('refuses a bad %s with 422 naming the field', async (field, change) => {
    await expect(sendContactMessage({ ...message, ...change })).rejects.toMatchObject({
      status: 422,
      code: 'validation_error',
      details: [expect.objectContaining({ loc: ['body', field] })],
    })
  })
})
