# Public contact form

Requirements: FR-055, NFR-002, NFR-003, NFR-005 · Contract:
[public-site.md](../api/public-site.md#post-publiccontact), `POST /public/contact`
(agreed 2026-11-02) · Issue: #339 · The form's screen is built in #344 and
documented in [public-pages.md](public-pages.md#contact-form); this document
covers the backend.

## 1. Overview and purpose

A visitor who is not signed in can send a message to the team from the
website. It is stored as a **support request** and appears in the admin
support queue next to the customers' in-app reports. The team answers by
phone. Nothing is sent by email: there is no email provider (SRS §12), and the
form asks for a phone number, not an email address (the privacy notice says
the pilot does not collect one).

## 2. Feature workflow

```
POST /api/v1/public/contact        no session, no CSRF
  body invalid                 ──>  422 validation_error
  per-IP limit (10 / hour)     ──>  429 too_many_attempts
  honeypot "website" filled    ──>  201 made-up reference, nothing stored
  per-phone limit (3 / hour)   ──>  429 too_many_attempts
  store support_requests row (source "website", no user)
  tell every active admin ("Someone sent a message through the website.")
  201 {reference, created_at}
```

Staff then use the existing admin Support screen: the request shows with the
visitor's name and phone, the "Call" button dials the visitor, and resolving
works as for any request.

## 3. Important files

| File | Responsibility |
| --- | --- |
| `backend/app/modules/public/contact_form.py` | Request and receipt bodies, and the two rate limiters |
| `backend/app/modules/public/router.py` | `POST /public/contact`: limits, honeypot, store |
| `backend/app/modules/customers/requests.py` | `create_website_support_request`; the admin list, detail and resolve now accept a request with no account (`SupportSender`) |
| `backend/app/modules/customers/models.py` | `SupportRequest.source`, `contact_name`, `contact_phone`, nullable `user_id` and `idempotency_key`, and the `source_shape` check |
| `backend/app/modules/notifications/admin_messages.py` | `website_message`: the admin notification, with no personal data in it |
| `backend/alembic/versions/20261102_0024_add_website_support_requests.py` | The migration |
| `backend/app/modules/customers/admin_schemas.py`, `admin_router.py` | `source` on every admin support request; `customer.id` may be null |
| `frontend/src/lib/api/adminSupport.ts` | The admin client accepts `source` and a null `customer.id`, so the Support screen does not fail on a website request |
| `docs/api/examples/public-contact-request.json`, `public-contact-receipt.json`, `admin-support-request-website.json` | Contract examples |
| `backend/tests/test_public_contact_form_api.py` | Validation, honeypot, limits, logs (no database) |
| `backend/tests/test_public_contact_form_integration.py` | Storage, admin queue, constraint, deletion, HTTP (needs `TEST_DATABASE_URL`) |

## 4. Database models and relationships

`support_requests` (migration `0024`), changed:

| Column | Change |
| --- | --- |
| `user_id` | Nullable: a visitor has no account |
| `idempotency_key` | Nullable: the public form has none |
| `source` | New, `app` (default) or `website`, with its own CHECK |
| `contact_name` (100), `contact_phone` (16) | New, nullable: the visitor's name and E.164 phone |

The CHECK `source_shape` keeps the shapes apart: an `app` row has a user and a
key and no contact fields; a `website` row has both contact fields and
neither of the other two. Existing rows are all `app` and satisfy it. The
downgrade deletes the `website` rows first (they cannot exist with a required
`user_id`), so it restores the schema, not that data.

## 5. API endpoints and request/response behavior

`POST /api/v1/public/contact`, public. Body (all fields in the contract's
table): `name` (1 to 100), `phone` (a Nigerian number, normalized to E.164),
`message` (3 to 1000), optional `topic` (`late`, `wrong_quantity`, `payment`,
`rider`, `other`; `other` if left out), optional `website` (the honeypot,
must be empty). Unknown fields are 422.

201: `{ "reference": "SR-6H2P8W3D", "created_at": "2026-11-02T10:15:00Z" }`.

Admin side, changed: `GET /admin/support-requests` and its detail add
`source`; for a website request `customer.id` is `null`, `customer.name` and
`customer.phone` are the visitor's, `order_reference` is `null`, and
`contacts` has the visitor as the one entry
([admin-operations.md](../api/admin-operations.md#support-requests-admin)).

## 6. Important business rules

- **Stored as a support request** (contract decision 2); it never changes an
  order, and it is never linked to an account. The phone is not looked up, so
  the form cannot reveal who is registered (NFR-002).
- **Honeypot (decision 3):** text in `website` gets the same 201 with a
  made-up reference; nothing is stored or notified. It still counts against
  the per-IP limit.
- **Rate limits (NFR-002):** 10 messages per hour per client IP (every
  well-formed request, honeypot included) and 3 per hour per normalized phone
  (stored messages only; a failed write gives the allowance back). Numbers are
  an engineering recommendation confirmed by the technical lead on
  2026-11-02. The phone limit lets someone use up another number's three
  messages an hour; the harm is a short delay and the visitor can phone the
  team.
- **No personal data in logs (NFR-003):** only `outcome=stored` or
  `outcome=honeypot` is logged. Validation errors name the field, never the
  value. The audit row of a resolved request holds ids only.
- **Retention (NFR-005):** resolved requests are deleted 3 years after
  resolution by the existing monthly privacy review, website ones included.
  The notice (version 4.0) says so.
- **No idempotency key (decision 4):** a double tap can create two requests;
  staff resolve both.

## 7. Authentication and authorization requirements

The endpoint is public: no session cookie, no CSRF token (nothing signed in to
forge). The admin queue is admin-only as before (customers and drivers get
403).

## 8. Error handling and edge cases

| Case | Result |
| --- | --- |
| Missing or too short or long field, bad phone, unknown topic, unknown field | 422 `validation_error`, details name the field only |
| Over 10 messages per hour from one IP | 429 `too_many_attempts`, `Retry-After` |
| Over 3 messages per hour from one phone | 429 `too_many_attempts`, `Retry-After` |
| Honeypot filled | 201, nothing stored |
| Database error | 500 in the shared envelope; the phone allowance is returned |
| The same phone in another format (`080...`, `+234...`, `234...`) | The same phone for the limit |

## 9. Testing instructions

```bash
cd backend && source .venv/bin/activate
pytest tests/test_public_contact_form_api.py tests/test_public_contact_api.py
TEST_DATABASE_URL=... alembic upgrade head
TEST_DATABASE_URL=... pytest tests/test_public_contact_form_integration.py \
  tests/test_admin_operations_integration.py
alembic downgrade -1 && alembic upgrade head && alembic check
cd ../frontend && npx vitest run src/lib/api/adminSupport.test.ts \
  src/features/admin/real/support.test.ts src/features/admin/support.screens.test.tsx
```

## 10. Known limitations

- **Limits reset on restart** and are per worker (accepted for the pilot's
  single worker, as for the auth limits).
- **The form's screen** is `/contact` (#344), switched off until the four
  conditions in [contact.md](../design/contact.md#switching-the-form-on) are
  met (`VITE_CONTACT_FORM_ENABLED`). Its honeypot sets `autocomplete="off"`,
  `tabindex="-1"` and `aria-hidden`, and `ContactPage.test.tsx` shows it is
  empty on a normal submit (technical lead's condition on the contract). Browser
  autofill with saved data is still to be checked by hand: autofill of a field
  named `website` would give a real visitor a made-up confirmation and lose the
  message, and the fix would be a rename in a contract change.
- **The admin Support screen shows a website request like any other.** The
  "Website" tag and a layout without a customer record are a follow-up with a
  design amendment (G2).
- **Deleting a visitor's messages on request** uses
  `python -m app.modules.privacy.cli delete-website-messages` (#364; see
  [privacy-tool.md](privacy-tool.md)). It finds messages by exact phone number
  and deletes them whole; the form must not be switched on before it is merged
  (technical lead's answer on the contract).
- The privacy notice (version 4.0) and `/privacy` page change in this release
  and must merge before the form is switched on.
