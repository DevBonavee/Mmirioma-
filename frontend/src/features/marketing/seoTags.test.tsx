// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '../../app/providers'
import { routes } from '../../app/router'
import { resetMockDb } from '../../mocks/db'
import { SITE_URL, applyPageTags, canonicalFor, forgetOriginalTags, restoreDefaultTags } from './seoTags'

// Search and sharing tags (#331, docs/features/seo.md). The real index.html is read as text, since that is
// what a crawler gets before any JavaScript runs. The frontend has no Node type package, so the file system
// is loaded by name and typed here; the tests run from `frontend/` (npm test).
async function readSource(path: string): Promise<string> {
  const fsModule = 'node:fs/promises'
  const { readFile } = (await import(/* @vite-ignore */ fsModule)) as { readFile: (file: string, encoding: string) => Promise<string> }
  const { cwd } = (globalThis as unknown as { process: { cwd: () => string } }).process
  return (await readFile(`${cwd()}/${path}`, 'utf-8')).replaceAll(String.fromCharCode(13, 10), String.fromCharCode(10))
}

const indexHtml = await readSource('index.html')
const served = new DOMParser().parseFromString(indexHtml, 'text/html')

const meta = (doc: Document, selector: string) => doc.querySelector(selector)?.getAttribute('content') ?? null
const link = (doc: Document, rel: string) => doc.querySelector(`link[rel="${rel}"]`)?.getAttribute('href') ?? null

describe('the landing page HTML as the server sends it (index.html)', () => {
  it('has the title, description, canonical and Open Graph tags in the source', () => {
    expect(served.title).toBe('MmiriOma | Water delivery in Enugu')
    expect(meta(served, 'meta[name="description"]')).toMatch(/^Order water by keke or tanker in Enugu\./)
    expect(link(served, 'canonical')).toBe(`${SITE_URL}/`)
    expect(meta(served, 'meta[property="og:title"]')).toBe('MmiriOma | Water delivery in Enugu')
    expect(meta(served, 'meta[property="og:description"]')).toBeTruthy()
    expect(meta(served, 'meta[property="og:url"]')).toBe(`${SITE_URL}/`)
    expect(meta(served, 'meta[property="og:type"]')).toBe('website')
    expect(meta(served, 'meta[property="og:site_name"]')).toBe('MmiriOma')
  })

  it('has Twitter tags and an absolute share image, which a scraper can fetch', () => {
    expect(meta(served, 'meta[name="twitter:card"]')).toBe('summary_large_image')
    expect(meta(served, 'meta[name="twitter:title"]')).toBeTruthy()
    expect(meta(served, 'meta[name="twitter:description"]')).toBeTruthy()
    for (const selector of ['meta[property="og:image"]', 'meta[name="twitter:image"]']) {
      expect(meta(served, selector)).toBe(`${SITE_URL}/marketing/homepage-hero-keke.png`)
    }
    expect(meta(served, 'meta[property="og:image:alt"]')).toBeTruthy()
  })

  it('keeps every address in the head on the production domain', () => {
    const addresses = [link(served, 'canonical'), meta(served, 'meta[property="og:url"]'), meta(served, 'meta[property="og:image"]'), meta(served, 'meta[name="twitter:image"]')]
    for (const address of addresses) expect(address?.startsWith(`${SITE_URL}/`)).toBe(true)
  })

  it('has LocalBusiness JSON-LD with only the confirmed facts, and no phone (FR-055)', () => {
    const script = served.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
    const data = JSON.parse(script!.textContent!)
    expect(data['@context']).toBe('https://schema.org')
    expect(data['@type']).toBe('LocalBusiness')
    expect(data.name).toBe('MmiriOma')
    expect(data.url).toBe(`${SITE_URL}/`)
    expect(data.areaServed).toEqual({ '@type': 'City', name: 'Enugu' })
    expect(data.address).toEqual({ '@type': 'PostalAddress', addressLocality: 'Enugu', addressCountry: 'NG' })
    // Nothing the team has not confirmed.
    for (const unconfirmed of ['telephone', 'email', 'openingHours', 'openingHoursSpecification', 'geo', 'sameAs', 'priceRange', 'aggregateRating', 'review', 'streetAddress']) {
      expect(JSON.stringify(data)).not.toContain(`"${unconfirmed}"`)
    }
  })
})

