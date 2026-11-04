# Landing handoff v1 (public pages)

Status: approved by @chidimmamogbo for this fork on 2026-10-19 ("use the
landing page design I added").

Source: `design/MmiriOma-landing-handoff/` (version 1.0, 19 Oct 2026), kept
locally and git-ignored like the app handoff. Start with its `README.md`;
`screens-png/` is the visual source of truth, `screens-html/` gives exact
sizes. It sits beside [handoff-v1.md](handoff-v1.md) and does not replace it.

## Pages

| Page | Route | Built in |
| --- | --- | --- |
| Landing | `/` | `frontend/src/features/marketing/Landing.tsx` |
| FAQ | `/faq` | `FaqPage.tsx` |
| Terms of Service | `/terms` | `LegalPages.tsx` (replaces the old placeholder `InfoPage`) |
| Privacy Policy | `/privacy` | `LegalPages.tsx` |

## Decisions (2026-10-19)

Grilling rounds 1 and 2 on the PWA and the landing page. Round 1 answers:

| # | Topic | Answer |
| --- | --- | --- |
| Q1 | One or two installable apps | Two: "MmiriOma" (customers) and "MmiriOma Partner" (riders and drivers). The customer app gets a "Register as a driver? Click here" link |
| Q2 | Offline | App shell offline only; data needs the network; an "offline" notice shows. No cached data, no queued actions |
| Q3 | What "Download" does | Android/desktop Chrome and Edge: the browser's install prompt. iPhone: a how-to sheet. Hidden when installed |
| Q4 | Landing page and signed-in people | Superseded by round 2 Q1 |
| Q5 | Header buttons | Yes to all; sign-ins stay valid for 7 days |
| Q6, Q7 | Sections and design | Use this landing handoff |
| Q8 | In-app install buttons | A dismissable card on the customer and partner homes (back after a week) and an "Install the app" menu row; none for admin |
| Q9 | Push | Push notifications now, plus in-app notifications |

Round 2 (all recommendations accepted):

| # | Topic | Answer |
| --- | --- | --- |
| 1 | `/` for signed-in people | `/` is always the landing page; the installed customer app opens at `/app` |
| 2 | Two Install buttons on one page | "Install Customer App" prompts on the landing page; "Install Driver App" opens `/partner/login` (partner manifest) where the install card is. Partner pages live under `/partner/` |
| 3 | Quality claims in the copy | Reworded (see below) |
| 4 | "Our Partners" strip | Dropped until real partnerships are agreed |
| 5 | Service areas | The design's list, labelled as a sample until the pilot zone is confirmed. **Replaced in #346** by the real active zones on a map ([landing-service-areas.md](landing-service-areas.md)); the sample list and its wording are gone |
| 6 | Fonts | Outfit and DM Sans on the four public pages only, Google Fonts with offline copies |
| 7 | Service-worker tool | `vite-plugin-pwa` 1.3.0 (dev dependency), `injectManifest` mode with our own worker |
| 8 | Partner app name and icon | "MmiriOma Partner", short name "MO Partner"; same drop icon as the customer app (web-ready-logos) |
| 9 | Push scope | Frontend, proposed contract ([push.md](../api/push.md)) and mock delivery now; backend later, with approval |
| 10 | Which events push | Customer: rider assigned, on the way, delivered, payment confirmed. Partner: assigned by admin, payout. "New order near you" opt-in, off by default |
| 11 | 7-day sign-in | 7 days from sign-in (the API's rule); mock sign-in kept in localStorage |
| 12 | "Register as a driver" | Under customer sign-in and sign-up, and a customer menu row, all to `/partner/signup` |
| 13 | Paystack and refunds-as-points copy | Kept; listed under open items |
| 14 | Order of work | Public pages and PWA first, then Phase 6 (admin) |

## Differences from the design

Copy (honesty rules: no quality claims, no promises the app does not keep):

- Hero kicker "CLEAN WATER. HEALTHY LIVING." → "WATER AT YOUR GATE."
- Hero lead "Safe, clean and reliable water delivery…" → "Reliable water
  delivery for your home, office and business."
- Badge "Clean & Safe Water" → "Delivered & poured for you".
- "Getting clean water is easy." → "Getting water delivered is easy."
- Drivers: "a fast-growing service that brings clean water to thousands of
  homes and businesses" → "a growing service that brings water to homes and
  businesses".
- Footer: "provides clean, safe and reliable water delivery…" → "delivers
  water to homes, offices and businesses across Enugu"; bottom line "Clean
  Water. Healthy Living." → "Water at your gate."
- Service areas: "We currently deliver to the following areas" → "Areas we
  plan to serve in Enugu and nearby. Sample list: our first service zone is
  still being confirmed."
- FAQs: "sealed cans" → "our cans"; "Can I schedule a delivery?" removed (the
  app has no date or time choice yet), replaced on the landing page by "Can I
  order a custom tanker quantity?"; "track your rider live" → "The app shows
  each step of your delivery, and an arrival time once your rider has one"
  (no live GPS, FR-037); areas answer says the list is a sample; "keep our
  cans and tankers clean and sealed" removed; "in one tap" → "with the
  Install button (on iPhone: Share, then Add to Home Screen)".
- Terms §3 "sealed cans" → "our cans"; Terms §8 drops "keep our cans and
  tankers clean and sealed for every trip".

Layout and behaviour:

- "Our Partners" strip and the four social icons are hidden (README open
  items). "Staff Login" is shown since Phase 6 added `/admin/login`.
- "Order Water" goes to `/order` and "Become a Rider or Driver" to
  `/partner/signup` (README link map; the static HTML used `#options` and
  `#download`).
- "Contact Us" under service areas opened `/support/contact`; since
  2026-10-21 it is "Check your area on WhatsApp" (see the owner's update).
- Install buttons: see decision 2 above; running as the installed app they
  read "Open app".
- The current page's nav link is primary blue and bold (README), not ink as
  in the static HTML.
- Logos come from `public/brand` (README says to prefer those files).
- Button blue is the app's `--color-primary` #1570D8, not #0F6BDE (tokens
  file).

## Owner's site update (2026-10-21)

Requested by the owner, after the design was approved; recorded here because
it changes the approved screens. Copy brief: benefits before features, write
for someone skimming, talk to one buyer ("you"), short lines, no generic
openers or slogan formulas, a sales-ready first screen, headlines backed by
the text under them, buttons that say verb plus outcome, worries answered
before the closing button, no em dashes.

Structure of `/` now: hero → **benefits** (new) → how it works → Keke and
Tanker → for drivers → install → areas and FAQs → **"Before you order"**
(new: four worries and the closing buttons) → **newsletter** (new) → footer.

Copy changes (the honesty rules above still hold; every new line restates
something the app does):

- Hero: kicker "Water delivery in Enugu"; lead "Order on your phone. We bring
  the water by keke or tanker and pour it into your drums or tank."; badges
  "Poured into your drums or tank", "Full price before you confirm", "Done
  only when you give your code" (replaces the unprovable "Fast & Reliable
  Delivery").
- Order buttons keep "Order Water" and the driver button keeps "Become a
  Rider or Driver" (the owner tried "Get water delivered" and "Apply to
  deliver", then chose the original labels); "Install App" → "Install the app";
  "View All FAQs" → "Read all answers"; "Contact Us" under areas → "Check your
  area on WhatsApp".
- Benefits: no more carrying water; poured in for you; no price surprises
  (the order keeps its quote, FR-024); you confirm the delivery (code).
- How it works: kicker "How it works" (was "Simple • Fast • Convenient"),
  steps Order / We bring it / We pour it / Give your code, one line each;
  "It's that simple!" removed.
- Options: "Pick the size that fits" with a one-line lead (was "Whether
  you need… we've got you covered").
- Drivers: "Deliver water. Get paid per trip." (was "earn every day"); badges
  "Pay for every delivery", "Keke or tanker", "Go online when you choose".
- Install: "Put MmiriOma on your phone".
- Worries (content.ts `OBJECTIONS`): less water than paid for, price change,
  not at home, area covered. "Not at home" moved here from the landing FAQ.
- FAQ page: shorter lead; help card offers WhatsApp and email; driver card
  "Want to deliver with us?" with "Become a Rider or Driver".
- 404 page redesigned (logo, 404, one line, the most useful next step for
  that part of the site, home, WhatsApp).

Behaviour added: sticky header on the public pages, floating "Chat on
WhatsApp" button and "Back to top" (after one screen of scrolling),
newsletter form (docs/api/public-site.md, proposed), hover states on every
button, centred button labels, filter pills changed to rounded rectangles
(10 px) across the apps.

## Size tiles fill with water (2026-11-02, #330)

Requested by the owner in #330, after the design was approved; recorded here
because it adds an interaction to an approved screen. The layout, copy and sizes
in "Pick the size that fits" do not change, and there are no prices or claims
(FR-022).

Each size tile (Keke 12, 24, 30, 60 gallons; tanker 500, 750, 1,000, Custom)
fills with water when hovered, focused with the keyboard, or tapped. The water
rises from the bottom of the tile to a height in proportion to the size within
its group (size divided by the largest size, so 12 is the lowest and 60 the
highest; Custom fills fully). It ends when the pointer leaves or focus moves
away; a second tap on a touch screen also ends it. Under reduced motion the
water appears at once, without animation. The size stays in ink and the unit
text turns ink over the water, for contrast. The fill is a picture of the size,
not a quantity claim or a recommendation.

Approved on 2026-11-02 by @nnamdi-security, who is not the author: the note
records what was built and matches the owner's request in #330.

## Hero buttons and logo links (2026-11-02, #337)

Requested by the owner in #337, after the design was approved; recorded here
because it changes the hero of an approved screen. Status: **approved** (G2) on
2026-11-02 by @nnamdi-security, who is not the author, with the decisions below.
The code for it is a separate pull request.

**Review decisions (recommendation and approval, 2026-11-02):**

1. **Hero labels stay "Order water" and "Become a partner".** The owner chose
   these in #337, after the 2026-10-21 labels, so the later request wins for
   the hero. The header and closing section keep their labels for now; the owner
   can align them in a later change.
2. **The partner app's logo goes to `/partner/`, not `/`.** The installed
   partner app has the scope `/partner/` (`partner.webmanifest`), so `/` would
   leave it. This is a deliberate exception to #337's "every logo links to `/`";
   read that Done-when item as "every logo links to its app's home".
3. **No install link is added to the header.** It has none today (`NAV_LINKS`),
   and #337's wording "and the header" does not match the code. Install stays in
   "Put MmiriOma on your phone".

### Hero

The hero shows exactly two buttons:

- **Order water**, the filled button, goes to `/order`.
- **Become a partner**, the outlined button, goes to `/partner/signup`.

"Install the app" leaves the hero. It stays in its own section, "Put MmiriOma on
your phone" (`#download`), which has the customer and driver install buttons.
The header has no install link today and none is added.

The hero uses these two labels as written in #337. Every other order and driver
button on the site keeps the owner's labels from 2026-10-21, "Order Water" and
"Become a Rider or Driver", so the hero reads slightly differently from the
header and the closing section. If the team wants them to match, change the
hero's labels here, not the others.

The badges under the buttons, the headline and the picture do not change.

### Logo links

Every MmiriOma logo that identifies a screen is a link to the public homepage
`/`, with the accessible name "MmiriOma, home". One shared component draws it, so
a new screen cannot forget it.

| Where | Goes to |
| --- | --- |
| Public pages, header and footer | `/` |
| Customer app: top bars, sign-in, receipt | `/` |
| Admin: header, menu drawer, staff sign-in | `/` (the logo used to open `/admin`; the dashboard stays one click away in the sidebar) |
| Partner app: top bars, sign-in | `/partner/` |
| 404 page | `/` |

The partner app is the exception. It installs with the scope `/partner/`, so a
link to `/` would open outside the installed app. Its logo goes to `/partner/`,
which is the partner's own home when signed in and the sign-in page when not.

The logo marks inside the "Delivered" celebration circle and beside the "Create
your account" heading are illustrations, not screen logos. They stay as they are,
with no link and no name.

### Leaving an unfinished order

On the order steps (type, quantity, delivery details, save address, review) the
customer may have typed things the app has not sent yet. When the logo, or any
other link to a page outside the order, is used while the draft differs from a
fresh one, a dialog asks first:

- Title: **Leave this order?**
- Text: "What you entered is kept on this device for now, but it is not placed."
- Buttons: **Stay** (default focus) and **Leave**.

The dialog does not show on an order that was placed, and does not show when the
draft is still untouched. A browser refresh or closing the tab is not covered:
the draft already survives a reload (it is kept in the browser's session storage).

### Admin and the installed rider app

- Admin: the logo leaves the admin area for the public site. Values typed into
  an admin form are lost when the page changes, as they already are with any link
  in the sidebar; no prompt is added for admin pages.
- Rider app: handled by the `/partner/` rule above. A link that must go to the
  public site, such as Terms or the privacy notice, is not changed here.

### Phone, tablet and desktop

The landing page is checked at 360, 768, 1280 and 1920 px. Any horizontal scroll
or cramped section found is fixed in the code pull request and listed there.
The check found no horizontal scroll at any of the four widths. At 360 px the
tanker "1,000" and "Custom" labels were wider than their 41 px tiles, so below
420 px they use a smaller size (14 px and 12 px). The
service areas list kept its "sample" wording until #346 replaced it with the real zones.

## Open items

- **Legal review.** Terms: no cash refunds (points instead), liability and the
  FCCPA line. Privacy: it mentions riders' live location being shown to
  customers, which the app does not do (FR-037); fine as a disclosure, but
  check it. Paystack is named as the payment processor in the FAQ, Terms and
  Privacy.
- **Service areas** were a sample until #346; they now come from the active service zones (PRD §13.1: the pilot zone is whatever the administrator switches on).
- **Icons** (2026-10-20): the official set from `web-ready-logos/` is in
  `frontend/public` (favicons, app icons, logos). Both apps use the same drop
  icon; the pack's icons keep the drop inside the safe zone, so the manifests
  list them as `any` and `maskable`. A separate partner icon is still possible
  later (same sizes).
- **Social links** and real partner logos.
- **Image sharpness**: the pictures were cut from a 734 px mockup and
  upscaled; swap in originals with the same file names.

## Owner's step-photo update (2026-11-04)

The owner supplied "MmiriOma Motorcycle Water Delivery Guide.png" and a mobile
screenshot of the existing icons, requesting realistic imagery that fits the
same website section. The "How MmiriOma works" cards now use photo portions
of that supplied guide. The source is retained unchanged at
`frontend/public/marketing/how-it-works-guide.png`; CSS clips photo windows
without displaying the guide's outer header or printed step instructions.

The existing four delivery steps, copy, numbered circles, desktop arrows and
grid breakpoints remain. The phone photo serves the Order and Give your code
cards. Each card has a full-width photo above its HTML instructions, with a
reserved aspect ratio and rounded top corners. The artwork's three-step copy,
25-litre labels and water-quality claims do not replace the website's business
rules or approved HTML copy. See [implementation notes](../features/public-pages.md#how-it-works-photography-4-november-2026).
