# API dependencies and behavior to preserve

This is a mapping of current screens to existing contracts and client/adapters, not a proposed API. All paths below are relative to the application origin and already use `/api/v1`. Included contract snapshots remain reference documents; no contract is changed. Browser captures use the existing mocks and never call production endpoints.

## Call architecture

`screen → TanStack Query hook → customerApi/partnerApi/authApi → mock handler OR feature real/* adapter → lib/api/* → client.ts → backend`.

Keep component props, typed feature functions, query invalidation, cancellation/error handling and role/session guards intact. The HTTP client includes credentials, stores the CSRF token in memory, sends it on unsafe requests, and normalizes the agreed error envelope. Do not copy a session token/cookie into a design artifact. Currency values are integer kobo in API payloads, not floating-point naira.

## Screen-to-contract map

| Current screen family / routes | Existing endpoints | Actual client / adapter | Contract and data that must remain |
| --- | --- | --- | --- |
| Customer sign-in/signup; partner login | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` under `/api/v1` | `lib/api/auth.ts`; `features/auth/authApi.ts`, `useSession.ts` | `docs/api/auth.md`: Nigerian phone identity, name, password, role/session; pending, incorrect credentials, cooldown/network/CSRF states. Signup includes current terms/age acceptance and password rules |
| Driver registration `/partner/signup` | `GET /service-zones`, `POST /auth/partner-register` | `lib/api/partners.ts`; partner `real/account.ts` | `partners.md` / auth amendment: vehicle type and appropriate vehicle details, plate, active zone, terms; approval pending after registration. No new driver role or approval bypass |
| Customer/partner verification; change phone | `GET /auth/phone-verification/status`, `POST /auth/phone-verification`, `POST /auth/phone-verification/verify`; analogous `/auth/phone-change`, `/verify`, `/status` | `lib/api/phoneVerification.ts`; auth hooks | `auth.md`: code purpose, expiry, resend cooldown and attempts. New phone not adopted before verification; driver verification distinct from vehicle approval |
| Password change; recovery links | `POST /auth/password`; no forgotten-password reset endpoint | `lib/api/auth.ts`; shared AccountPages | Current-password validation, successful password change signs out other devices; forgotten password goes to support, not an invented reset service |
| Customer home/profile/settings | `GET /me/profile`, `GET /me/addresses`, `GET /orders`; session and public support contact as applicable | `customerAccount.ts`, `orders.ts`; customer `real/account.ts`, `real/order.ts` | `customer-account.md`, `orders.md`: real fields only; name/phone from profile/session, addresses, recent orders. No fabricated balances/photo/email editing in live mode |
| Address list/add/edit/default/remove | `GET/POST /me/addresses`, `PATCH/DELETE /me/addresses/{id}`, `POST /me/addresses/{id}/default`, `GET /service-zones` | `customerAccount.ts`, `quotes.ts`; customer `real/account.ts` | `customer-account.md`, `delivery-location.md`: zone, label/address/landmark, default status and optional location; ownership 404s, default-address restrictions, loading/error/no-zone states |
| Delivery type/quantity/details/review | `GET /service-zones`, `POST /quotes`, `POST /orders` | `quotes.ts`, `orders.ts`; customer `real/quote.ts`, `real/order.ts` | `order-details-and-price.md`, `orders.md`: Keke vs tanker fields, source preference where appropriate, integer quantities, address/zone/location, receiver/instructions, server quote ID and one reusable idempotency key |
| Manual quote / price failure | Same quote/order endpoints, structured reasons/errors | `order/livePrice.ts`, customer query/adapters | Outside-zone, unavailable category/source/vehicle/cost/rule, expired/mismatched quote, changed area and rate limit are distinct. No invented fallback amount or confirmation |
| Customer orders/detail/placed/track/receipt | `GET /orders`, `GET /orders/{reference}`, `GET /orders/{reference}/history` | `orders.ts`; customer `real/order.ts`, `real/orderStage.ts` | Order reference, quantity/category, quote or confirmed price, window, status/history and available proof/feedback. Unknown fields remain empty; no live ETA/position inferred |
| Delivered feedback | `PUT /orders/{reference}/feedback` | `orders.ts`; customer `real/order.ts` | Rating and poured-by-partner fields from current contract; delivered-only/ownership validation and duplicate-safe replacement behavior |
| Customer notifications | `GET /me/notifications`, `POST /me/notifications/read` | `customerNotifications.ts`; customer `real/notifications.ts` | Pagination/unread counts/read mutation. Points notifications remain filtered while disabled |
| Customer support and deletion | `GET/POST /me/support-requests`, `GET/POST /me/deletion-request` | `customerSupport.ts`; customer `real/support.ts` | `customer-account.md`: linked order where supplied, problem kind/message, safe request reference and pending/resolved/deletion state; request is not instant deletion |
| Support contact / terms/privacy | `GET /public/contact`; existing public legal pages | `publicSite.ts`, shared contact logic | `public-site.md`: configured public contacts, WhatsApp enabled only when confirmed; current terms/privacy text and links remain |
| Driver dashboard/profile/settings/vehicle | `GET/PATCH /driver/profile`, `PUT /driver/availability`, `GET /service-zones` where needed | `partners.ts`; partner `real/account.ts` | `partners.md`: approval, vehicle, usable payload, zone, availability; only agreed writable fields. No document-upload/earnings API inferred |
| Assigned/available/active/history/delivery detail | `GET /driver/jobs`, `GET /driver/jobs/{reference}`, `POST .../{reference}/accept`, `POST .../{reference}/decline` | `driverJobs.ts`; partner `real/jobs.ts` | `deliveries.md`: offers vs own work, allowed actions, role/assignment, approval/payload/source restrictions, decline reason, completed history; no acceptance before success |
| Refill/pickup/loading/customer navigation | `POST /driver/jobs/{reference}/pickup`, `POST .../transition`; existing navigation link out to maps | `driverJobs.ts`; partner `real/jobs.ts` | Source and actual loaded quantity, required confirmations and source/safety incidents; Keke/tanker inputs differ. Display no invented road distance or live instructions |
| Arrival/unreachable/failed | `POST /driver/jobs/{reference}/arrive`, `POST .../contact-attempts`, existing `/transition` to fail | `driverJobs.ts`; partner `real/jobs.ts` | Server-provided `can_start_unloading`, `can_fail_unreachable` and attempt fields; actual 10-minute/two-attempt rule. The mock uses a shorter demo wait and is not normative |
| Unloading and proof/code | `POST /driver/jobs/{reference}/unloading-complete`, `/delivery-code`, `/proof`, `/incidents` | `driverJobs.ts`; partner `real/jobs.ts` | `deliveries.md`: unloading before code, SMS failure vs issued state, expiry/attempts/lock, delivered quantity and acknowledgment; no driver proof override approval |
| Driver cash collection/My cash/handover | `POST /driver/jobs/{reference}/cash-collection`, `GET /driver/cash`, `POST /driver/cash/handover` | `driverCash.ts`; partner `real/cash.ts` | `payments.md`: integer-kobo amounts, collection/custody/remittance states, handover limits, admin receipt/reconciliation distinct from driver claim; no “paid” inferred from delivery |
| Partner notifications/issues | `GET /driver/notifications`, `POST /driver/notifications/read`; per-job `/incidents` | `partners.ts`, `driverJobs.ts`; partner `real/account.ts`, `real/jobs.ts` | Minimal job-specific data, references and current categories; generic support is not a new customer-data access path |

Endpoint prefixes in the first column of endpoint lists are abbreviated only for readability: every endpoint above is under `/api/v1`. The copied typed client files provide exact request/response schemas, enum names and optional fields. The original contracts are authoritative if a prose summary omits a field.

## Current production feature boundaries

| Area | Actual feature switch / behavior | Design-review consequence |
| --- | --- | --- |
| Customer points | `POINTS_ENABLED=false` | Route redirects; do not design loyalty features into the current redesign |
| Rider/driver earnings and payouts | `PARTNER_PAY_ENABLED=false` | Routes redirect even in the mock demo; sample per-job pay shown elsewhere is not a production entitlement |
| Push notifications | `PUSH_ENABLED=USE_MOCKS` | Mock prompts may be visible, but push is not an enabled live MVP requirement |
| Partner documents | `PARTNER_DOCUMENTS_ENABLED=USE_MOCKS` | Existing mock upload controls are not a live upload API |
| Customer profile photo / email/preferences editing | `CUSTOMER_PROFILE_EDITS_ENABLED=USE_MOCKS`; unsupported feature functions reject `not_connected` | Profile/email mock screenshots must not be mistaken for new agreed write endpoints |
| Payment methods | Current customer adapter displays pay-on-delivery; broader Paystack/transfer/refund requirements exist in SRS | Preserve present behavior and identify broader gaps separately; a responsive redesign cannot implement or imply payment integrations |
| Unknown/unsupported data | Adapters map unavailable fields to null/empty state | Preserve honest empty states instead of sample driver positions, station names, ETA or payment status |

## Business invariants for the design handoff

- The server computes money in kobo, freezes accepted price/rule information and validates quote expiry/choice/location. No layout may compute a new authoritative total.
- Order creation reuses its idempotency key across retry; loading/disabled affordances should prevent double submissions without losing recovery.
- A request is not confirmed until dispatch confirms it; changed price/window needs the existing agreement process.
- Delivery and payment states are independent. Drivers cannot set prices, approve their own alternative proof or claim a payment verified.
- Phone OTP and delivery code are different purposes. Delivery code is available only after unloading completes; failed SMS cannot be shown as successfully sent.
- Customer-unreachable failure uses recorded attempts and server-allowed waiting; client timestamps/visual timers do not authorize failure themselves.
- Cash is collected after unloading, and driver handover, admin receipt and reconciliation stay distinct.
- Optional location collection remains consent-based and manual addressing remains available. No automatic tracking is added.
- Real and simulated data stay distinguishable. Screenshots are synthetic current-UI references, not evidence of live deliveries, revenue or provider availability.

## Cross-reference to every route

Use the route/component table in [screen-inventory.md](screen-inventory.md) with the family table above. Shared components such as AccountPages, PartnerShared, CodeStep and CashPages keep one API behavior across their listed routes. Exact current adapter data mappings are included under `references/frontend/src/features/customer/real/` and `.../partner/real/`.
