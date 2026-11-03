# Contact Us page design

<!-- Workflow: docs/process/ui-driven-development.md. Fork gates: CLAUDE.md,
"Team workflow". -->

Issue: [#344](https://github.com/mmiri-oma/mmirioma/issues/344) ·
Requirements: FR-055, FR-027 (no false promises), NFR-002, NFR-003, NFR-005,
NFR-020 · Contract: no change (`GET /public/contact` and `POST /public/contact`,
[public-site.md](../api/public-site.md), both agreed; the form was built in
#339) · Visual system: [landing-v1.md](landing-v1.md) and
[design-system.md](design-system.md)
Designer: @Daveoski + Claude Code (text design; no visual mockup) · Reviewed by:
@nnamdi-security (2026-11-03) · Status: approved

This is a written design: the page, every state and the exact wording. It
was approved (G2) on 2026-11-03 by @nnamdi-security, who is not the author, after
checking it against the SRS, the contract and the honesty rules, with the
decisions under "Review decisions". The page is built in a separate pull request.

A public page at `/contact` with the support phone, WhatsApp and email, and a
form that sends a message to the team. The message is stored as a support
request and answered by phone (public-site.md). The page reuses the FAQ page's
look, so nothing new is drawn.

## Page

One column on a phone. From 960 px, two columns inside the page width the FAQ
page uses: the contact card on the left (about a third) and the form on the
right. The header, the short footer and the floating WhatsApp button are the
FAQ page's.

1. **Header.** The public header, with "Contact" marked as the current page.
2. **Intro.** Breadcrumb "Home / Contact", the kicker "Contact us", the heading
   "Contact **MmiriOma**" (the second word in the teal accent, as the FAQ
   heading) and the lead line: "Call or WhatsApp us, or send a message and our
   team will answer by phone." While the form is switched off (see
   [Switching the form on](#switching-the-form-on)) the lead is "Call or
   WhatsApp us." When WhatsApp support is off, "or WhatsApp" is dropped.
3. **Contact card.** The dark card of the FAQ page's "Didn't find your
   answer?" box, titled "Talk to us":
   - "Call {phone}", a `tel:` link, always;
   - "Chat on WhatsApp", only when support WhatsApp is on;
   - "Email support", a `mailto:` link to the contact block's email;
   - the place, "Enugu, Nigeria".

   The phone and WhatsApp come from `useSupportContact`, which reads
   `GET /public/contact` (FR-055: one central configuration value), never a
   number written into the page. The email and the place are the contact
   block's (`CONTACT` in `content.ts`).
4. **Form card** (only while the form is switched on). Heading "Send us a
   message", the fields below, the "Send message" button and the privacy line.
5. **FAQ link.** "Read all answers", the landing page's label, to `/faq`, under
   the cards.
6. **Footer.** The short footer.

On a phone the contact card comes first: a call is the fastest way to get help,
and the card is short.

## The form

| Field | Label and hint | Rule (contract) | Message when wrong |
| --- | --- | --- | --- |
| `name` | "Your name" | Required, 1 to 100 characters after trimming. `autocomplete="name"` | "Enter your name." · "Use 100 characters or fewer." |
| `phone` | "Phone number", hint "We answer by calling this number." | Required, a Nigerian mobile number (the sign-up check, `phoneField`). `type="tel"`, `autocomplete="tel"` | "Enter your phone number." · "Enter a Nigerian mobile number, for example 0803 123 4567." (the auth wording) |
| `topic` | "What is it about? (optional)" | Optional select. First option "Choose a topic" sends nothing, so the server stores `other`. Then the app's own labels: Late delivery, Wrong quantity, Payment, Rider, Something else (`PROBLEM_LABEL`) | None: every option is valid |
| `message` | "Your message", with a "{n}/1000" counter | Required, 3 to 1000 characters | "Write your message." · "Write at least 3 characters." · "Use 1,000 characters or fewer." |
| `website` | None: the honeypot | Never shown and never filled by a person. Moved off-screen (not `display: none`), with `autocomplete="off"`, `tabindex="-1"` and `aria-hidden="true"`; sent as an empty string | None |

Under the button, the privacy line, from the privacy notice's section 2 row:
"We use your name and number only to answer this message, and we don't link it
to an account. Privacy notice", where "Privacy notice" links to `/privacy`.

Errors show under their field, linked to it with `aria-describedby`, and focus
moves to the first field with an error. Every control is at least 44 px high
(NFR-020).

## States

| State | When | What the page shows |
| --- | --- | --- |
| Form off | The switch is off | The intro and the contact card only. No form, no placeholder, no "coming soon" |
| Default | Opened | The empty form |
| Field errors | "Send message" with a field wrong | The messages in the table above. Nothing is sent |
| Sending | Request in flight | The button reads "Sending…" and is disabled; the fields are read-only. No second request (the contract has no idempotency key, its decision 4) |
| Sent | 201 | The form is replaced by a panel (see below). The fields are cleared |
| Server field error | 422 `validation_error` whose `details` name `name`, `phone`, `message` or `topic` | The server's message under that field, as other forms do (`applyServerFieldErrors`). The text stays |
| Other 422 | 422 that names no visible field | Above the button: "We couldn't send this message. Check it and try again." |
| Too many messages | 429 `too_many_attempts` | Above the button: "You've sent several messages in a short time. You can send another in about {n} minutes. If it's urgent, call us on {phone}." `{n}` is `details.retry_after_seconds` rounded up to whole minutes, at least 1. Without the number: "Please try again later." The text stays |
| Offline | `network_error` | Above the button: "You're offline. Your message is still here: send it when you're back online." The text stays |
| Server error | 503 `service_unavailable`, or any other failure | Above the button: "We couldn't send your message just now. Try again, or call us on {phone}." The text stays |
| Support contact loading or failed | `GET /public/contact` not answered yet, or failed | The built-in official number and WhatsApp, as on the landing and FAQ pages, so help is always reachable |

The banners above the button use `role="alert"`; the Sent panel's heading
takes focus.

**Sent panel:**

> **Message received**
>
> Thank you. Our team answers website messages by phone, on the number you
> gave.
>
> Your reference: **SR-4K7M2Q9X** (sample). Quote it if you call us.
>
> If it's urgent, call us on {phone}. [Call {phone}] [Chat on WhatsApp]
>
> [Send another message]

"Send another message" brings back the empty form. The WhatsApp button shows
only when support WhatsApp is on. A honeypot hit gets the same panel with the
server's made-up reference (contract decision 3); a person never fills that
field, so a person never sees it.

## Switching the form on

@nnamdi-security set four conditions on #344 before the form is **switched
on**, not before it is built:

1. The honeypot field has `autocomplete="off"`, `tabindex="-1"` and
   `aria-hidden`, and a test shows it stays empty on a normal submit (above).
2. #364 (privacy tool: delete a website message by phone) is merged.
3. #365 (admin Support shows website messages) is merged, so staff see them
   properly.
4. The notice's legal operator reviews the privacy notice 4.0 wording, and its
   "last updated" date is set to the day the form goes live.

So the page can go live before the form, the form sits behind a public build
setting, `VITE_CONTACT_FORM_ENABLED`, which is off unless set to `true`
([open question 1](#open-questions)). It holds no secret.

## Navigation

- **Header:** a new link, "Contact", after "FAQs". Below 960 px it is in the
  menu with the others. With "About" (#338) the header has eight links, so the
  build checks it does not overflow at 960 to 1280 px
  ([open question 2](#open-questions)).
- **Footer:** "Contact" in Quick Links, in the full footer and the short one.
- **Sitemap:** `/contact` joins `frontend/public/sitemap.xml`, and the assertion
  in `backend/tests/test_seo_files.py` that `/contact` is not there yet changes
  in the same PR.

## Search tags

`useMarketingPage` sets the title "Contact MmiriOma | Water delivery in Enugu",
the description "Call, WhatsApp or send a message to the MmiriOma team in
Enugu." and the canonical `https://mmiriomadelivery.com/contact`.

## Personal data

The name, phone and message are personal data (NFR-003). They are never
written to the console, the URL, browser storage or an error report, and they
are cleared from the page once the message is sent. Only the reference is shown
after sending. No analytics run on the site.

## Honesty rules

- **No reply time and no hours.** The page never says when the team will
  answer: no "within 24 hours", no "same day". Support hours are not agreed
  (#270), so they are left off, as on the About page.
- **No false confirmation.** "Message received" says only that: not that a
  delivery, a call-back slot or a refund is booked (FR-027).
- **No water-quality claims** (PRD §3.2).
- **No email promise.** Nothing is sent by email (no email provider, SRS §12),
  so the page never says "we'll email you".
- **Sample data is labelled.** The reference above is a sample.

## Screen-to-endpoint table

| Screen | Element / action | Endpoint | Fields used |
| --- | --- | --- | --- |
| Contact | Phone and WhatsApp in the card, the error banners and the Sent panel | [`GET /public/contact`](../api/public-site.md#get-publiccontact) (agreed) | `phone`, `whatsapp` |
| Contact | "Send message" | [`POST /public/contact`](../api/public-site.md#post-publiccontact) (agreed, built in #339) | Request: `name`, `phone`, `message`, `topic`, `website`. Response: `reference`. Errors: 422 `validation_error`, 429 `too_many_attempts` (`retry_after_seconds`), 503 `service_unavailable` |

Everything else is static. No contract change.

## Decisions

1. **One page, contact first.** The card works with or without the form, so the
   page is useful from the day it ships and the form can be switched on later.
2. **The phone comes from the server** (FR-055), as on every other contact
   surface.
3. **The text survives every failure.** Only a 201 clears the form, so nobody
   types a long message twice.
4. **No reply time** in any state; the reference and a "call us if urgent" line
   are the honest alternative.
5. **The topic reuses the app's labels,** so the admin queue shows the same
   words for app and website requests (contract decision 5).

## Open questions

Each has a recommendation; the reviewer decides.

1. **How the form is switched on.** Recommendation: the build setting
   `VITE_CONTACT_FORM_ENABLED`, off by default, turned on in the deployment
   once the four conditions are met. The alternative is to hold the build PR
   until then, which leaves the page itself unpublished.
2. **Eight header links.** Recommendation: "Contact" after "FAQs"; the build
   checks 960 to 1280 px and narrows the gaps if needed. If eight links still do
   not fit, the reviewer picks one to leave to the footer, as a design change.
3. **The topic select.** Recommendation: show it, optional, with the app's
   labels, because the privacy notice already lists "the type of question if
   you choose one". The alternative, no select, is simpler for visitors who
   have never ordered.
4. **The Sent wording.** Recommendation: as in the panel above, which says the
   team answers by phone (public-site.md) and promises no time.
5. **The email link.** The contract sends nothing by email, but the email is the
   contact block's privacy mailbox, already on the footer and the FAQ page.
   Recommendation: keep "Email support" in the card, as those pages do.

## Review decisions

Recommendations by @nnamdi-security, 2026-11-03, approved with the design:

1. **Switching the form on:** agreed: a public build setting
   `VITE_CONTACT_FORM_ENABLED`, off unless `true`. It holds no secret. The build
   PR documents it in `frontend/.env.example` and in the deployment guide, and
   says plainly that changing it needs a rebuild of the frontend. The page ships
   with the contact card first; the form is switched on only after the four
   conditions above are met.
2. **Eight header links:** agreed, "Contact" after "FAQs". The build checks
   960 to 1280 px and narrows the gaps; if eight still do not fit, the
   reviewer picks the one to move to the footer.
3. **Topic select:** show it, optional, with the app's labels. The privacy
   notice row already lists "the type of question if you choose one".
4. **Sent wording:** agreed. "Our team answers website messages by phone, on the
   number you gave" matches the contract and promises no time. Staff must
   actually call; that is an operating rule for the team, not the page.
5. **Email link:** keep "Email support", as the footer and the FAQ page do. It
   goes to the contact block's mailbox, which is the privacy mailbox today;
   when a separate support mailbox exists, change it in the one contact block.
6. **Condition:** the build tests that the honeypot stays empty on a normal
   submit, that only a 201 clears the form, and that no name, phone or message
   reaches the console, the URL or browser storage.

## Changes to the design system

None. The page reuses the FAQ page's intro, dark contact card and buttons; the
form fields reuse the FAQ search field's border, radius and height.
