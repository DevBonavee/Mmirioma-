/**
 * The search and sharing tags a public page changes in the document head
 * (docs/features/seo.md, #331).
 *
 * `index.html` carries the landing page's tags, and the server sends that same
 * file for every path. A page therefore replaces the canonical link, the
 * description and the Open Graph and Twitter title, description and URL while it
 * is shown, and puts the first values back when it goes. Google renders
 * JavaScript, so it reads the page's own tags after this runs.
 */

/** The production origin. Canonical and sitemap URLs are absolute on it. */
export const SITE_URL = 'https://mmiriomadelivery.com'

/** What a page says about itself. */
export interface PageTags {
  title: string
  description: string
  /** The page's canonical address, e.g. `https://mmiriomadelivery.com/faq`. */
  url: string
}

/**
 * The canonical address of a public page.
 *
 * Only the path counts: the query and the `#section` are dropped, so every way
 * of reaching a page names one address. A trailing slash is dropped too, except
 * for the homepage.
 *
 * @param pathname - The router's path, e.g. `/faq` or `/faq/`.
 * @returns An absolute URL on the production domain.
 */
export function canonicalFor(pathname: string): string {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

type Selector = { selector: string; attribute: 'content' | 'href' }

const DESCRIPTION: Selector = { selector: 'meta[name="description"]', attribute: 'content' }
const CANONICAL: Selector = { selector: 'link[rel="canonical"]', attribute: 'href' }
const SHARE_TITLES: Selector[] = [
  { selector: 'meta[property="og:title"]', attribute: 'content' },
  { selector: 'meta[name="twitter:title"]', attribute: 'content' },
]
const SHARE_DESCRIPTIONS: Selector[] = [
  { selector: 'meta[property="og:description"]', attribute: 'content' },
  { selector: 'meta[name="twitter:description"]', attribute: 'content' },
]
const SHARE_URL: Selector = { selector: 'meta[property="og:url"]', attribute: 'content' }

const ALL = [DESCRIPTION, CANONICAL, ...SHARE_TITLES, ...SHARE_DESCRIPTIONS, SHARE_URL]

/** The values `index.html` shipped with, read once before the first change. */
let original: Map<string, string | null> | null = null

function read(doc: Document, { selector, attribute }: Selector): string | null {
  return doc.querySelector(selector)?.getAttribute(attribute) ?? null
}

function write(doc: Document, { selector, attribute }: Selector, value: string): void {
  doc.querySelector(selector)?.setAttribute(attribute, value)
}

function remember(doc: Document): void {
  original ??= new Map(ALL.map((s) => [s.selector, read(doc, s)]))
}

/**
 * Show a page's search and sharing tags: the title, the description, the
 * canonical link, and the Open Graph and Twitter title, description and URL.
 * A tag that `index.html` does not have is left alone.
 *
 * @param doc - The document whose head changes.
 * @param tags - The page's title, description and canonical address.
 */
export function applyPageTags(doc: Document, tags: PageTags): void {
  remember(doc)
  doc.title = tags.title
  write(doc, DESCRIPTION, tags.description)
  write(doc, CANONICAL, tags.url)
  write(doc, SHARE_URL, tags.url)
  for (const s of SHARE_TITLES) write(doc, s, tags.title)
  for (const s of SHARE_DESCRIPTIONS) write(doc, s, tags.description)
}

/**
 * Put back the tags `index.html` shipped with, when a public page goes away.
 * The tab title goes back to the app's name, as it did before #331.
 *
 * @param doc - The document whose head changes.
 * @param appTitle - The title to leave in the tab.
 */
export function restoreDefaultTags(doc: Document, appTitle: string): void {
  doc.title = appTitle
  if (!original) return
  for (const s of ALL) {
    const value = original.get(s.selector)
    if (value !== null && value !== undefined) write(doc, s, value)
  }
}

/** Forget the remembered values; for tests that load a fresh `index.html`. */
export function forgetOriginalTags(): void {
  original = null
}
