# MmiriOma responsive redesign: current-interface reference pack

> Historical baseline: this pack captures commit `59bda1a` before the subsequent
> responsive implementation. See [the current layout behavior and checks](../../features/responsive-layout.md).
> Keep these source snapshots and screenshots as before-change evidence.

Archival reference text uses LF line endings for portable Git storage. Its
manifest preserves the original source hashes and records hashes of the
normalized, redacted copies. Screenshot, logo and font bytes remain unchanged.

**Audit only · 4 November 2026 · source commit `59bda1a33225f4660ecef721d1e9055a0549014f`.** This pack records the existing customer, tanker-driver and Keke-rider interfaces. It contains no redesigned screens and authorizes no implementation, contract, model, or workflow changes. The working branch was `feat/344-contact-page`, whose HEAD had been fast-forwarded to `origin/main` at this commit.

## Start here

1. Read [design-references.md](design-references.md) for the authority order and branding. The older approved design-system document is not the current frontend's complete visual source of truth.
2. Read [layout-audit.md](layout-audit.md) for root causes, measurements, and the difference between implemented approved constraints and defects.
3. Use [screen-inventory.md](screen-inventory.md) to map all 90 route patterns to real components and references.
4. Use [component-inventory.md](component-inventory.md) and [api-dependencies.md](api-dependencies.md) to preserve existing UI primitives and behavior.
5. Browse the [offline screenshot gallery](screenshots/index.html), [screenshot index](screenshots/README.md), and [machine-readable measurements](screenshots/manifest.json).

The [validation report](validation.json) verifies required files, all indexed source hashes and reference copies, active-route coverage, screenshot dimensions, local links, runtime errors and unchanged tracked project files. Credential-pattern checks supplement the synthetic-data/source review; they do not certify every possible secret format.

The `references/` directory contains source snapshots of the relevant requirements, original prompts, approved specifications, styles, actual screen components and API adapters, plus unchanged public brand assets and the existing Plus Jakarta Sans offline font files/license. Original project paths are retained. [Its manifest](references/manifest.json) records source hashes and any illustrative credential-value redactions. These are reference copies, not a second app. Links in those historical documents may point to additional repository files or external canvases that were not included; the six audit documents explain the design-critical context without requiring those links.

## Product and current design approach

MmiriOma coordinates water delivery in Enugu, Nigeria. Customers select Keke or tanker delivery, quantities and addresses, obtain server-calculated quotes or request assistance, place an order and follow its status. Drivers accept assigned work, record pickup and delivery steps, unload before proof of delivery, and record collected cash. Dispatch and finance administration remain outside this redesign's screen scope.

The frontend is one React 19 / TypeScript / Vite / Tailwind v4 application. Customer and partner routes have role guards. TanStack Query calls feature API functions, which select mock handlers or real adapters. The real adapters call the common typed HTTP client. The backend owns eligibility, prices, state transitions, and permissions.

The current interface began with a mobile visual handoff. A later approved responsive specification widened customer pages, kept customer forms readable at 720 px, added customer list/detail panes, and deliberately retained a **430 px driver/rider column** on tablet and desktop. This explains much of the user's report of unused desktop space. It is a policy/design mismatch with the new brief, not evidence that CSS tokens belong to one AI provider.

## Objectives for a later design review

- Establish genuine mobile, tablet and desktop treatments for both customer and driver work, including authentication, navigation, lists, details, forms and overlays.
- Preserve the approved current branding, exact logos, colors, typography, component semantics, functionality and existing API contracts.
- Distinguish the page's workspace width from a readable form or dialog width. Making every control full-screen is not a design requirement.
- Specify every existing loading, empty, error, pending and success state, alongside keyboard access and scroll behavior.
- Preserve one implementation of business actions across viewports, using the current components and data rather than invented desktop-only capabilities.

## Constraints that must survive

- Phone-number identity, server-side roles, cookie sessions and CSRF handling. No new social login or password-reset API is implied.
- Customer ownership and driver assignment boundaries; approval, availability and payload restrictions.
- Integer-kobo money, server quotes, expiry and quote snapshots; quantities in litres and the exact local-gallon conversion required by the current contracts.
- Idempotent order creation, explicit confirmation wording, independent delivery/payment states, source eligibility, unloading and delivery-code proof, failed-delivery rules and cash custody.
- Typed feature APIs, real adapters, mock mode, current route behavior and PWA customer/partner scopes. Production feature flags must remain effective.
- Optional, consent-based delivery location; manual address entry remains usable without a map or location permission.
- No unsupported quality claims, invented ETA, live tracking, prices, pay, loyalty rules, or production capabilities inferred from mock screens.

