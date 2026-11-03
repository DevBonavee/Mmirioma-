# Public pages: landing, FAQ, terms, privacy

Status: built (2026-10-19) from `design/MmiriOma-landing-handoff`. Design
record and differences: [docs/design/landing-v1.md](../design/landing-v1.md).

## 1. Overview and purpose

The public website in front of the apps: what MmiriOma does, delivery
options, how to become a rider or driver, how to install the apps, FAQs and
the legal pages. Anyone can open them, signed in or not.

## 2. Feature workflow

- `/`: hero → benefits → how it works → Keke and Tanker options (sizes, no
  prices) → for drivers (approval steps) → install the apps → service areas
  and FAQs → "Before you order" (worries, closing buttons) → footer. Header links jump to sections; below 960 px they move into a menu.
  The header stays stuck to the top while scrolling.
- The size tiles in "Pick the size that fits" (Keke 12, 24, 30 and 60 gallons;
  tanker 500, 750, 1,000 and Custom) fill with water on hover, on keyboard focus
  and on a tap (#330). The fill is only a picture of the size, not a price, a
  quantity claim or a recommendation. See "Size tiles" below.
- "Order Water" → `/order` (sign-in first when signed out).
- "Become a Rider or Driver" → `/partner/signup`.
- The hero has exactly two buttons, "Order water" (→ `/order`) and "Become a
  partner" (→ `/partner/signup`), as #337 asked. The header and the closing
  section keep "Order Water" and "Become a Rider or Driver". "Install the app"
  is only in the "Put MmiriOma on your phone" section; the header has no
  install link.
- Every screen logo is a link home named "MmiriOma, home", drawn by one
  component, `HomeLogo` (#337): to `/`, or to `/partner/` inside the partner app
  so the installed app keeps its scope. See "Logo links" below.
- Every public page has a floating "Chat on WhatsApp" button (bottom right;
  icon only below 640 px; hidden while WhatsApp support is off) and, after 600 px of scrolling, "Back to top" above
  it. Back to top scrolls up (instantly under reduced motion) and moves focus
  to the logo link.
- Unknown addresses show the 404 page (`src/app/NotFound.tsx`): the next step
  depends on where the link pointed (`/partner/...` → driver app, `/admin/...`
  → dashboard, otherwise "Order Water"), plus home and WhatsApp (or the
  support phone while WhatsApp is off).
- "Install Customer App" / "Install Driver App": see [pwa.md](pwa.md).
- `/faq`: search box and category buttons over 17 questions; counts follow
  the search; "Clear search" resets both.
- `/terms`, `/privacy`: "On this page" links to each section; `/privacy#cookies`
  jumps to section 13. `/privacy` is the website copy of `PRIVACY_NOTICE.md`
  (version 2.0, #93, #104), section by section; change both together.

## 3. Important files

| Path | Responsibility |
| --- | --- |
| `frontend/src/features/marketing/routes.tsx` | The four public routes |
| `Landing.tsx`, `FaqPage.tsx`, `LegalPages.tsx` | The pages |
| `MarketingParts.tsx` | Header with mobile menu, footer, install button, picture and heading helpers |
| `frontend/src/components/brand/HomeLogo.tsx`, `logoTarget.ts` | The logo link every screen uses, and the rule for where it goes |
| `seoTags.ts` | The search and sharing tags a page sets and restores: canonical, description, Open Graph, Twitter ([seo.md](seo.md), #331) |
| `content.ts` | Copy shared by pages and tests: nav, areas, FAQs, worries (`OBJECTIONS`), `ORDER_CTA`, `filterFaqs`, `tileFill` (how high a size tile's water rises) |
| `SiteExtras.tsx` | Floating WhatsApp and Back to top buttons |
| `queries.ts`, `publicApi.ts` | The support contact: `useSupportContact`, `useWhatsappNumber` (mock or `GET /public/contact`) |
| `frontend/src/lib/api/publicSite.ts` | Typed `getPublicContact` client |
| `frontend/src/lib/whatsapp.ts` | `wa.me` links and the fallback support number |
| `frontend/src/mocks/publicMock.ts` | Mock of docs/api/public-site.md |
| `icons.tsx` | The design's icons, path for path |
| `marketing.css` | Breakpoint rules for the hero and drivers backgrounds and grids, and the size tiles' water (`.mk-tile`) |
| `useMarketingPage.ts` | Fonts, title and description, scrolling to `#section` |
| `frontend/public/marketing/` | Images (WebP plus PNG/JPG) |
| `frontend/src/styles/theme.css` | `mk-*` colours and the Outfit / DM Sans font tokens |

## 4. Database models and relationships

None. The support contact comes from backend settings
([public-contact.md](public-contact.md)). The newsletter is left out of the
pilot (#8): the form was removed in #57 and nothing stores emails.

## 5. API endpoints and request/response behavior

[docs/api/public-site.md](../api/public-site.md) (**agreed**, #8):
`GET /public/contact` for the support phone and WhatsApp number, built in
#56 ([public-contact.md](public-contact.md)) and linked in #57. The
newsletter endpoint was dropped (out of the pilot). While the contact is
loading or cannot be read, the pages use the official number with WhatsApp
on (`lib/whatsapp.ts`), so help is always reachable.

## 6. Important business rules

- No prices on public pages (prices come from the server inside the app,
  FR-022).
- No water-quality claims, no invented numbers, no promises the app does not
  keep (live tracking, choosing a delivery time). Changed lines are listed in
  landing-v1.md.
- Service areas are a sample list until the pilot zone is confirmed.
- The Terms and the FAQ describe the pilot as it works (#107): cash on
  delivery after unloading (F4), the window agreed on the confirmation call
  (F3), no cancellation or redelivery charge (F5), refunds reviewed and paid
  outside the app (F7), the delivery code by SMS after unloading (FR-035),
  48 hours for an ordinary dispute (FR-036), no points and no partner pay
  in the app. The Terms' contact is the privacy notice's (phone and email).
- Support contact (FR-055): the backend's `SUPPORT_PHONE` and
  `SUPPORT_WHATSAPP_ENABLED`, never an admin screen. With `whatsapp: null`,
  every WhatsApp button is hidden and the 404 page, FAQ, landing page and
  Contact us offer the phone instead.

### Logo links

Every logo that identifies a screen is wrapped in `HomeLogo` (#337,
`docs/design/landing-v1.md` "Logo links"). The link is named "MmiriOma, home" and
is at least 44 px tall. Where it goes:

| Where | Goes to |
| --- | --- |
| Public pages (header, footer), 404, customer app, sign-in pages | `/` |
| Admin header, menu drawer and staff sign-in | `/` (it used to open `/admin`; the dashboard is in the sidebar) |
| Partner app (any path under `/partner`) | `/partner/`, so the installed app stays inside its scope `/partner/` |

Not links: the logo marks beside the "Create your account" heading and in the
"Delivered" circle. They are illustrations with no name.

A test in `src/app/logoLinks.test.tsx` renders each shell, and scans the source
for a `<Logo>` or `<BrandLogo>` outside `<HomeLogo>`, so a new screen that
forgets the link fails the tests.

### Size tiles

How the water in a tile behaves (#330, `Landing.tsx` `SizeTile`, `marketing.css` `.mk-tile`):

- **Height.** A tile's size divided by the largest size in its group: Keke 20%,
  40%, 50% and 100%; tanker 50%, 75% and 100%, with Custom full. The 60 and
  1,000 tiles are therefore also full. Set by `tileFill` in `content.ts`.
- **Motion.** The water is a full-height layer that rises with `transform:
  scaleY()` from the bottom, so only `transform` animates (the rule in
  `styles/motion.css`). The tile is not clipped; a separate wrapper clips the
  water to the rounded corners.
- **Triggers.** Hover (only on devices that have it, so a tap does not leave a
  stuck hover), keyboard focus (`:focus-visible`), and a tap on a touch or pen
  screen, which toggles the fill through `data-filled`; moving focus away ends
  it. A mouse click needs no script. There are no timers.
- **Reduced motion.** The water still appears on hover, focus or tap, but at
  once, with no transition.
- **Accessibility.** Each tile is a focusable `role="group"` named for its text
  ("12 Gallons", "Custom Size").
- **Contrast.** The muted unit text is 4.21:1 on the water, so it turns to ink
  (11.3:1) when the water is up. The size is ink all the time.

## 7. Authentication and authorization

Public. `/` never redirects signed-in people (it is the page we share); the
installed customer app opens at `/app` instead.

## 8. Error handling and edge cases

- The FAQ shows an empty state with "Clear search" when nothing matches.
- Fonts fall back to the bundled offline copies if Google Fonts fails.
- Images have fixed sizes (no layout shift) and load lazily below the hero.
- The mobile menu closes on a link, Escape or any navigation, and the page
  behind it does not scroll while it is open; it scrolls itself when taller
  than the screen.
- Page wrappers use `overflow-x: clip`, not `hidden`: `hidden` makes the
  wrapper a scroll container and the sticky header would stop sticking.
  Hash links stop 92 px down, below the header.

## 9. Testing instructions

```bash
cd frontend
npm test
```

`src/features/marketing/marketing.test.tsx`: FAQ filter and counts, copy
checks (FAQs and worries, including no Paystack, points or payouts), FAQ empty state and Clear search, mobile menu, `/`
with its order and apply links, section order (benefits before how it
works; worries last, no newsletter), the WhatsApp button link, the 404 page
and its driver-app variant, `/app` still redirecting.
`src/app/logoLinks.test.tsx`: the logo link on each shell (public pages,
Terms, FAQ, 404, three sign-in pages, customer top bar, receipt, admin header,
partner top bar), the hero's two buttons, install in its own section, and the
scan for a logo outside `HomeLogo`. `src/components/brand/HomeLogo.test.tsx`: where a logo goes
and its name. `src/features/customer/order/leaveOrder.test.tsx`: the draft check,
which moves ask "Leave this order?", Stay and Leave, and no prompt for an
untouched draft, a move between steps, or a placed order.
`src/features/marketing/sizeTiles.test.tsx`: `tileFill` for each group, each
tile's accessible name and fill, the tap toggling the fill with no timers left
running, and the stylesheet rules (transform only, hover only where a device has
it, no transition under reduced motion, text contrast over the water).
`src/features/marketing/termsPage.test.tsx`: none of the old Terms
promises, the pilot rules, and the notice's contact.
`src/features/marketing/supportContact.test.tsx`: WhatsApp hidden and the
phone offered while it is off, shown when on, Contact us with the real
number. `src/lib/api/publicSite.test.ts`: the client with the contract
example, `null` WhatsApp and 429. `src/mocks/public.test.ts`: wa.me links
and the mock contact. Manual: compare with
`screens-png/` at 390, 768, 1024 and 1440 px.

## 10. Known limitations

- At 360 px the tiles are 41 px wide, so the tanker "1,000" and "Custom" labels
  use a smaller size below 420 px to fit (#337). Between 420 and 960 px they fit
  at full size.
- Each tile is a keyboard stop, so the section adds eight tab stops.

- The Terms are reviewed by the legal operator (@nnamdi-security) on #107's
  PR before launch; the 18+ age rule and the keke cans wording come from the
  handoff, not the SRS.
- Social links and real partner logos are hidden until they exist. The footer's "Staff Login" opens `/admin/login`.
- The public pages ship in the main bundle (about 113 kB gzipped) so a shared
  link opens at once; every app page loads as its own chunk.
- The Privacy page is a hand-made copy of `PRIVACY_NOTICE.md`
  (`LegalPages.tsx`), so both change together.
