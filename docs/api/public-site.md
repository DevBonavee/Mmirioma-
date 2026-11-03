# Public website endpoints (v1)

Requirements: FR-055, NFR-002 · Issue: #8 · Built in: #56 (`GET /public/contact`); `POST /public/contact` proposed in #339

**Status: agreed** (G3) on 2026-10-26 by @nnamdi-security, technical lead
(#36). Proposed on 2026-10-21 by the new-design fork, **revised 2026-10-26 in
#8** after decisions by @chidimmamogbo (see [Changes](#changes)). Built in
#56 ([public-contact.md](../features/public-contact.md)).

The frontend uses a mock (`frontend/src/mocks/publicMock.ts`); with the real
API it reports "not connected yet" until the endpoint exists. Conventions
(errors, formats, phone numbers) are in [README.md](README.md).

## GET /public/contact

The company's support contact, for the website's floating "Chat on WhatsApp"
button, the FAQ help card, the 404 page and the customer app's Contact us
page. FR-055: the official support number is **+234 813 377 4902**, used
consistently in every customer-facing contact interface, and it "SHALL come
from one central configuration value rather than being repeated in code".

**Public:** no session cookie, no CSRF token. Rate limited per IP (NFR-002):
**120 requests per client IP per 10 minutes** (decided by the technical lead
in #56; generous for carrier NAT, and browsers cache the answer for 5
minutes).

**200** ([examples/public-contact.json](examples/public-contact.json))

```json
{ "phone": "+2348133774902", "whatsapp": "+2348133774902" }
```

| Field | Type | Notes |
| --- | --- | --- |
| `phone` | E.164 string | The backend's `SUPPORT_PHONE` setting (`backend/app/core/config.py`, default the official number), the same value the SMS templates use. Always present |
| `whatsapp` | E.164 string or `null` | The number for `https://wa.me/` links: the support number when WhatsApp support is switched on, else `null`, and the website then hides its WhatsApp buttons and shows the phone number |

Rules:

- **One central value (FR-055).** Both numbers come from backend settings
  read through `get_settings()`, never from the database or an admin screen.
  Changing the number is a configuration change by the technical lead.
- **WhatsApp is on** (FR-055 requires it to be confirmed active first):
  confirmed by @chidimmamogbo on 2026-10-26 that WhatsApp is active on
  +234 813 377 4902. The build adds a setting `SUPPORT_WHATSAPP_ENABLED`
  (default `false`; set to `true` for the pilot), so it can be switched off
  without a code change.
- Cacheable for a few minutes (`Cache-Control: public, max-age=300`).

Removed in #8: the admin Settings field "Support WhatsApp" that saved another
number. An admin-edited number would be a second source next to
`SUPPORT_PHONE`, which FR-055 rules out. The frontend's
`DEFAULT_WHATSAPP` in `frontend/src/lib/whatsapp.ts` stays only as the
fallback while the endpoint cannot be read; the link issue keeps it equal to
the official number.

| Status | `code` | When |
| --- | --- | --- |
| 429 | `too_many_attempts` | Per-IP limit; `Retry-After` and `details.retry_after_seconds` |
| 503 | `service_unavailable` | Shared ([README](README.md#errors)) |

## POST /public/contact

**Status: agreed** (G3) on 2026-11-02 by @nnamdi-security (technical lead),
who is not the author, with the decisions and conditions in
[Decisions](#decisions-proposed-in-339) and
[Open questions](#open-questions-for-339). **Built in #339**
([public-contact-form.md](../features/public-contact-form.md)). Requirements: FR-055, NFR-002, NFR-003,
NFR-005 (SRS); the privacy notice, sections 2, 3, 7 and 8.

A visitor who is not signed in sends a message to the team from the website.
It is stored as a **support request** and appears in the admin support queue
([admin-operations.md](admin-operations.md#support-requests-admin)). The team
answers by phone; nothing is sent by email (there is no email provider, SRS
§12), and the visitor is not promised an answer time.

**Public:** no session cookie, no CSRF token (nothing is signed in to forge).
Abuse is limited by the rules below.

**Request** ([examples/public-contact-request.json](examples/public-contact-request.json))

```json
{
  "name": "Sample Visitor",
  "phone": "08000000001",
  "message": "Do you deliver to Independence Layout?",
  "topic": "other",
  "website": ""
}
```

| Field | Type | Rule |
| --- | --- | --- |
| `name` | string | Required. 1 to 100 characters after trimming (as sign-up) |
| `phone` | string | Required. A Nigerian number, normalized by the server to E.164 as at sign-up ([README](README.md#formats)); 422 if it is not one |
| `message` | string | Required. 3 to 1000 characters (the limits of an in-app support request) |
| `topic` | string | Optional. One of the in-app support types: `late`, `wrong_quantity`, `payment`, `rider`, `other`. `other` when left out |
| `website` | string | The **honeypot**: a field real visitors never see or fill (hidden from people and from screen readers). Optional; must be empty or absent |
| (unknown fields) | | Rejected with 422 |

There is **no email field**: see [decision 1](#decisions-proposed-in-339).

**201** ([examples/public-contact-receipt.json](examples/public-contact-receipt.json))

```json
{ "reference": "SR-4K7M2Q9X", "created_at": "2026-11-02T10:15:00Z" }
```

| Field | Notes |
| --- | --- |
| `reference` | The public-safe request reference, `SR-` and 8 random characters, as for in-app requests. The visitor can quote it when they call |
| `created_at` | When it was received (UTC) |

The page says the message was received. It must not promise a reply time or
a booking (FR-027).

**Rules**

- **Stored as a support request.** The row is a `support_requests` row with
  `source` `website` and no user: [Storage](#storage-proposed-in-339). Staff
  see it in the same queue and resolve it with the same endpoint. It never
  changes an order.
- **Never linked to an account.** The server does not look up whether the
  phone belongs to a customer, and the answer never says. This stops the form
  being used to find out who is registered (NFR-002).
- **Honeypot.** When `website` has any text, the server answers **201** with a
  made-up reference exactly as for a real message, stores nothing and
  notifies nobody. A bot gets no signal to adapt to. The request still counts
  against the per-IP limit.
- **Rate limits** (NFR-002), with the auth module's sliding-window limiter,
  in this process's memory (so they reset on restart and are per worker, as
  for the auth limits in [authentication.md](../features/authentication.md)).
  The numbers are an engineering recommendation; the SRS gives none:

  | Key | Limit | Why |
  | --- | --- | --- |
  | Client IP | 10 messages per hour | Generous because many mobile users share one IP through carrier NAT |
  | Phone number | 3 messages per hour | One person rarely needs more; stops one number being flooded |

  Every request with a well-formed body counts against its IP, including
  honeypot hits. A stored message also counts against its phone. Over a limit:
  **429** `too_many_attempts` with a `Retry-After` header and
  `details.retry_after_seconds`.
- **Personal data (NFR-003, NFR-005).** The name, phone and message are
  never written to logs, error details or audit metadata. The server logs
  only the outcome (stored, honeypot, limited) without them.
- **Admin notification.** Every active admin gets the existing "New support
  request" notification, with a body that holds no name, phone or message
  ("Someone sent a message through the website.").
- **Retention.** Resolved requests are deleted 3 years after resolution, as
  other support requests (privacy notice section 8). The notice needs a new
  row for website messages: see [Privacy](#privacy-proposed-in-339).

| Status | `code` | When |
| --- | --- | --- |
| 422 | `validation_error` | A field is missing, too long or too short, `phone` is not a Nigerian number, `topic` is unknown, `website` is not a string, or an unknown field is sent. Details name the field, never the value |
| 429 | `too_many_attempts` | A limit above; `Retry-After` and `details.retry_after_seconds` |
| 503 | `service_unavailable` | Shared ([README](README.md#errors)) |

### Storage (proposed in #339)

The issue asks to reuse the support requests table. Today a row needs a
customer: `user_id` and `idempotency_key` are required, and there is no place
for a visitor's name or phone. The migration (reversible) changes
`support_requests`:

| Change | Why |
| --- | --- |
| `user_id` becomes nullable | A visitor has no account |
| `idempotency_key` becomes nullable | The public form has no idempotency key ([decision 4](#decisions-proposed-in-339)) |
| New `source`, `app` or `website`, default `app`, required | Tells the two apart |
| New `contact_name` (100) and `contact_phone` (16), nullable | The visitor's name and normalized phone |
| New check: `app` rows have `user_id` and no contact fields; `website` rows have both contact fields and no `user_id` | Keeps the two shapes from mixing |

Downgrade deletes the `website` rows first, because they cannot exist without
the nullable columns; it is reversible for the schema, not for that data.

In-app requests do not change: same endpoints, same fields, same responses.

### Admin queue (proposed in #339)

`GET /admin/support-requests` and the detail endpoint join the customer
today. For a `website` request:

| Field | Value |
| --- | --- |
| `source` (new, every request) | `app` or `website` |
| `customer.id` | `null` |
| `customer.name`, `customer.phone` | The visitor's name and phone |
| `order_reference` | `null` |
| `contacts` (detail) | One entry: `{ "name": <visitor>, "role": "customer", "phone": <visitor> }`, so the "Call" button works |

`customer.id` becomes nullable and `source` is added: additive for a client
that ignores `source`, but a client that assumes `customer.id` is a string
must handle `null`. The Support screen needs a small change (a "Website" tag,
no link to a customer record); that is a frontend follow-up, not part of #339
([open question 1](#open-questions-for-339)).

### Privacy (proposed in #339)

A visitor's name, phone and message are personal data (NFR-003). The privacy
notice must change in the same release as the form (the owner of the notice
edits it; this contract only lists what it needs):

1. Section 2: a row for "what you tell us through the website contact form".
2. Section 8: a retention row for those messages, **3 years after we resolve
   them** (the same as problems reported in the app).
3. Section 7: staff see them; nothing is sent to a third party.
4. Section 9: how a visitor who is not a customer asks for deletion (they
   have no account and no "Delete my account" button).
5. `docs/process/privacy-retention.md` gets the same row.

The privacy tool deletes requests by customer; it cannot yet find a
`website` request by phone ([open question 2](#open-questions-for-339)).

### Decisions proposed in #339

1. **Phone is required and there is no email field.** The issue says "phone
   or email", but the privacy notice (section 3) says "We do **not** collect
   your email address", no email provider exists (SRS §12), and the team
   answers by phone. Recommendation: phone only for the pilot. Adding email
   later needs the notice and the email-provider decision first.
2. **Reuse `support_requests`** with the migration above, as the issue asks,
   rather than a separate table.
3. **Honeypot answers 201** with a made-up reference, so a bot cannot tell it
   was caught.
4. **No idempotency key.** The public form cannot keep one across a reload,
   and the per-phone limit already stops a flood. A double tap can create two
   requests; staff resolve both.
5. **Topic reuses the in-app types**, so no new enum value is needed.
6. **Rate limit numbers** (10 per hour per IP, 3 per hour per phone) are a
   recommendation for the reviewer to confirm.

**Reviewer's recommendation and agreement (@nnamdi-security, 2026-11-02):**
all six decisions are accepted as written, because each follows the issue or
the privacy notice, or is the narrowest choice where the SRS is silent. Two
conditions:

- **Honeypot and autofill (decision 3).** A browser can autofill a field
  named `website`, and a real visitor would then get a made-up confirmation
  and lose the message. The form must hide the field with `autocomplete="off"`,
  `tabindex="-1"` and `aria-hidden`, and the build's test must show the
  hidden field is empty on a normal submit. If autofill still fills it in a
  browser check, rename the field in a contract change.
- **The limits reset on restart (rate limits).** This is accepted for the
  pilot's single worker, as for the auth limits. The per-phone limit also
  lets someone use up another number's three messages an hour; the harm is a
  short delay, and the visitor can phone the team.

### Open questions for #339

1. The admin Support screen needs a "Website" tag and a customer-less detail.
   Is that a follow-up issue, and does it need a design amendment (G2)?
2. A visitor who asks to have their message deleted has no account. The
   privacy tool has no "find by phone" for `website` requests, so staff
   would need a command-line step. Should #339 add one, or is it a follow-up?
3. The privacy notice rows above: who edits `PRIVACY_NOTICE.md`, and must it
   merge before the form is switched on?

**Answers (@nnamdi-security, 2026-11-02; recommendations, approved):**

1. **The Website tag is a follow-up issue with a design amendment (G2).** But
   the endpoint is public from the day it ships, so the existing Support
   screen must not break on a request with `customer.id: null`. #339's build
   includes a non-visual fix: the real admin adapter and the screen render a
   website request without error, with a test. The tag and the customer-less
   detail layout are the follow-up. The #339 build also updates
   [admin-operations.md](admin-operations.md) with the `source` field and the
   nullable `customer.id`, in the same PR.
2. **Not in #339; a follow-up issue that must be done before the form is
   switched on** (#344). Until then, a deletion request for a website message
   is handled by hand by an administrator on the owner's instruction; the
   notice (section 9) says to call or email the privacy contact.
3. **#339's build PR edits `PRIVACY_NOTICE.md` and the `/privacy` page** (as
   #340 does for location), and it merges before #344's form is switched on.
   The notice's legal operator reviews the wording.

## Newsletter: not in the pilot

**Decided** (@chidimmamogbo, 2026-10-26): the newsletter sign-up is **left
out of the pilot**. No endpoint is proposed. Reasons:

- There is no email provider (SRS §12), so no newsletter can be sent and the
  form's promise "Unsubscribe any time" cannot be kept.
- The pilot collects no email addresses: decided for customers and partners
  in #48 and #47, as the privacy notice says ("We do not collect your email
  address", `PRIVACY_NOTICE.md` §3).

The form before the footer of the public pages is removed or hidden in the
link issue, and the website's Privacy page loses its newsletter line. The
earlier proposal (`POST /newsletter/subscriptions`, single opt-in) is in the
git history of this file, for when an email provider is approved.

## Open questions

1. ~~Single or double opt-in for the newsletter?~~ Not needed: newsletter
   out of the pilot.
2. ~~Who sends the newsletter?~~ Not needed, as above.
3. Should `GET /public/contact` also return support hours once they are
   agreed? No SRS rule yet; not proposed.

## Changes

| Date | Change | Agreed by |
| --- | --- | --- |
| 2026-11-02 | Built (#339), as agreed; examples added | @nnamdi-security (technical lead) |
| 2026-11-02 | Proposed (#339): `POST /public/contact`, a website message stored as a support request (migration, admin queue fields, rate limits, privacy rows) | @nnamdi-security (technical lead, G3, 2026-11-02), with the conditions in the section |
| 2026-10-27 | Built in #56; the per-IP limit set to 120 requests per 10 minutes | @nnamdi-security (technical lead, #56) |
| 2026-10-26 | Revised in #8: contact read from backend settings only (FR-055), `phone` always set, `whatsapp` on by a setting (WhatsApp confirmed active); admin "Support WhatsApp" field removed; newsletter left out of the pilot | @nnamdi-security (technical lead, #36), with @chidimmamogbo's decisions on #8 |
| 2026-10-21 | Proposed: contact numbers from admin Settings, newsletter sign-up | Superseded |
