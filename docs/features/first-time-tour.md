# First-time customer and partner tour

## 1. Overview and purpose

An optional welcome guide explains existing customer, Keke rider and tanker
driver workflows after registration. The owner explicitly authorized the
design-gate override on 4 November 2026; see
[design and authorization](../design/first-time-tour.md). It uses the existing
design system and inline icons, with no added dependencies or image downloads.

## 2. Feature workflow

Successful customer registration (`useRegister`) or partner registration marks
the signed-in account as `pending` in this browser. Failed signup and ordinary
login do not set that marker. The existing phone-verification route and its
"Do this later" action are preserved.

On the next `/home`, `/partner/rider` or `/partner/driver`, the guide welcomes
the person with "Show me around" and "Maybe later". Customer steps cover address,
delivery type/quantity, price review and delivery updates/code. Partner steps
cover phone/vehicle review, going online, pickup, unloading/code and records.
The guide explains pay on delivery and agreeing the time by phone, matching
the current pilot screens. Partner earnings remain hidden while
`PARTNER_PAY_ENABLED` is false.

Back and Next move within the guide. Skip, Maybe later and Escape dismiss it;
Finish records completion. None navigates or performs a business action.
Completion/dismissal survives reload. The customer account menu, both partner
menus and partner profile offer "Take a quick tour" to replay it without
changing an existing completion marker. If a new account replays it before its
first eligible home visit, finishing or dismissing that replay consumes the
pending welcome, so the automatic guide does not repeat it.

The automatic guide waits for customer orders to load successfully and defers
while an order is active. For approved partners it waits for active jobs to
load successfully and defers for any assigned/accepted/collected job. Pending
approval accounts can see it without a successful jobs query, since they cannot
take jobs. Suspended accounts do not receive the automatic guide. A newly
arriving priority job closes the guide without consuming its pending marker.
An existing native modal or ARIA modal also takes priority. The guide observes
committed dialog changes and waits until the other modal closes, including when
the two components first mount together.

## 3. Important files

| File | Responsibility |
| --- | --- |
| `frontend/src/features/onboarding/WelcomeTour.tsx` | Shared dialog, automatic signup entry, replay action |
| `frontend/src/features/onboarding/tourContent.ts` | Role-specific copy and pilot feature-flag handling |
| `frontend/src/features/onboarding/tourStorage.ts` | Versioned per-account marker, subscriptions and storage fallback |
| `frontend/src/features/onboarding/welcome-tour.css` | Responsive panel, diagram, progress and reachable actions |
| `frontend/src/features/auth/useSession.ts` | Marks successful customer registration only |
| `frontend/src/features/partner/pages/PartnerSignup.tsx` | Marks successful partner registration only |
| Customer `Home.tsx`, `Menu.tsx`; partner `RiderHome.tsx`, `DriverHome.tsx`, `PartnerAccount.tsx` | Entry points and replay |
| `frontend/scripts/check-first-time-tour.cjs` | Synthetic browser checks for tour, keyboard, replay, logos and marketing artwork |

## 4. Database models and relationships

None. The only stored value is a browser marker, keyed
`mmirioma:tour:v1:<role>:<user-id>`, containing `pending`, `dismissed` or
`completed`. The key uses the opaque session user ID to isolate accounts.
No name, phone, address, token or job record is stored. No server model changes.

## 5. API endpoints and request/response behavior

No new endpoint or request/response fields. Registration/session data comes
from the existing agreed [auth](../api/auth.md) and
[partner account](../api/partners.md) contracts. The dialog submits no requests.
Home screens reuse their existing orders/jobs queries to prioritize work.

## 6. Important business rules

The guide grants no verification, approval, load capacity, price, delivery
window, payment status or permission. It does not accept jobs or set online
availability. The delivery code is explained only after unloading. It describes
status updates without claiming live GPS tracking. Feature flags continue to
control unavailable earnings features.

## 7. Authentication and authorization

Automatic entry uses the current session inside the existing role-protected
home screens. Admin and signed-out sessions receive no automatic guide. Markers
belong to the account and role, so switching accounts does not inherit another
account's pending or completed state. Storage is not an authorization mechanism.

## 8. Error handling and edge cases

- Blocked/full local storage falls back to memory for the current tab; signup
  never fails because a tour preference cannot be saved. A failed write takes
  precedence over an older persisted `pending` marker, so Skip still closes the
  guide when reads work but writes fail. Later storage events from another tab
  invalidate that fallback. Malformed markers are ignored. An existing login is
  never inferred to be a new registration.
- Native `dialog.showModal()` makes the background inert. An explicit Tab loop
  keeps keyboard focus within the actions. The heading receives focus on each
  step; dismissal restores the opener and prior body scroll setting.
- Each step's accessible description includes its navigation destination
  ("Find it in: ..."), also shown in the decorative diagram for sighted users.
- Escape closes the guide without reaching the drawer's Escape navigation.
  The backdrop does not dismiss. Route changes clean up the modal and scroll.
- Small/short viewports scroll within the dialog; the action footer remains
  reachable. At 320 px the actions stack. There is no autoplay or motion that
  requires a reduced-motion alternative.

## 9. Testing instructions

```bash
cd frontend
VITE_USE_MOCKS=true npm test -- src/features/onboarding src/features/customer/pages/SignUp.test.tsx src/features/partner/pages/PartnerSignup.test.tsx
# With an existing mock Vite server and Playwright installation:
PLAYWRIGHT_MODULE=/path/to/playwright node scripts/check-first-time-tour.cjs
```

Unit tests cover completion, dismissal, Back/Next, role copy, blocked storage,
account switching, replay, focus/scroll cleanup and deferral. Signup tests verify
the marker while preserving verification navigation and rejected registrations.
The browser helper checks native modal semantics, focus containment, reachable
actions, reload persistence, replay/Escape, priority assignments and logo links
at 320, 390, 768 and 1440 px, plus a 720 x 500 effective viewport corresponding
to 200% zoom on a 1440 x 1000 desktop window. It also submits actual synthetic
customer, Keke and tanker signup forms and follows "Do this later" from phone
verification to the guide. All 25 browser scenarios passed, including existing
modal priority and full-storage dismissal across client-side navigation.
Regression tests also cover early manual replay, cross-tab storage events and
the accessible destination. The final full frontend suite passed 1,647 tests
in 126 files. Lint, typecheck, real-mode build and demo-value exclusion passed,
with only existing map-chunk/PWA warnings. See the
[quality review](../reviews/2026-11-04-quality-and-design-review.md) for scope
and remaining environment/dependency limitations.

## 10. Known limitations

- Completion is local to the current browser. It is not synchronized across
  devices; clearing site storage removes it. An existing account on a new device
  can replay the guide, but is not automatically treated as newly registered.
- If storage writes fail, the fallback lasts for the current document. A full
  page reload can reveal an older persisted pending marker while storage is
  still unavailable; no browser-local persistence is promised in that case.
- Native dialog support is required (current Chrome, Edge, Firefox and Safari).
- A pending tour waits while an order/job is active; it resumes on an eligible
  home visit rather than interrupting work. There is no tour during an order or
  delivery step and no external analytics or completion telemetry.