describe('canonicalFor', () => {
  it.each([
    ['/', `${SITE_URL}/`],
    ['/faq', `${SITE_URL}/faq`],
    ['/faq/', `${SITE_URL}/faq`],
    ['/terms', `${SITE_URL}/terms`],
    ['/privacy///', `${SITE_URL}/privacy`],
  ])('names %s as %s', (path, url) => {
    expect(canonicalFor(path)).toBe(url)
  })
})

describe('applyPageTags and restoreDefaultTags', () => {
  beforeEach(() => {
    forgetOriginalTags()
    document.documentElement.innerHTML = served.documentElement.innerHTML
  })

  it('replaces the title, description, canonical and share tags, and puts the first values back', () => {
    const firstDescription = meta(document, 'meta[name="description"]')
    applyPageTags(document, { title: 'FAQs | MmiriOma', description: 'Answers about ordering.', url: `${SITE_URL}/faq` })
    expect(document.title).toBe('FAQs | MmiriOma')
    expect(meta(document, 'meta[name="description"]')).toBe('Answers about ordering.')
    expect(link(document, 'canonical')).toBe(`${SITE_URL}/faq`)
    expect(meta(document, 'meta[property="og:url"]')).toBe(`${SITE_URL}/faq`)
    expect(meta(document, 'meta[property="og:title"]')).toBe('FAQs | MmiriOma')
    expect(meta(document, 'meta[name="twitter:title"]')).toBe('FAQs | MmiriOma')
    expect(meta(document, 'meta[property="og:description"]')).toBe('Answers about ordering.')
    expect(meta(document, 'meta[name="twitter:description"]')).toBe('Answers about ordering.')

    restoreDefaultTags(document, 'MmiriOma')
    expect(document.title).toBe('MmiriOma')
    expect(meta(document, 'meta[name="description"]')).toBe(firstDescription)
    expect(link(document, 'canonical')).toBe(`${SITE_URL}/`)
    expect(meta(document, 'meta[property="og:url"]')).toBe(`${SITE_URL}/`)
    expect(meta(document, 'meta[property="og:title"]')).toBe('MmiriOma | Water delivery in Enugu')
  })

  it('does not fail on a head that lacks a tag', () => {
    document.head.innerHTML = '<title>x</title>'
    expect(() => applyPageTags(document, { title: 'T', description: 'D', url: `${SITE_URL}/faq` })).not.toThrow()
    expect(() => restoreDefaultTags(document, 'MmiriOma')).not.toThrow()
    expect(document.title).toBe('MmiriOma')
  })
})

describe('the public pages set their own tags while shown', () => {
  beforeAll(() => {
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
    Element.prototype.scrollIntoView = vi.fn()
  })
  beforeEach(() => {
    forgetOriginalTags()
    document.documentElement.innerHTML = served.documentElement.innerHTML
    resetMockDb()
  })
  afterEach(() => document.documentElement.replaceChildren())

  function renderAt(path: string) {
    return render(
      <AppProviders>
        <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
      </AppProviders>,
    )
  }

  it.each([
    ['/', 'MmiriOma | Water delivery in Enugu', `${SITE_URL}/`],
    ['/faq', 'FAQs | MmiriOma', `${SITE_URL}/faq`],
    ['/terms', 'Terms of Service | MmiriOma', `${SITE_URL}/terms`],
    ['/privacy', 'Privacy Notice | MmiriOma', `${SITE_URL}/privacy`],
  ])('shows the right title and canonical on %s', async (path, title, canonical) => {
    renderAt(path)
    await vi.waitFor(() => expect(document.title).toBe(title), { timeout: 10_000 })
    expect(link(document, 'canonical')).toBe(canonical)
    expect(meta(document, 'meta[property="og:url"]')).toBe(canonical)
    expect(meta(document, 'meta[property="og:title"]')).toBe(title)
  }, 20_000)

  it('keeps the canonical to the page when a #section is in the address', async () => {
    renderAt('/faq#top')
    await vi.waitFor(() => expect(link(document, 'canonical')).toBe(`${SITE_URL}/faq`), { timeout: 10_000 })
  }, 20_000)

  it('puts the first tags back when the visitor leaves for an app page', async () => {
    const { unmount } = renderAt('/faq')
    await vi.waitFor(() => expect(link(document, 'canonical')).toBe(`${SITE_URL}/faq`), { timeout: 10_000 })
    unmount()
    expect(link(document, 'canonical')).toBe(`${SITE_URL}/`)
    expect(document.title).toBe('MmiriOma')
    expect(screen.queryByRole('heading')).toBeNull()
  }, 20_000)
})
