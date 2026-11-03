// @vitest-environment jsdom
import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '../../app/queryClient'
import { routes } from '../../app/router'
import { ApiError } from '../../lib/api/client'
import { PHONE_MESSAGE } from '../../lib/forms'
import { resetMockDb } from '../../mocks/db'
import { resetContactMessages } from '../../mocks/publicMock'
import { CONTACT, CONTACT_DESCRIPTION, CONTACT_TITLE, NAV_LINKS, contactLead } from './content'
import { getPublicContact, sendContactMessage } from './publicApi'
import { forgetOriginalTags } from './seoTags'

// The Contact page (#344, docs/design/contact.md). The support contact is faked, as in AboutPage.test.tsx, so each
// test says whether WhatsApp support is on. The message is sent through the real mock of POST /public/contact
// unless a test makes it fail; the form's switch is flipped per test.
const flags = vi.hoisted(() => ({ contactForm: true }))
vi.mock('../../lib/features', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/features')>()),
  get CONTACT_FORM_ENABLED() {
    return flags.contactForm
  },
}))
vi.mock('./publicApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./publicApi')>()
  return { ...actual, getPublicContact: vi.fn(), sendContactMessage: vi.fn(actual.sendContactMessage) }
})
const contact = vi.mocked(getPublicContact)
const send = vi.mocked(sendContactMessage)
const { sendContactMessage: sendThroughMock } = await vi.importActual<typeof import('./publicApi')>('./publicApi')

const ON = { phone: '+2348133774902', whatsapp: '+2348133774902' }
const OFF = { phone: '+2348133774902', whatsapp: null }
const VISITOR = { name: 'Sample Visitor', phone: '0800 000 0001', message: 'Do you deliver to Sample Street?' }
const WAIT = 10_000
const SLOW = 20_000

beforeAll(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  Element.prototype.scrollIntoView = vi.fn()
})

beforeEach(() => {
  resetMockDb()
  resetContactMessages()
  forgetOriginalTags()
  flags.contactForm = true
  contact.mockResolvedValue(ON)
  send.mockReset()
  send.mockImplementation(sendThroughMock)
})

afterEach(() => {
  document.head.replaceChildren()
  vi.restoreAllMocks()
})

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const view = render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { router, ...view }
}

async function contactPage() {
  return screen.findByRole('heading', { level: 1, name: 'Contact MmiriOma' }, { timeout: WAIT })
}

/** The form's controls, found by their labels. */
function fields() {
  return {
    name: screen.getByLabelText('Your name') as HTMLInputElement,
    phone: screen.getByLabelText('Phone number') as HTMLInputElement,
    topic: screen.getByLabelText(/What is it about\?/) as HTMLSelectElement,
    message: screen.getByLabelText('Your message') as HTMLTextAreaElement,
    button: screen.getByRole('button', { name: 'Send message' }),
  }
}

/** Fill the three required fields. Pasting is one input event per field, so the suite stays light (LOG 2026-10-23). */
async function fillIn(user: ReturnType<typeof userEvent.setup>, values = VISITOR) {
  const f = fields()
  for (const [field, value] of [
    [f.name, values.name],
    [f.phone, values.phone],
    [f.message, values.message],
  ] as const) {
    await user.click(field)
    await user.paste(value)
  }
  return f
}

async function openForm() {
  const user = userEvent.setup()
  const view = renderAt('/contact')
  await contactPage()
  return { user, ...view }
}

function apiError(status: number | null, code: string, details: unknown = null) {
  return new ApiError({ kind: status === null ? 'network' : 'http', status, code, message: 'x', details })
}

