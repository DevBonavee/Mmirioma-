# Admin Support: website messages

<!-- Workflow: docs/process/ui-driven-development.md. Fork gates: CLAUDE.md,
"Team workflow". -->

Issue: [#365](https://github.com/mmiri-oma/mmirioma/issues/365) · Requirements:
FR-027 (no false promises), FR-053 (staff-only contact data), NFR-003, NFR-020,
NFR-021 · Contract: no change. `GET /admin/support-requests` and its detail
already return `source` and a nullable `customer.id`
([admin-operations.md](../api/admin-operations.md#support-requests-admin),
agreed and built in #339 / #362, example
[admin-support-request-website.json](../api/examples/admin-support-request-website.json)) ·
Screens amended: `a-support` (see [handoff-v1.md](handoff-v1.md)) and the real-API
Support page, [admin-operations.md](../features/admin-operations.md)
Designer: @Cloudcrackamara + Claude Code (text design; no visual mockup) · Reviewed by: none yet · Status: draft

**Draft for a reviewer who is not the author.** Do not build the screen until
this says `Status: approved` (G2).

## What changes

Messages from the website contact form (#339) already arrive in the Support
queue. They have no customer account behind them, no order and no topic the
visitor was sure of, and the screen today treats every request as a customer's
report about an order ("Customer" in the row, "Not about an order." in the
detail, "Customer" as the visitor's role). This amendment makes the screen say
what the request is: a **Website** message from a **visitor**, with the
visitor's name and phone, and nothing it does not have. The rest of the
screen does not change.

## Screens and states

The Support page keeps its two parts: the list on the left (380 px from 1024 px
up, full width below) and the detail beside or under it.

### List row

| Part | App request (unchanged) | Website request |
| --- | --- | --- |
| Icon | By type | The same icon as an `other` request |
| Title | By type ("Delivery was late", "Wrong quantity", "Problem reported") | **"Website message"** |
| Second line | `MO-xxxxx · Customer · 2h ago` or `No order · Customer · …` | **`Website · Visitor name · 2h ago`** |
| Status chip | Open / Resolved (Urgent in the mock) | Open / Resolved |
| Tag | none | A **"Website"** chip (blue), also on the second line's text, so the tag is words and not colour alone |

The visitor's name is cut with an ellipsis on one line when long; the full
name is in the detail.

### Detail

| Part | App request (unchanged) | Website request |
| --- | --- | --- |
| Header | `SR-xxxxxxxx · MO-xxxxx`, title, status chip | `SR-xxxxxxxx`, title **"Website message"**, a **"Website"** chip and the status chip |
| Message | The quote block | The same quote block |
| Topic | none (it is in the title) | One line under the quote: **"Topic: Delivery was late / Wrong quantity / Payment / Rider / Other"**, as the visitor chose it. Shown for every website message; a message sent without a topic says "Topic: Other", because the form sends `other` when none is chosen |
| "Order timeline" | The order's steps, or "Not about an order." | **Not shown.** A website message never has an order |
| "People" | The order's receiver and driver, each with Call | **"Sender"**: the visitor's name, the line **"Visitor, no account"**, the phone as text (`0813 377 4902` style) and a **Call** button for that phone. No avatar link, no profile link, no order history, no points |
| Resolution | Real API: one required note and "Apply and resolve" | Unchanged: the same note form. Resolved: "Resolved by …, date. Note: …" |
| Mock mode | Resolution choices by whether there is an order | A website message offers only "Call and close" (no points, no order actions), the choices that make sense without an order |

### States

| State | Behaviour |
| --- | --- |
| Loading, error with "Try again", empty ("No issues.") | Unchanged |
| Website message, open | As above, with the note form |
| Website message, resolved | The note, who resolved it and when; the form is gone |
| Visitor's contacts not loaded yet | The sender block shows the name from the list (never blank); the phone and the Call button appear when the detail loads |
| Visitor's contacts failed to load | The existing error block with "Try again"; the name stays visible |
| A name or message that is long | The name wraps in the detail and is cut in the list; the message wraps; no horizontal scroll at 360 px |
| App request next to website messages | The list mixes them, open first then newest first (the server order); each row is told apart by its second line and tag |

## Search and filters

The Support page has no status or source filter today and none is added. The
search box (placeholder "Search issues or order numbers") sends `q`, which the
server matches against the reference, the order reference and the **name** of
the customer or visitor. So typing a visitor's name finds their message, and
nothing else changes. A visitor's **phone** is not searched (the server does not
match it); the placeholder is left as it is. The "N open" count includes
website messages.

## Widths

Checked at 360, 768, 1280 and 1920 px in the build: at 360 and 768 px the list
sits above the detail and tapping a row scrolls to it (as now); at 1280 and
1920 px they sit side by side. The Call button and the tag keep a 44 px touch
target and a visible focus ring.

## Screen-to-endpoint table

| Screen | Element / action | Endpoint | Fields used |
| --- | --- | --- | --- |
| Support list | Row, tag, count | `GET /admin/support-requests` | `source`, `type`, `status`, `created_at`, `customer.name`, `order_reference` |
| Support detail | Header, message, topic, sender | `GET /admin/support-requests/{reference}` | `source`, `type`, `message`, `customer.name`, `customer.phone`, `contacts[]` |
| Support detail | Call | none (a `tel:` link) | `contacts[].phone` |
| Support detail | "Apply and resolve" | `POST /admin/support-requests/{reference}/resolve` | `note` |

No new endpoint and no field the backend does not send. The screen never shows
an email address (the form does not collect one), a customer id, a link to a
customer record, an order, an order history or points for a website message.

## Decisions to confirm

1. **Title "Website message" for every website request**, with the visitor's
   topic as a separate line in the detail, so a visitor who picks "Delivery
   was late" without an order does not look like a delivery report.
2. **No order timeline for a website message**, instead of "Not about an
   order." — the section simply is not there.
3. **Role "Visitor, no account"** instead of "Customer" for the sender. The
   server sends `role: "customer"` for the one contact (agreed contract); the
   screen decides the label from `source`.
4. **Show the phone as text for every person in "People"**, not only the
   visitor, so staff can read the number out. Today only the name and a Call
   button show. This also changes app requests slightly; the alternative is to
   show the phone for website messages only.
5. **Two new fields on the admin issue type**, `source` (`app` or `website`)
   and `topic` (the request's `type` as sent). The type lives in
   `frontend/src/domain/admin.ts`, a shared file; the change is additive and
   needs the reviewer's explicit OK. Without `topic`, "payment" and "rider"
   would show as "Other".

## Open questions

1. Should the mock mode (demo data) include a website message? Recommendation:
   yes, one, labelled as sample data, so the new states can be seen without a
   backend.
2. Is "Visitor, no account" the right wording for staff, or "Not a customer"?

## Changes to the design system

None. Uses the existing chip, quote block, avatar, list row and Call button.