## Capture provenance and coverage

Playwright **1.56.1**, headless Chrome **156.0.8078.80**, isolated browser contexts, Africa/Lagos timezone, reduced motion, scale 1. Viewports: **390 × 844**, **768 × 1024**, **1440 × 1000**. These are CSS pixels; this is browser emulation, not physical-device certification.

At generation: **113 screen/state cases**, **339 viewport records**, **371 PNG files** (including separately named bottom-of-scroll references). Statuses: {'captured': 339}. The screenshot manifest is the exact source for counts, final URLs, loading state, measured frames, scroll regions, alerts and any failed or redirected captures.

The local Vite app ran with `VITE_USE_MOCKS=true`. The harness resets existing mock data in isolated browser storage, changes names/addresses/vehicle plates to clearly identified SIMULATED examples, and uses mock sessions without copying sign-in credentials. All `/api/` and external HTTP requests are blocked in the capture context. No backend/database, production customer data, real login, real SMS, live payment or cash transfer was used. Passwords, cookies, session storage, tokens and Playwright storage-state exports are not saved in this pack. Screenshots carry a small audit-only SIMULATED DATA stamp; it is not part of the app design.

Mock-only email/preferences, documents and push controls can appear. They are labeled in the inventory/API notes and do not justify new production requirements. The map art in trip screens is current illustrative UI, not verified live tracking. External map tiles and Google Fonts were blocked; the existing offline font fallback was used.

## Reproduction

Use an existing compatible Playwright installation (no application dependency was added). Set `PLAYWRIGHT_MODULE` to its package directory if it is not on the normal Node module path. From `frontend/`, run the existing Vite command with `VITE_USE_MOCKS=true`, host `127.0.0.1`, port `5173`. From the repository root run:

```text
python docs/design/responsive-redesign/tools/build-source-index.py
node docs/design/responsive-redesign/tools/capture.cjs
python docs/design/responsive-redesign/tools/build-pack.py
python docs/design/responsive-redesign/tools/validate-pack.py
```

The capture tool supports `--only <regular-expression>`, `--force`, and `--limit <count>`. It checks mock mode before seeding, uses real components without editing application files, waits for both skeletons and session loaders, and records route redirects rather than silently calling a different view a successful capture. Loading examples deliberately delay existing mock-module requests. Browser state is discarded when the context closes. Screenshot runs require permission to launch the browser in restricted environments.

## Audit execution notes and limits

- Initial source discovery used repository-relative paths while running inside `frontend/`; those reads were corrected to the repository root. A Windows literal `*.tsx` path was replaced with directory searches using `rg -g`. These were tooling-discovery errors, not app faults.
- An initial screenshot readiness check recognized skeletons but missed the full-screen water-drop loader. It was corrected and affected captures were repeated; loading cases remain explicitly labeled.
- Cash examples initially used historical paid jobs and a handover with no eligible collected record. They were repeated using a delivered synthetic job and the existing mock collection function; the unavailable cash-card state remains separately labeled. Dashboard fixtures were adjusted to separate assignment sheets from normal/pending approval views. Long window-scrolling pages received bottom references as well as internally scrolling pages.
- One metadata read overlapped the capture tool rewriting its manifest; validation was repeated after the capture completed. This was an audit-tool timing issue.
- The missing git-ignored visual handoff, old approval texts, production-only behavior, external map behavior, real device testing, browser zoom/virtual keyboard, and accessibility certification remain limits; see [design-references.md](design-references.md).
- This documentation task uses reference/link validation, source hashes, screenshot metadata and browser inspection. It does not change app code or rerun unrelated backend/database test suites. Previous test/CI results are not claimed as proof of visual responsiveness.

## Scope integrity

Only `docs/design/responsive-redesign/` is written by this task. Three pre-existing untracked files in `docs/log/` are not part of it. Nothing is committed, pushed, merged or deployed. The new brief asks for desktop driver support, but this audit does not mark a replacement visual specification approved.
