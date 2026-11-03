# Search indexing: robots.txt, sitemap.xml and page metadata

Issue: #331 · Related: [public-pages.md](public-pages.md),
[hostinger.md](../deployment/hostinger.md#15-search-console)

## 1. Overview and purpose

Search engines can crawl and index the public pages: the landing page, the FAQ,
the Terms and the Privacy Notice. Before #331 the server answered
`/robots.txt` and `/sitemap.xml` with the app's `index.html`, because the files
did not exist, and the only title was set by JavaScript after the page loaded.

This feature adds the two files, puts the landing page's title, description,
canonical link and sharing tags in the HTML the server sends, and has each public
page swap in its own tags while it is shown. It adds no cookie, no tracking and
no script from another company. Visitor analytics is a separate decision (#347).

## 2. Feature workflow

```
crawler asks for /robots.txt   -> the API serves frontend/public/robots.txt from the build
crawler asks for /sitemap.xml  -> the API serves frontend/public/sitemap.xml from the build
crawler asks for /             -> index.html: title, description, canonical, Open Graph,
                                  Twitter and JSON-LD for the landing page, before any JavaScript
crawler asks for /faq, /terms  -> the same index.html; the page's own script then replaces the
                                  title, description, canonical and sharing tags
```

`backend/app/core/frontend.py` already sent any existing file in the build
before falling back to `index.html`, so no server change was needed. Vite copies
everything in `frontend/public/` into the build.

## 3. Important files

| File | Responsibility |
| --- | --- |
| `frontend/public/robots.txt` | What crawlers may read, and the sitemap address |
| `frontend/public/sitemap.xml` | The public pages, as absolute URLs on the production domain |
| `frontend/index.html` | The landing page's title, description, canonical, Open Graph and Twitter tags, and the `LocalBusiness` JSON-LD |
| `frontend/src/features/marketing/seoTags.ts` | `canonicalFor`, `applyPageTags`, `restoreDefaultTags`: what a public page puts in the head and how it is put back |
| `frontend/src/features/marketing/useMarketingPage.ts` | Calls them for the page being shown |
| `backend/tests/test_seo_files.py` | Reads the real files and serves them through `mount_frontend` |
| `frontend/src/features/marketing/seoTags.test.tsx` | Reads the real `index.html`; checks each public page's tags |

## 4. Database models and relationships

None.

## 5. API endpoints and request/response behavior

No new endpoint. Two static files, answered by the server that serves the app:

| Path | Answer |
| --- | --- |
| `GET` or `HEAD /robots.txt` | 200 `text/plain`, `Cache-Control: no-cache` |
| `GET` or `HEAD /sitemap.xml` | 200 `text/xml`, `Cache-Control: no-cache` |

`/api/...` paths that match no route still answer with the JSON 404 envelope.

## 6. Important business rules

- **`robots.txt` asks crawlers to stay out of** `/admin`, `/partner`, `/api`,
  `/order` (which also covers `/orders`), the signed-in customer pages (`/home`,
  `/menu`, `/addresses`, `/notifications`, `/profile`, `/settings`, `/points`,
  `/support`, `/verify-phone`), the sign-in pages (`/signin`, `/signup`,
  `/forgot-password`) and the installed app's start address `/app`. Everything
  else is open. `/app` is written as `/app$` and `/app/`, so
  `/apple-touch-icon.png` is not caught by the prefix.
- **`/partner/signup`, the page for new drivers, is blocked with the rest of
  `/partner`**, as #331 asked. Say so if it should be found by search.
- **The sitemap lists only public pages**: `/`, `/about`, `/faq`, `/contact`
  (#344), `/terms` and `/privacy`. There is no
  `lastmod`, `changefreq` or `priority`, since nothing here knows when a page
  last changed.
- **Every address is absolute on `https://mmiriomadelivery.com`.** It is written
  into `index.html`, `robots.txt`, `sitemap.xml` and `seoTags.ts` (`SITE_URL`).
  If the domain changes, change all four; the tests name the domain, so they fail
  until they agree.
- **JSON-LD says only what the team confirmed**: the name, the site, and the city
  served (Enugu, Nigeria). It has no phone, because FR-055 says the official
  support number comes from one central configuration value and a static file
  cannot read it; a copy there would be one more place to change. It also has no
  email, opening hours, street address, coordinates, rating, price range or
  social links. A test fails if `telephone` comes back.
- **A public page's canonical is its own path**, with no query and no `#section`
  and no trailing slash. When the page goes away the first values come back.
- **`robots.txt` is a request, not protection.** The blocked pages are still
  reachable; sign-in protects them (SRS FR-001).

## 7. Authentication and authorization requirements

None. The two files and the landing page are public by design. No private page is
listed or described anywhere in them.

## 8. Error handling and edge cases

| Case | Result |
| --- | --- |
| The build lacks `robots.txt` or `sitemap.xml` | The server answers with `index.html`; `test_seo_files.py` serves the real files and fails if that happens |
| A private path is missing from `robots.txt`, or the sitemap lists one | `test_seo_files.py` fails |
| The landing page loses its canonical, title or Open Graph tags | `seoTags.test.tsx` fails (it reads the real `index.html`) |
| A crawler that does not run JavaScript asks for `/faq` | It gets the landing page's tags (see the limitation below) |
| A head tag is missing in `index.html` | `applyPageTags` skips that tag and does not fail |

## 9. Testing instructions

```bash
cd backend && source .venv/bin/activate && pytest tests/test_seo_files.py
cd frontend && npm test -- src/features/marketing/seoTags.test.tsx
```

`test_seo_files.py` (33 tests): the three private paths and the customer and
account paths are in `robots.txt`; the public pages and the files a crawler needs
are not blocked; `/orders` is caught by the `/order` prefix; `/app` is blocked
but `/apple-touch-icon.png` is not; the sitemap lists the six public pages, all
absolute, none blocked, no `lastmod`; the server sends both files as files with
the right content type, `no-cache`, and `HEAD`.

`seoTags.test.tsx` (17 tests): the real `index.html` has the title, description,
canonical, Open Graph, Twitter tags and an absolute share image, and valid
`LocalBusiness` JSON-LD with no unconfirmed field; `canonicalFor`; the tags change
and are restored; each public page shows its own title and canonical.

Check the built app, not the dev server:

```bash
cd frontend && npm run build
cd ../backend && FRONTEND_DIST_DIR=../frontend/dist .venv/bin/python -m uvicorn app.main:app --port 8001
curl -i http://127.0.0.1:8001/robots.txt     # 200 text/plain, the file
curl -i http://127.0.0.1:8001/sitemap.xml    # 200 text/xml, the file
curl -s http://127.0.0.1:8001/ | grep -E "<title>|canonical|og:title|ld\+json"
```

On 2026-11-02 this showed both files as real text and XML, and the landing
page's tags in the raw HTML. Nothing has been checked against Google itself yet.

## 10. Known limitations

- **Other public pages carry the landing page's tags in their raw HTML.** The
  server sends one `index.html` for every path, so a crawler that does not run
  JavaScript sees the landing page's canonical on `/faq`, `/terms` and
  `/privacy`. Google runs JavaScript and reads the page's own tags, but it may
  weigh the two. **Proposal for the technical lead, not built:** give each public
  path its own head in the served HTML, either by having `mount_frontend` fill a
  placeholder in `index.html` from one list of titles and descriptions, or by
  writing one small HTML file per public path at build time. Both need one shared
  list so the page and the server never disagree. Neither adds a library.
- **The share image is `hero-scene.jpg` (2202 x 969)**, wider than the usual
  1.91:1 ratio, so link previews will crop it. A purpose-made 1200 x 630 image
  from the team would be better.
- **The tab title on a first load of an app page** (sign-in, admin) is the
  landing page's title, because it is in the HTML the server sends. Leaving a
  public page sets it back to "MmiriOma".
- **No result is claimed from Google.** Verifying the domain and submitting the
  sitemap are steps for a person with the Hostinger and Google accounts; see the
  guide.
