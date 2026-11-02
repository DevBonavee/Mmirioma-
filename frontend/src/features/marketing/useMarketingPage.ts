import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { applyPageTags, canonicalFor, restoreDefaultTags } from './seoTags'

const FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Outfit:wght@500..800&family=DM+Sans:wght@400..700&display=swap'
const APP_TITLE = 'MmiriOma'

/**
 * Shared set-up for the public pages:
 * - loads Outfit and DM Sans from Google Fonts (marketing pages only, decision
 *   Q6; offline copies in styles/fonts.css);
 * - sets the tab title, the meta description, the canonical link and the Open
 *   Graph and Twitter tags for the page (`seoTags.ts`), and puts the first
 *   values back when leaving;
 * - scrolls (smoothly, unless reduced motion is on) to `#section` after
 *   navigation, because React Router does not (e.g. "How It Works" from the
 *   FAQ page goes to `/#how`).
 */
export function useMarketingPage(title: string, description: string) {
  const { hash, pathname, key } = useLocation()

  // Add the font stylesheet once; it stays for the rest of the visit.
  useEffect(() => {
    if (document.querySelector(`link[href="${FONTS_HREF}"]`)) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = FONTS_HREF
    document.head.appendChild(link)
  }, [])

  // The canonical address is the page's own path, with no query and no #section.
  useEffect(() => {
    applyPageTags(document, { title, description, url: canonicalFor(pathname) })
    return () => restoreDefaultTags(document, APP_TITLE)
  }, [title, description, pathname])

  // Jump to the section named in the hash, or to the top for a new page.
  // `key` changes on every navigation, so tapping the same link again re-scrolls.
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
      return
    }
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth' })
  }, [hash, pathname, key])
}