describe('the Contact page', () => {
  it('shows the breadcrumb, the kicker, the heading and the lead for calls, WhatsApp and the form', async () => {
    renderAt('/contact')
    await contactPage()
    const main = within(screen.getByRole('main'))
    expect(main.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('Home / Contact')
    expect(main.getByText('Contact us', { selector: 'p' })).toBeInTheDocument()
    expect(await main.findByText('Call or WhatsApp us, or send a message and our team will answer by phone.')).toBeInTheDocument()
  }, SLOW)

  it('shows the call, WhatsApp and email links and the place in "Talk to us"', async () => {
    renderAt('/contact')
    await contactPage()
    const card = screen.getByRole('region', { name: 'Talk to us' })
    expect(await within(card).findByRole('link', { name: 'Call 0813 377 4902' })).toHaveAttribute('href', 'tel:+2348133774902')
    expect(within(card).getByRole('link', { name: 'Chat on WhatsApp' })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\/2348133774902/))
    expect(within(card).getByRole('link', { name: 'Email support' })).toHaveAttribute('href', `mailto:${CONTACT.email}`)
    expect(within(card).getByText(CONTACT.place)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Read all answers' })).toHaveAttribute('href', '/faq')
  }, SLOW)

  it('takes the phone from the server, not from the page (FR-055)', async () => {
    contact.mockResolvedValue({ phone: '+2348000000000', whatsapp: null })
    renderAt('/contact')
    await contactPage()
    const card = screen.getByRole('region', { name: 'Talk to us' })
    expect(await within(card).findByRole('link', { name: 'Call 0800 000 0000' })).toHaveAttribute('href', 'tel:+2348000000000')
  }, SLOW)

  it('shows the official number while the support contact cannot be read', async () => {
    contact.mockRejectedValue(apiError(null, 'network_error'))
    renderAt('/contact')
    await contactPage()
    const card = screen.getByRole('region', { name: 'Talk to us' })
    expect(within(card).getByRole('link', { name: 'Call 0813 377 4902' })).toHaveAttribute('href', 'tel:+2348133774902')
  }, SLOW)

  it('drops every WhatsApp link, and "or WhatsApp" from the lead, while WhatsApp support is off', async () => {
    contact.mockResolvedValue(OFF)
    renderAt('/contact')
    await contactPage()
    expect(await screen.findByText('Call us, or send a message and our team will answer by phone.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /WhatsApp/ })).toBeNull()
  }, SLOW)

  it('says nothing about a reply time, opening hours or the water', async () => {
    renderAt('/contact')
    await contactPage()
    const text = screen.getByRole('main').textContent ?? ''
    expect(text).not.toMatch(/\b(within|hours?|same day|24|today|we'll email|safe|clean|pure|purified|tested|certified|potable)\b/i)
  }, SLOW)

  it('still shows the 404 page for an unknown address under /contact', async () => {
    renderAt('/contact/team')
    expect(await screen.findByRole('heading', { name: /This page doesn't exist/ }, { timeout: WAIT })).toBeInTheDocument()
  }, SLOW)
})

describe('the Contact page with the form switched off', () => {
  beforeEach(() => {
    flags.contactForm = false
  })

  it('shows the intro and the contact card only: no form, no placeholder', async () => {
    renderAt('/contact')
    await contactPage()
    expect(await screen.findByText('Call or WhatsApp us.')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Talk to us' })).toBeInTheDocument()
    expect(document.querySelector('form')).toBeNull()
    expect(screen.queryByText(/send us a message|send a message|coming soon/i)).toBeNull()
  }, SLOW)

  it('leaves "send a message" out of the description', async () => {
    document.head.insertAdjacentHTML('beforeend', '<meta name="description" content="x" />')
    renderAt('/contact')
    await contactPage()
    await vi.waitFor(() => expect(document.title).toBe(CONTACT_TITLE))
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(CONTACT_DESCRIPTION.withoutForm)
  }, SLOW)

  it('says just "Call us." when WhatsApp support is off as well', () => {
    expect(contactLead(false, false)).toBe('Call us.')
  })
})

describe('the Contact page’s search tags', () => {
  it('sets its own title, description and canonical while shown', async () => {
    for (const html of ['<meta name="description" content="x" />', '<link rel="canonical" href="https://mmiriomadelivery.com/" />']) {
      document.head.insertAdjacentHTML('beforeend', html)
    }
    renderAt('/contact')
    await contactPage()
    await vi.waitFor(() => expect(document.title).toBe(CONTACT_TITLE))
    expect(CONTACT_TITLE).toBe('Contact MmiriOma | Water delivery in Enugu')
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      'Call, WhatsApp or send a message to the MmiriOma team in Enugu.',
    )
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://mmiriomadelivery.com/contact')
  }, SLOW)
})

describe('the links to the Contact page', () => {
  it('puts Contact after FAQs in the navigation links', () => {
    const labels = NAV_LINKS.map((l) => l.label)
    expect(labels.indexOf('Contact')).toBe(labels.indexOf('FAQs') + 1)
    expect(NAV_LINKS.find((l) => l.label === 'Contact')?.to).toBe('/contact')
  })

  it.each(['/', '/faq', '/about', '/contact'])('has Contact in the header on %s', async (path) => {
    renderAt(path)
    const main = await screen.findByRole('navigation', { name: 'Main' }, { timeout: WAIT })
    expect(within(main).getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/contact')
  }, SLOW)

  it('marks Contact as the current page in the header on /contact, and no other link', async () => {
    renderAt('/contact')
    const nav = await screen.findByRole('navigation', { name: 'Main' }, { timeout: WAIT })
    expect(within(nav).getByRole('link', { name: 'Contact' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getAllByRole('link').filter((l) => l.getAttribute('aria-current') === 'page')).toHaveLength(1)
  }, SLOW)

  it('has Contact in the footer’s Quick Links on the short footer (/contact) and the full one (/)', async () => {
    for (const path of ['/contact', '/']) {
      const view = renderAt(path)
      const quick = await screen.findByRole('navigation', { name: 'Quick Links' }, { timeout: WAIT })
      expect(within(quick).getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/contact')
      view.unmount()
    }
  }, SLOW)

  it('has Contact in the menu that opens on a phone', async () => {
    const user = userEvent.setup()
    renderAt('/contact')
    await user.click(await screen.findByRole('button', { name: 'Open menu' }, { timeout: WAIT }))
    expect(within(screen.getByRole('navigation', { name: 'Mobile' })).getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/contact')
  }, SLOW)
})

describe('the contact form', () => {
  it('has the fields, hints and privacy line of the design, and every control has a label', async () => {
    await openForm()
    const f = fields()
    expect(f.name).toHaveAttribute('autocomplete', 'name')
    expect(f.phone).toHaveAttribute('type', 'tel')
    expect(f.phone).toHaveAttribute('autocomplete', 'tel')
    expect(f.phone).toHaveAccessibleDescription('We answer by calling this number.')
    expect(within(f.topic).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Choose a topic',
      'Late delivery',
      'Wrong quantity',
      'Payment',
      'Rider',
      'Something else',
    ])
    expect(f.message).toHaveAccessibleDescription('0/1000')
    expect(screen.getByText(/We use your name and number only to answer this message, and we don't link it to an account\./)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Privacy notice' })).toHaveAttribute('href', '/privacy')
  }, SLOW)

  it('submits with POST, so the text could never end up in the address', async () => {
    await openForm()
    expect(document.querySelector('form')).toHaveAttribute('method', 'post')
  }, SLOW)

  it('shows each empty field’s message, sends nothing and moves focus to the first', async () => {
    const { user } = await openForm()
    await user.click(fields().button)
    expect(await screen.findByText('Enter your name.')).toBeInTheDocument()
    expect(screen.getByText('Enter your phone number.')).toBeInTheDocument()
    expect(screen.getByText('Write your message.')).toBeInTheDocument()
    expect(fields().name).toHaveFocus()
    expect(fields().name).toHaveAttribute('aria-invalid', 'true')
    expect(fields().name).toHaveAccessibleDescription('Enter your name.')
    // Only the error colours: with the normal ones beside them, the stylesheet order kept invalid fields grey.
    expect(fields().name).toHaveClass('border-[#DC2626]', 'bg-[#FEF2F2]')
    expect(fields().name).not.toHaveClass('border-input-line')
    expect(fields().name).not.toHaveClass('bg-white')
    expect(fields().topic).toHaveClass('border-input-line', 'bg-white')
    expect(send).not.toHaveBeenCalled()
  }, SLOW)

  it('checks the phone, the message length and the name length before sending', async () => {
    const { user } = await openForm()
    const f = await fillIn(user, { name: 'x'.repeat(101), phone: '12345', message: 'hi' })
    await user.click(f.button)
    expect(await screen.findByText('Use 100 characters or fewer.')).toBeInTheDocument()
    expect(screen.getByText(PHONE_MESSAGE)).toBeInTheDocument()
    expect(screen.getByText('Write at least 3 characters.')).toBeInTheDocument()
    await user.clear(f.message)
    await user.click(f.message)
    await user.paste('x'.repeat(1001))
    expect(f.message).toHaveAccessibleDescription(/1001\/1000/)
    await user.click(f.button)
    expect(await screen.findByText('Use 1,000 characters or fewer.')).toBeInTheDocument()
    expect(send).not.toHaveBeenCalled()
  }, SLOW)

  it('sends the message, shows "Sending…" once, then the reference, with no reply time', async () => {
    const { user } = await openForm()
    const f = await fillIn(user)
    await user.click(f.button)
    const sending = await screen.findByRole('button', { name: 'Sending…' })
    expect(sending).toBeDisabled()
    expect(f.name).toHaveAttribute('readonly')
    expect(f.message).toHaveAttribute('readonly')

    const heading = await screen.findByRole('heading', { name: 'Message received' }, { timeout: WAIT })
    expect(heading).toHaveFocus()
    const panel = screen.getByRole('region', { name: 'Your message' })
    expect(panel).toHaveTextContent('Thank you. Our team answers website messages by phone, on the number you gave.')
    expect(panel).toHaveTextContent(/Your reference: SR-[0-9A-HJKMNP-TV-Z]{8}\. Quote it if you call us\./)
    expect(within(panel).getByRole('link', { name: 'Call 0813 377 4902' })).toHaveAttribute('href', 'tel:+2348133774902')
    expect(within(panel).getByRole('link', { name: 'Chat on WhatsApp' })).toBeInTheDocument()
    expect(panel.textContent).not.toMatch(/\b(within|hours?|minutes?|today|tomorrow|email|confirmed|booked)\b/i)

    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0][0]).toEqual({ name: VISITOR.name, phone: VISITOR.phone, message: VISITOR.message, website: '' })
  }, SLOW)

  it('sends the chosen topic', async () => {
    const { user } = await openForm()
    const f = await fillIn(user)
    await user.selectOptions(f.topic, 'Wrong quantity')
    await user.click(f.button)
    await screen.findByRole('heading', { name: 'Message received' }, { timeout: WAIT })
    expect(send.mock.calls[0][0].topic).toBe('wrong_quantity')
  }, SLOW)

  it('brings back an empty form with "Send another message", with focus on the name', async () => {
    const { user } = await openForm()
    await user.click((await fillIn(user)).button)
    await user.click(await screen.findByRole('button', { name: 'Send another message' }, { timeout: WAIT }))
    const f = fields()
    expect(f.name).toHaveValue('')
    expect(f.phone).toHaveValue('')
    expect(f.message).toHaveValue('')
    expect(f.topic).toHaveValue('')
    expect(f.name).toHaveFocus()
    expect(document.querySelector<HTMLInputElement>('input[name="website"]')?.value).toBe('')
  }, SLOW)

  it('sends one request when the button is pressed twice', async () => {
    const { user } = await openForm()
    const f = await fillIn(user)
    await user.dblClick(f.button)
    await screen.findByRole('heading', { name: 'Message received' }, { timeout: WAIT })
    expect(send).toHaveBeenCalledTimes(1)
  }, SLOW)

  it('hides the honeypot from people and screen readers, and sends it empty on a normal submit', async () => {
    const { user } = await openForm()
    const honeypot = document.querySelector<HTMLInputElement>('input[name="website"]')!
    expect(honeypot).toHaveAttribute('autocomplete', 'off')
    expect(honeypot).toHaveAttribute('tabindex', '-1')
    expect(honeypot).toHaveAttribute('aria-hidden', 'true')
    // Moved off-screen, not display: none, so a bot still finds it.
    const box = honeypot.parentElement!
    expect(box).toHaveAttribute('aria-hidden', 'true')
    expect(box.className).toContain('-left-[10000px]')
    expect(box.className.split(' ')).not.toContain('hidden')
    // Not in the accessibility tree, so a screen reader never offers it.
    expect(screen.queryByRole('textbox', { name: 'Website' })).toBeNull()

    await user.click((await fillIn(user)).button)
    await screen.findByRole('heading', { name: 'Message received' }, { timeout: WAIT })
    expect(send.mock.calls[0][0].website).toBe('')
  }, SLOW)

  it('sends what a bot put in the honeypot, so the server can drop it', async () => {
    const { user } = await openForm()
    document.querySelector<HTMLInputElement>('input[name="website"]')!.value = 'https://spam.example'
    await user.click((await fillIn(user)).button)
    await screen.findByRole('heading', { name: 'Message received' }, { timeout: WAIT })
    expect(send.mock.calls[0][0].website).toBe('https://spam.example')
  }, SLOW)

  it('puts a server field error under its field, keeps the text and moves focus there', async () => {
    send.mockRejectedValue(apiError(422, 'validation_error', [{ loc: ['body', 'phone'], msg: 'Enter a Nigerian mobile number', type: 'value_error' }]))
    const { user } = await openForm()
    const f = await fillIn(user)
    await user.click(f.button)
    expect(await screen.findByText('Enter a Nigerian mobile number')).toBeInTheDocument()
    expect(f.phone).toHaveFocus()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(f.message).toHaveValue(VISITOR.message)
  }, SLOW)

  it.each([
    ['a 422 that names no visible field', apiError(422, 'validation_error', [{ loc: ['body', 'website'], msg: 'x', type: 'string_type' }]), "We couldn't send this message. Check it and try again."],
    ['offline', apiError(null, 'network_error'), "You're offline. Your message is still here: send it when you're back online."],
    ['503', apiError(503, 'service_unavailable'), "We couldn't send your message just now. Try again, or call us on 0813 377 4902."],
    ['an unexpected failure', apiError(500, 'internal_error'), "We couldn't send your message just now. Try again, or call us on 0813 377 4902."],
    ['429 with a wait', apiError(429, 'too_many_attempts', { retry_after_seconds: 1150 }), "You've sent several messages in a short time. You can send another in about 20 minutes. If it's urgent, call us on 0813 377 4902."],
    ['429 with under a minute to wait', apiError(429, 'too_many_attempts', { retry_after_seconds: 30 }), "You've sent several messages in a short time. You can send another in about 1 minute. If it's urgent, call us on 0813 377 4902."],
    ['429 without a wait', apiError(429, 'too_many_attempts'), "You've sent several messages in a short time. Please try again later. If it's urgent, call us on 0813 377 4902."],
  ])('shows the banner for %s and keeps the text', async (_case, error, text) => {
    send.mockRejectedValue(error)
    const { user } = await openForm()
    const f = await fillIn(user)
    await user.selectOptions(f.topic, 'Payment')
    await user.click(f.button)
    const alert = await screen.findByRole('alert', {}, { timeout: WAIT })
    expect(alert).toHaveTextContent(text)
    expect(f.name).toHaveValue(VISITOR.name)
    expect(f.phone).toHaveValue(VISITOR.phone)
    expect(f.message).toHaveValue(VISITOR.message)
    expect(f.topic).toHaveValue('payment')
    expect(screen.getByRole('button', { name: 'Send message' })).toBeEnabled()
  }, SLOW)

  it('links the support number in the banner', async () => {
    send.mockRejectedValue(apiError(503, 'service_unavailable'))
    const { user } = await openForm()
    await user.click((await fillIn(user)).button)
    const alert = await screen.findByRole('alert', {}, { timeout: WAIT })
    expect(within(alert).getByRole('link', { name: '0813 377 4902' })).toHaveAttribute('href', 'tel:+2348133774902')
  }, SLOW)

  it('sends the same text again after a failure, topic included', async () => {
    send.mockRejectedValueOnce(apiError(null, 'network_error'))
    const { user } = await openForm()
    const f = await fillIn(user)
    await user.selectOptions(f.topic, 'Rider')
    await user.click(f.button)
    await screen.findByRole('alert', {}, { timeout: WAIT })
    await user.click(screen.getByRole('button', { name: 'Send message' }))
    await screen.findByRole('heading', { name: 'Message received' }, { timeout: WAIT })
    expect(send).toHaveBeenCalledTimes(2)
    expect(send.mock.calls[1][0]).toEqual(send.mock.calls[0][0])
    expect(send.mock.calls[1][0].topic).toBe('rider')
  }, SLOW)

  it('shows the 429 banner after a fourth message from one phone in mock mode', async () => {
    const { user } = await openForm()
    for (let i = 0; i < 3; i++) {
      if (i > 0) await user.click(await screen.findByRole('button', { name: 'Send another message' }, { timeout: WAIT }))
      await user.click((await fillIn(user)).button)
      await screen.findByRole('heading', { name: 'Message received' }, { timeout: WAIT })
    }
    await user.click(screen.getByRole('button', { name: 'Send another message' }))
    await user.click((await fillIn(user)).button)
    expect(await screen.findByRole('alert', {}, { timeout: WAIT })).toHaveTextContent(/You can send another in about 60 minutes\./)
  }, SLOW)

  it('never writes the name, phone or message to the console, browser storage or the address', async () => {
    const spies = [
      ...(['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m)),
      vi.spyOn(Storage.prototype, 'setItem'),
      vi.spyOn(window.history, 'pushState'),
      vi.spyOn(window.history, 'replaceState'),
    ]
    send.mockRejectedValueOnce(apiError(503, 'service_unavailable'))
    const { user, router } = await openForm()
    const f = await fillIn(user)
    await user.click(f.button)
    await screen.findByRole('alert', {}, { timeout: WAIT })
    await user.click(screen.getByRole('button', { name: 'Send message' }))
    await screen.findByRole('heading', { name: 'Message received' }, { timeout: WAIT })

    const written = JSON.stringify(spies.flatMap((s) => s.mock.calls))
    for (const value of [VISITOR.name, VISITOR.phone, '08000000001', '+2348000000001', VISITOR.message]) expect(written).not.toContain(value)
    expect(router.state.location.pathname).toBe('/contact')
    expect(router.state.location.search).toBe('')
    expect(document.body.textContent).not.toContain(VISITOR.message)
  }, SLOW)
})
