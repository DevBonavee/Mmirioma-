// @vitest-environment jsdom
import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '../../app/queryClient'
import { routes } from '../../app/router'
import { resetMockDb } from '../../mocks/db'
import { ABOUT_DESCRIPTION, ABOUT_TITLE, BRAND_LINE, CONTACT, HOW_STEPS, NAV_LINKS, SERVICE_AREAS } from './content'
import { getPublicContact } from './publicApi'
import { forgetOriginalTags } from './seoTags'

// The About Us page (#338, docs/design/about.md). The support contact is faked, as in supportContact.test.tsx,
// so each test says whether WhatsApp support is on.
vi.mock('./publicApi', () => ({ getPublicContact: vi.fn() }))
const contact = vi.mocked(getPublicContact)

const ON = { phone: '+2348133774902', whatsapp: '+2348133774902' }
const OFF = { phone: '+2348133774902', whatsapp: null }
const WAIT = 10_000
const SLOW = 20_000

beforeAll(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  Element.prototype.scrollIntoView = vi.fn()
})

beforeEach(() => {
  resetMockDb()
  forgetOriginalTags()
  contact.mockResolvedValue(ON)
})

afterEach(() => document.head.replaceChildren())

function renderAt(path: string) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
    </QueryClientProvider>,
  )
}

async function aboutPage() {
  return screen.findByRole('heading', { level: 1, name: 'About MmiriOma' }, { timeout: WAIT })
}

describe('the About page', () => {
  it('shows the heading and the lead line the footer already uses', async () => {
    renderAt('/about')
    await aboutPage()
    const main = within(screen.getByRole('main'))
    expect(main.getByText('About us', { selector: 'p' })).toBeInTheDocument()
    expect(main.getByText(BRAND_LINE)).toBeInTheDocument()
  }, SLOW)

  it('shows the four delivery steps in the landing page’s words', async () => {
    renderAt('/about')
    await aboutPage()
    const how = screen.getByRole('region', { name: 'How delivery works' })
    const steps = within(how).getAllByRole('listitem')
    expect(steps).toHaveLength(4)
    HOW_STEPS.forEach((step, i) => {
      expect(within(steps[i]).getByRole('heading', { level: 3, name: step.title })).toBeInTheDocument()
      expect(within(steps[i]).getByText(step.text)).toBeInTheDocument()
    })
  }, SLOW)

  it('says the same four steps on the landing page, from one copy', async () => {
    renderAt('/')
    await screen.findByRole('heading', { level: 1, name: /Water at\s*your gate/ }, { timeout: WAIT })
    for (const step of HOW_STEPS) expect(screen.getAllByText(step.text).length).toBeGreaterThanOrEqual(1)
  }, SLOW)

  it('leaves out "Who we are", which waits for the owner’s copy, and shows no placeholder for it', async () => {
    renderAt('/about')
    await aboutPage()
    expect(screen.queryByText(/who we are/i)).toBeNull()
    expect(document.body.textContent).not.toMatch(/coming soon|lorem|\[.*\]/i)
  }, SLOW)

  it('links the areas section and names no area itself', async () => {
    renderAt('/about')
    await aboutPage()
    expect(screen.getByRole('link', { name: 'See the areas we serve' })).toHaveAttribute('href', '/#areas')
    for (const area of SERVICE_AREAS) expect(document.body.textContent).not.toContain(area)
  }, SLOW)

  it('shows the place, the email, the phone from the server and WhatsApp when it is on', async () => {
    renderAt('/about')
    await aboutPage()
    const card = screen.getByRole('region', { name: 'Who to contact' })
    expect(within(card).getByText(CONTACT.place)).toBeInTheDocument()
    expect(within(card).getByRole('link', { name: CONTACT.email })).toHaveAttribute('href', `mailto:${CONTACT.email}`)
    expect(await within(card).findByRole('link', { name: '0813 377 4902' })).toHaveAttribute('href', 'tel:+2348133774902')
    expect(within(card).getByRole('link', { name: 'Chat on WhatsApp' })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\/2348133774902/))
    expect(within(card).getByRole('link', { name: 'Read all answers' }).getAttribute('href') ?? '').toBe('/faq')
  }, SLOW)

  it('takes the phone from the server, not from the page', async () => {
    contact.mockResolvedValue({ phone: '+2348000000000', whatsapp: null })
    renderAt('/about')
    await aboutPage()
    const card = screen.getByRole('region', { name: 'Who to contact' })
    expect(await within(card).findByRole('link', { name: '0800 000 0000' })).toHaveAttribute('href', 'tel:+2348000000000')
    expect(within(card).queryByRole('link', { name: '0813 377 4902' })).toBeNull()
  }, SLOW)

  it('hides every WhatsApp link, and keeps the phone and the order button, while WhatsApp support is off', async () => {
    contact.mockResolvedValue(OFF)
    renderAt('/about')
    await aboutPage()
    const card = screen.getByRole('region', { name: 'Who to contact' })
    expect(await within(card).findByRole('link', { name: '0813 377 4902' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /WhatsApp/ })).toBeNull()
    expect(screen.getAllByRole('link', { name: /Order Water/ }).some((l) => l.getAttribute('href') === '/order')).toBe(true)
  }, SLOW)

  it('ends with Order Water and, when it is on, Ask us on WhatsApp', async () => {
    renderAt('/about')
    await aboutPage()
    const main = screen.getByRole('main')
    const order = within(main).getByRole('link', { name: /Order Water/ })
    expect(order).toHaveAttribute('href', '/order')
    expect(await within(main).findByRole('link', { name: 'Ask us on WhatsApp' })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\//))
  }, SLOW)

  it('says nothing about the water itself and gives no number of its own', async () => {
    renderAt('/about')
    await aboutPage()
    const text = screen.getByRole('main').textContent ?? ''
    expect(text).not.toMatch(/\b(safe|clean|pure|purified|tested|certified|quality|potable)\b/i)
    // No years, counts or ratings: the only digits are the four step numbers, the phone and the email's.
    expect(text.replace(/0813 377 4902/g, '').replace(CONTACT.email, '')).not.toMatch(/\d{2,}/)
    expect(text).not.toMatch(/\bover\b.*\b(customers|deliveries)\b/i)
  }, SLOW)
})

