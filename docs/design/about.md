# About Us page design

<!-- Workflow: docs/process/ui-driven-development.md. Fork gates: CLAUDE.md,
"Team workflow". -->

Issue: [#338](https://github.com/mmiri-oma/mmirioma/issues/338) ·
Requirements: FR-055, PRD §3.2 (no water-quality claims) · Contract: no change
(`GET /public/contact`, [public-site.md](../api/public-site.md), already agreed)
· Visual system: [landing-v1.md](landing-v1.md) and
[design-system.md](design-system.md)
Designer: @Bonvee120 + Claude Code (text design; no visual mockup) · Status:
**proposed**. It becomes `approved` (G2) when one reviewer who is not the author
says so here. The page is built in a separate pull request that waits for that,
and for the product owner's copy (see "Copy").

A public page at `/about` that says who MmiriOma is, how delivery works and who
to contact. It is linked from the header, the footer and the sitemap. It reuses
the landing page's look, so nothing new is drawn.

## Copy

#338 says the product owner owns the copy and that no fact is invented. The
issue has no copy yet, so this design splits the page in two.

**Sections that restate what the site already says.** Every sentence in them is
copied from the live landing page, footer or contact block, so they need no new
approval of facts:

| Section | Wording | Where it already appears |
| --- | --- | --- |
| Heading and lead | "About MmiriOma", then "Water delivery for homes, offices and businesses in Enugu. Poured into your drums or tank." | Footer brand line |
| How delivery works | Order: "Pick keke or tanker, the size and your address." We bring it: "A rider collects the water and heads to you." We pour it: "Into your drums, or your ground or overhead tank." Give your code: "Share your delivery code once all the water is in." | Landing, "How MmiriOma works" |
| Who to contact | The place, the email, the phone and, when it is on, WhatsApp | Footer contact block; `GET /public/contact` |
| Closing buttons | "Order Water", and "Ask us on WhatsApp" when it is on | Landing, "Before you order" |

**Sections that wait for the owner's copy.** The page leaves a section out until
its copy is supplied and linked in a comment on #338. It never shows a
placeholder, a "coming soon" line or text written by the designer.

| Section | What the owner supplies |
| --- | --- |
| Who we are | A short mission or story, two or three sentences. Whatever is not confirmed stays out |
| Where we deliver | A statement of the areas served, or confirmation that the landing page's list stays the only place they are named. Until then the page links to the landing page's areas section, which is still labelled a sample |

The owner should also confirm that the email and phone in the contact block are
the ones to publish.

## Page

One column on a phone, a centred column of up to 720 px on a tablet and a
desktop, so lines stay readable. The header and the short footer are the ones the
FAQ page uses.

1. **Header.** The public header, with "About" marked as the current page.
2. **Intro.** The kicker "About us", the heading "About MmiriOma" and the lead
   line above.
3. **Who we are.** Only when the owner's copy exists. A section heading and the
   text, nothing else.
4. **How delivery works.** The four steps, as on the landing page, in a single
   column of cards on a phone and two columns from 640 px. No pictures are added;
   the landing page's step pictures are reused only if they sit comfortably in
   the card, which the build checks.
5. **Where we deliver.** Only when the owner's copy exists. Otherwise a single
   link, "See the areas we serve", to `/#areas`. That label is a navigation
   label, not a claim, and the link does not repeat the sample list.
6. **Who to contact.** A card with the place, the email as a link, the phone as a
   link, and a "Chat on WhatsApp" link when support WhatsApp is on. The phone and
   the WhatsApp number come from `useSupportContact`, which reads
   `GET /public/contact` (FR-055: the official number comes from one central
   configuration value), and not from a number written into the page. The email
   and the place are the contact block's. A link to the FAQ, "Read all answers" (the landing page's label),
   sits under the card.
7. **Closing.** Two buttons: "Order Water" to `/order`, and "Ask us on WhatsApp"
   when it is on. When WhatsApp is off, only "Order Water" shows, as on the
   landing page.
8. **Footer.** The short footer.

## Navigation

- **Header:** a new link, "About", after "For Drivers". Below 960 px it is in the
  menu with the others. The build checks that the header does not overflow at
  960 to 1280 px with seven links.
- **Footer:** "About" in Quick Links. The short footer shows Home, About and FAQs;
  the landing page's full footer shows every link.
- **Sitemap:** `/about` joins `frontend/public/sitemap.xml`, once #331 has
  merged. The test in `backend/tests/test_seo_files.py` that says `/about` is not
  there yet changes with it.

## States

The page is static, so it has one state.

| State | What the screen shows |
| --- | --- |
| Loaded | The page above. It needs no request, except the support contact |
| Support contact still loading | The page's contact card and closing buttons use the built-in official number and WhatsApp, which is what `useSupportContact` returns until the answer arrives; the landing page's "Before you order" section does the same |
| Support contact fails | The same built-in number, so help is always reachable. The WhatsApp link is hidden only when the server says WhatsApp support is off (`whatsapp` is `null`) |
| Unknown address | The existing 404 page; `/about` itself never shows it |
| No JavaScript | Not supported by the app; the server's `index.html` carries the landing page's tags (see [seo.md](../features/seo.md)) |

There is no loading skeleton, empty state or error state to design, because
nothing on the page can be empty or can fail on its own.

## Search tags

`useMarketingPage` sets the title "About MmiriOma | Water delivery in Enugu" and a
description that restates the lead: "MmiriOma brings water to homes, offices and
businesses in Enugu by keke or tanker. See how delivery works and who to
contact." The canonical `https://mmiriomadelivery.com/about` is set by the same
hook (#331).

## Honesty rules

Every sentence on the page is either copied from the live site (table above) or
comes from the owner's copy linked in #338. In addition:

- **No invented numbers.** No years in business, deliveries made, customers
  served, ratings or counts.
- **No water-quality claims.** Never "safe", "clean", "pure", "tested" or
  "certified" (PRD §3.2).
- **No people and no partners.** No team names, photos, titles, partner logos or
  awards, unless the owner supplies them and says they are real.
- **No promise the app does not keep.** No delivery times, no live tracking, no
  fixed prices.
- **Sample content is labelled.** The areas list stays labelled a sample until the
  pilot zone is confirmed (PRD §13.1).

## Screen-to-endpoint table

| Screen | Element / action | Endpoint | Fields used |
| --- | --- | --- | --- |
| About | Phone and WhatsApp in the contact card and the closing buttons | [`GET /public/contact`](../api/public-site.md#get-publiccontact) | `phone`, `whatsapp` |

Everything else is static.

## Decisions

1. **Restate, do not write.** The designer writes no copy. The four sections that
   exist are made of lines the site already shows.
2. **A section without copy is omitted.** A placeholder would look like a finished
   page that says nothing, and an invented line would break the honesty rules.
3. **The areas are linked, not repeated.** The list is a sample; one place to
   change it.
4. **The phone comes from the server.** FR-055 asks for one central value; the page
   does not add another copy of the number in code.

## Open questions

1. Who supplies the copy for "Who we are" and "Where we deliver", and when?
2. Are the email and the phone in the footer's contact block the ones to publish?
3. Does the owner want a "Who we are" section if no copy is ready by launch? The
   design says the page ships without it.

## Changes to the design system

None. The page reuses the landing page's kicker, section heading, cards and
buttons.
