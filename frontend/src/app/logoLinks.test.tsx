// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { HOME_LOGO_NAME } from '../components/brand/logoTarget'
import { mockLogin } from '../mocks/authMock'
import { read, resetMockDb } from '../mocks/db'
import { DEMO_PASSWORD } from '../mocks/seed'
import { AppProviders } from './providers'
import { routes } from './router'

// Every screen logo is a link home named "MmiriOma, home" (#337, docs/design/landing-v1.md "Logo links"):
// to `/`, including the partner app (owner request, 4 November 2026). Each shell is
// rendered whole, so a logo that is not wrapped in HomeLogo fails here. The source scan at the end catches
// a logo added to a screen these tests do not render.
const WAIT = 10_000
const SLOW = 20_000

beforeAll(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  Element.prototype.scrollIntoView = vi.fn()
})

beforeEach(() => resetMockDb())

function renderAt(path: string) {
  render(
    <AppProviders>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
    </AppProviders>,
  )
}

async function homeLinks() {
  return screen.findAllByRole('link', { name: HOME_LOGO_NAME }, { timeout: WAIT })
}

describe('public pages', () => {
  it('link the header and the footer logo to the homepage', async () => {
    renderAt('/')
    const links = await homeLinks()
    expect(links.length).toBeGreaterThanOrEqual(2)
    for (const link of links) expect(link).toHaveAttribute('href', '/')
  }, SLOW)

  it('link the logos on the Terms page (header and footer)', async () => {
    renderAt('/terms')
    const links = await homeLinks()
    expect(links.length).toBeGreaterThanOrEqual(2)
    for (const link of links) expect(link).toHaveAttribute('href', '/')
  }, SLOW)

  it('link the logo on the FAQ page', async () => {
    renderAt('/faq')
    for (const link of await homeLinks()) expect(link).toHaveAttribute('href', '/')
  }, SLOW)

  it('link the logo on the 404 page', async () => {
    renderAt('/no-such-page')
    expect((await homeLinks())[0]).toHaveAttribute('href', '/')
  }, SLOW)
})

describe('the sign-in pages', () => {
  it('link the customer logo home', async () => {
    renderAt('/signin')
    expect((await homeLinks())[0]).toHaveAttribute('href', '/')
  }, SLOW)

  it('link the staff logo home, not to the admin area', async () => {
    renderAt('/admin/login')
    expect((await homeLinks())[0]).toHaveAttribute('href', '/')
  }, SLOW)

  it('link the partner logo to the public homepage', async () => {
    renderAt('/partner/login')
    expect((await homeLinks())[0]).toHaveAttribute('href', '/')
  }, SLOW)
})

describe('the signed-in shells', () => {
  it('link the customer top bar logo home', async () => {
    await mockLogin({ phone: '0803 123 4567', password: DEMO_PASSWORD })
    renderAt('/home')
    expect((await homeLinks())[0]).toHaveAttribute('href', '/')
  }, SLOW)

  it('link the customer receipt logo home', async () => {
    await mockLogin({ phone: '0803 123 4567', password: DEMO_PASSWORD })
    const reference = Object.values(read().customers).flatMap((c) => c.orders)[0].reference
    renderAt(`/orders/${reference}/receipt`)
    expect((await homeLinks())[0]).toHaveAttribute('href', '/')
  }, SLOW)

  it('link the admin header logo home, which replaces the old link to /admin', async () => {
    await mockLogin({ phone: '0800 000 0100', password: DEMO_PASSWORD })
    renderAt('/admin')
    const links = await homeLinks()
    expect(links[0]).toHaveAttribute('href', '/')
    expect(screen.queryByRole('link', { name: 'MmiriOma admin dashboard' })).toBeNull()
  }, SLOW)

  it('link the partner top bar logo to the public homepage', async () => {
    await mockLogin({ phone: '0800 000 0101', password: DEMO_PASSWORD })
    renderAt('/partner/rider')
    expect((await homeLinks())[0]).toHaveAttribute('href', '/')
  }, SLOW)
})

describe('the landing hero', () => {
  it('shows exactly two buttons: Order water and Become a partner, and no install button', async () => {
    renderAt('/')
    const hero = (await screen.findByRole('heading', { level: 1, name: /Water at\s*your gate/ }, { timeout: WAIT })).closest('section')!
    const buttons = within(hero).getAllByRole('link')
    expect(buttons.map((b) => b.textContent?.trim())).toEqual(['Order water', 'Become a partner'])
    expect(within(hero).getByRole('link', { name: 'Order water' })).toHaveAttribute('href', '/order')
    expect(within(hero).getByRole('link', { name: 'Become a partner' })).toHaveAttribute('href', '/partner/signup')
    expect(within(hero).queryByText('Install the app')).toBeNull()
  }, SLOW)

  it('keeps install in its own section', async () => {
    renderAt('/')
    const section = (await screen.findByRole('heading', { name: /Put MmiriOma on your phone/ }, { timeout: WAIT })).closest('section')!
    expect(within(section).getAllByRole('button', { name: /Install/ }).length).toBeGreaterThanOrEqual(1)
  }, SLOW)
})

describe('every logo in the source is inside HomeLogo', () => {
  // The component's own definitions, the dev gallery pages, and tests.
  const SKIPPED = (path: string) => /\.test\.tsx$/.test(path) || path.includes('/dev/') || path.endsWith('/components/brand/Logo.tsx') || path.endsWith('/components/brand/HomeLogo.tsx')

  const sources = import.meta.glob('../**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

  it('finds the screens that draw a logo, so the scan is not empty', () => {
    const drawing = Object.entries(sources).filter(([path, text]) => !SKIPPED(path) && /<(Logo|BrandLogo)\b/.test(text))
    expect(drawing.length).toBeGreaterThanOrEqual(10)
  })

  it('has no <Logo> or <BrandLogo> outside a <HomeLogo>', () => {
    const loose: string[] = []
    for (const [path, text] of Object.entries(sources)) {
      if (SKIPPED(path)) continue
      for (const match of text.matchAll(/<(Logo|BrandLogo)\b/g)) {
        const before = text.slice(0, match.index)
        const open = before.lastIndexOf('<HomeLogo')
        const close = before.lastIndexOf('</HomeLogo>')
        if (open === -1 || close > open) loose.push(`${path.replace('..', 'src')}: <${match[1]}>`)
      }
    }
    expect(loose).toEqual([])
  })
})
