# Public pages: landing, about, FAQ, contact, terms, privacy

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
- `/about` (#338, [design](../design/about.md)): About us. The heading and the
  footer's one-line description, "How delivery works" (the same four steps as the
  landing page, from `HOW_STEPS`), "Where we deliver" (only a link to `/#areas`),
  "Who to contact" (the place, the email, the phone and, when it is on, WhatsApp,
  from `useSupportContact`) and the closing "Order Water" and "Ask us on
  WhatsApp" buttons. Every sentence is one the site already shows. **"Who we
  are" is not on the page**: its copy has not been supplied, and the page leaves
  a section out rather than show a placeholder (the owner's reply is on #338).
  A column of up to 720 px; the short footer.
- `/contact` (#344, [design](../design/contact.md)): Contact us. The intro
  ("Contact MmiriOma" and a lead line that names only what the page offers),
  the dark "Talk to us" card (Call, Chat on WhatsApp when it is on, Email
  support, the place) and, **only while the form is switched on**, the "Send
  us a message" form, then "Read all answers" to `/faq`. One column on a phone
  with the card first; from 960 px the card takes a third and the form the
  rest. See "Contact form" below.
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
| `frontend/src/features/marketing/routes.tsx` | The six public routes |
| `Landing.tsx`, `AboutPage.tsx`, `FaqPage.tsx`, `ContactPage.tsx`, `LegalPages.tsx` | The pages |
| `ContactForm.tsx` | The Contact page's message form: fields, honeypot, every send state and the "Message received" panel |
| `frontend/src/lib/features.ts` | `CONTACT_FORM_ENABLED`, read from `VITE_CONTACT_FORM_ENABLED` at build time |
| `buttonStyles.ts` | The filled and outlined button classes the landing and About pages share, and `CARD_BUTTON` for the FAQ and Contact cards |
| `MarketingParts.tsx` | Header with mobile menu, footer, install button, picture and heading helpers |
| `frontend/src/components/brand/HomeLogo.tsx`, `logoTarget.ts` | The logo link every screen uses, and the rule for where it goes |
| `seoTags.ts` | The search and sharing tags a page sets and restores: canonical, description, Open Graph, Twitter ([seo.md](seo.md), #331) |
| `content.ts` | Copy shared by pages and tests: nav, areas, FAQs, worries (`OBJECTIONS`), `ORDER_CTA`, `filterFaqs`, `tileFill` (how high a size tile's water rises), `BRAND_LINE`, `HOW_STEPS` (the four delivery steps the landing and About pages share), `ABOUT_TITLE` and `ABOUT_DESCRIPTION`, `CONTACT_TITLE`, `CONTACT_DESCRIPTION` and `contactLead` |
| `SiteExtras.tsx` | Floating WhatsApp and Back to top buttons |
| `queries.ts`, `publicApi.ts` | The support contact (`useSupportContact`, `useWhatsappNumber`), the service areas, and the contact form (`useSendContactMessage`), each from the mock or the API |
| `frontend/src/lib/api/publicSite.ts` | Typed `getPublicContact` and `sendContactMessage` clients, with the request and receipt types |
| `frontend/src/lib/whatsapp.ts` | `wa.me` links and the fallback support number |
| `frontend/src/mocks/publicMock.ts` | Mock of docs/api/public-site.md, including the contact form's honeypot and per-phone limit |
| `icons.tsx` | The design's icons, path for path |
| `marketing.css` | Breakpoint rules for the hero and drivers backgrounds and grids, and the size tiles' water (`.mk-tile`) |
| `useMarketingPage.ts` | Fonts, title and description, scrolling to `#section` |
| `frontend/public/marketing/` | Images (WebP plus PNG/JPG) |
| `frontend/src/styles/theme.css` | `mk-*` colours and the Outfit / DM Sans font tokens |

## 4. Database models and relationships

None in the frontend. The support contact comes from backend settings
([public-contact.md](public-contact.md)). A message from the Contact page is
stored by the backend as a `support_requests` row with `source` `website`
([public-contact-form.md](public-contact-form.md)); the page keeps nothing. The
newsletter is left out of the pilot (#8): the form was removed in #57 and
nothing stores emails.

## 5. API endpoints and request/response behavior

[docs/api/public-site.md](../api/public-site.md) (**agreed**, #8):
`GET /public/contact` for the support phone and WhatsApp number, built in
#56 ([public-contact.md](public-contact.md)) and linked in #57. The
newsletter endpoint was dropped (out of the pilot). While the contact is
loading or cannot be read, the pages use the official number with WhatsApp
on (`lib/whatsapp.ts`), so help is always reachable.

`POST /public/contact` (agreed and built in #339, linked in #344) sends the
Contact page's message: `name`, `phone`, `message`, `topic` only when one is
chosen, and `website` (the honeypot, empty for a person). 201 gives
`{reference, created_at}`; the page shows the reference. Errors: 422
`validation_error` (`details` name the field), 429 `too_many_attempts`
(`details.retry_after_seconds`), 503 `service_unavailable`.

## 6. Important business rules

- No prices on public pages (prices come from the server inside the app,
  FR-022).
- No water-quality claims, no invented numbers, no promises the app does not
  keep (live tracking, choosing a delivery time). Changed lines are listed in
  landing-v1.md.
- Service areas are the real active zones (#346): a map and a list of names from
  `GET /service-zones`. The map (MapLibre GL JS, OpenFreeMap tiles; decided in
  #334) is a separate chunk loaded only when the section is near the viewport,
  and the list never depends on it. With no active zone the section says so and
  offers the call or WhatsApp link. `VITE_MAP_STYLE_URL` can point to another
  tile provider without a code change. See
  [landing-service-areas.md](../design/landing-service-areas.md).
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

### Header with eight links

The header has eight links since #344 ("Contact" after "FAQs"; "About" came in
#338). Below 1100 px (down to the 960 px where it collapses into the menu) it is
compact: the logo is `h-9`, the labels are 14 px with an 8 px gap, and the logo,
links and button are 16 px apart; from 1100 px the logo is `h-11`, the labels
15 px with a 16 px gap and 24 px between the groups; from 1180 px the label gap
is 24 px. Each label stays on one line (`whitespace-nowrap`).

With the seven-link gaps (12, 20 and 30 px), "Contact" pushed the "Order Water"
button 12 px past the header's padded edge at 961 px and left no room at 1100
and 1180 px, so the gaps were narrowed, as the design review allowed. Measured
in Chrome on 2026-11-03 on `/`, `/faq` and `/contact` at 961, 962, 980, 1000,
1099, 1100, 1179, 1180, 1280 and 1920 px: every label on one line, the button
inside the header's padded edge, and 32 to 101 px between the last link and the
button (the tightest are 32 px at 961 px and 38 px at 1100 px).

### Contact form

The form on `/contact` ([design](../design/contact.md), #344) is built but
**switched off** unless the frontend is built with
`VITE_CONTACT_FORM_ENABLED=true` (`CONTACT_FORM_ENABLED` in
`src/lib/features.ts`), in mock and real mode alike. The technical lead set four
conditions before it goes live: the honeypot test (in this build), #364 and
#365 merged (done), and the privacy notice's wording reviewed by its legal
operator, with its date set to the day the form goes live (#392, open). Off, the
page is the intro and the card only, and the lead and description drop "send a
message".

- **Fields** (contract rules, design wording): "Your name" (1 to 100
  characters), "Phone number" (a Nigerian mobile number, the sign-up check,
  hint "We answer by calling this number."), "What is it about? (optional)"
  (the app's support types, `PROBLEM_LABEL`; "Choose a topic" sends nothing,
  so the server stores `other`) and "Your message" (3 to 1,000 characters, with
  a "{n}/1000" counter). Errors show under the field, are linked with
  `aria-describedby`, and focus moves to the first field with one, for the
  page's own checks and for a server field error alike.
- **Honeypot.** A `website` input moved 10,000 px off-screen (not `display:
  none`), with `autocomplete="off"`, `tabindex="-1"` and `aria-hidden`. Its
  value is read from the input itself, so it is empty for a person.
- **Sending.** The button reads "Sending…" and is disabled, the fields are
  read-only, and a ref blocks a second submit: the contract has no idempotency
  key.
- **Sent.** The form is replaced by "Message received", whose heading takes
  focus: "Our team answers website messages by phone, on the number you gave",
  the `SR-` reference to quote, and the call and WhatsApp links. No reply time,
  no booking. "Send another message" brings back the empty form with focus on
  the name.
- **Failures keep the text.** Only a 201 clears the fields. A 422 that names a
  field shows under it; any other 422, a 429 (with the wait from
  `retry_after_seconds` in whole minutes, at least 1), being offline and a
  server error each have a banner (`role="alert"`) above the button, with the
  support number as a call link.
- **Personal data (NFR-003).** The name, phone and message are never logged,
  put in the address (`method="post"`) or stored in the browser. The mutation
  uses `gcTime: 0` and is reset after a 201, so the text leaves the query cache
  as soon as it is sent. The mock keeps its per-phone counts in memory only.

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
installed customer app opens at `/app` instead. The contact form needs no
session and sends no CSRF token unless one is already held; the backend limits
it per IP and per phone instead ([public-contact-form.md](public-contact-form.md)).

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
- The contact form's states and their wording are in "Contact form" above. A
  bot that fills the honeypot gets the same "Message received" panel with the
  server's made-up reference; nothing is stored. The mock refuses a fourth
  message from one phone within an hour with 429, as the backend does.

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
`src/features/marketing/AboutPage.test.tsx`: the heading and lead, the four steps
(and the same steps on the landing page), no "Who we are" and no placeholder, the
areas link and no area named, the contact card with the phone from the server,
WhatsApp shown and hidden, the closing buttons, no quality claim or number of its
own, the title, description and canonical, "About" in the header, the mobile
menu and both footers, the header labels on one line, and the 404 for `/about/team`.
`src/features/marketing/ContactPage.test.tsx`: the intro and lead (with and
without WhatsApp, with and without the form), the card's call, WhatsApp, email
and place, the phone from the server and the fallback, no reply time or quality
claim, the page with the form off (no form, no placeholder, its own
description), the title, description and canonical, "Contact" in the header
(current page), both footers and the mobile menu, the 404 for `/contact/team`;
and the form: labels, hint and counter, `method="post"`, each field message and
focus on the first, "Sending…" with read-only fields, the Sent panel (focus,
reference, no reply time), the topic sent only when chosen, "Send another
message", one request on a double click, the honeypot's attributes and its
empty value on a normal submit, a server field error, every banner (other 422,
offline, 503, other failure, 429 with and without a wait), the text kept and
sent again after a failure, the mock's 429, and nothing written to the console,
browser storage or the address.
`src/lib/api/publicSite.test.ts` and `src/mocks/public.test.ts` also cover
`POST /public/contact` and its mock.
To see the form locally, set `VITE_CONTACT_FORM_ENABLED=true` in
`frontend/.env.local` and restart `npm run dev`.
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
- **The contact form is off in production** until the four conditions in
  "Contact form" are met; switching it on is a rebuild with
  `VITE_CONTACT_FORM_ENABLED=true` ([hostinger.md](../deployment/hostinger.md)).
- **Honeypot and autofill are not checked in a browser with saved autofill
  data.** The contract's condition: if a browser still fills the `website`
  field despite `autocomplete="off"`, the field is renamed in a contract change.
  Check it in Chrome and Safari with a saved address before the form goes live.
- The Contact page's email link goes to the contact block's mailbox, which is
  the privacy mailbox today (review decision 5).