describe('the About page’s search tags', () => {
  it('sets its own title, description and canonical while shown', async () => {
    for (const html of ['<meta name="description" content="x" />', '<link rel="canonical" href="https://mmiriomadelivery.com/" />']) {
      document.head.insertAdjacentHTML('beforeend', html)
    }
    renderAt('/about')
    await aboutPage()
    await vi.waitFor(() => expect(document.title).toBe(ABOUT_TITLE))
    expect(ABOUT_TITLE).toBe('About MmiriOma | Water delivery in Enugu')
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(ABOUT_DESCRIPTION)
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://mmiriomadelivery.com/about')
  }, SLOW)
})

describe('the links to the About page', () => {
  it('puts About after For Drivers in the navigation links', () => {
    const labels = NAV_LINKS.map((l) => l.label)
    expect(labels.indexOf('About')).toBe(labels.indexOf('For Drivers') + 1)
    expect(NAV_LINKS.find((l) => l.label === 'About')?.to).toBe('/about')
  })

  it.each(['/', '/faq', '/about'])('has About in the header on %s', async (path) => {
    renderAt(path)
    const main = await screen.findByRole('navigation', { name: 'Main' }, { timeout: WAIT })
    expect(within(main).getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about')
  }, SLOW)

  it('keeps each header label on one line, so seven links do not wrap or push the button off the edge', async () => {
    renderAt('/about')
    const nav = await screen.findByRole('navigation', { name: 'Main' }, { timeout: WAIT })
    const links = within(nav).getAllByRole('link')
    expect(links).toHaveLength(NAV_LINKS.length)
    for (const link of links) expect(link.className).toContain('whitespace-nowrap')
  }, SLOW)

  it('marks About as the current page in the header on /about, and no other link', async () => {
    renderAt('/about')
    const nav = await screen.findByRole('navigation', { name: 'Main' }, { timeout: WAIT })
    expect(within(nav).getByRole('link', { name: 'About' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getAllByRole('link').filter((l) => l.getAttribute('aria-current') === 'page')).toHaveLength(1)
  }, SLOW)

  it('has About in the footer’s Quick Links on the short footer (/about) and the full one (/)', async () => {
    for (const path of ['/about', '/']) {
      const view = renderAt(path)
      const quick = await screen.findByRole('navigation', { name: 'Quick Links' }, { timeout: WAIT })
      expect(within(quick).getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about')
      view.unmount()
    }
  }, SLOW)

  it('shows only Home, About and FAQs in the short footer', async () => {
    renderAt('/about')
    const quick = await screen.findByRole('navigation', { name: 'Quick Links' }, { timeout: WAIT })
    expect(within(quick).getAllByRole('link').map((l) => l.textContent)).toEqual(['Home', 'About', 'FAQs'])
  }, SLOW)

  it('has About in the menu that opens on a phone', async () => {
    const user = userEvent.setup()
    renderAt('/about')
    await user.click(await screen.findByRole('button', { name: 'Open menu' }, { timeout: WAIT }))
    const menu = screen.getByRole('navigation', { name: 'Mobile' })
    expect(within(menu).getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about')
  }, SLOW)

  it('still shows the 404 page for an unknown address under /about', async () => {
    renderAt('/about/team')
    expect(await screen.findByRole('heading', { name: /This page doesn't exist/ }, { timeout: WAIT })).toBeInTheDocument()
  }, SLOW)
})
