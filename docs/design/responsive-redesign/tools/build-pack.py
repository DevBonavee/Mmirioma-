"""Generate a self-contained, source-backed reference pack; never edits the app."""

import hashlib
import html
import json
import re
from collections import Counter
from pathlib import Path

PACK = Path(__file__).resolve().parents[1]
ROOT = PACK.parents[2]
INDEX = json.loads((PACK / "source-index.json").read_text(encoding="utf-8"))
MANIFEST = json.loads((PACK / "screenshots/manifest.json").read_text(encoding="utf-8"))
CAPTURES = MANIFEST["captures"]
COMMIT = INDEX["commit"]


def write(name: str, content: str) -> None:
    target = PACK / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content.strip() + "\n", encoding="utf-8", newline="\n")


def link(source: str, label: str | None = None) -> str:
    return f"[{label or source}](references/{source})"


docs = [
    "CLAUDE.md", "MmiriOma_MVP_PRD.md", "MmiriOma_MVP_SRS.md",
    "docs/architecture/frontend.md", "docs/architecture/api-mapping.md", "docs/architecture/maps.md",
    "docs/design/design-system.md", "docs/design/handoff-v1.md", "docs/design/responsive.md",
    "docs/design/authentication.md", "docs/design/phone-verification.md", "docs/design/partner-phone-verification.md",
    "docs/design/sign-up-password-and-terms.md", "docs/design/customer-live-prices.md",
    "docs/design/customer-delivery-window.md", "docs/design/customer-device-location.md",
    "docs/design/driver-arrival-unreachable.md", "docs/design/driver-cash.md", "docs/design/cash-remittance.md",
    "docs/design/prompts/00-design-system.md", "docs/design/prompts/01-customer-ordering.md",
    "docs/design/prompts/03-driver-deliveries.md", "docs/design/prompts/04-authentication.md",
    "docs/design/prompts/12-cash-remittance.md", "docs/design/prompts/13-customer-live-prices.md",
    "docs/design/prompts/18-driver-arrival-and-unreachable.md", "docs/design/prompts/20-customer-device-location.md",
    "docs/api/README.md", "docs/api/auth.md", "docs/api/orders.md", "docs/api/order-details-and-price.md",
    "docs/api/customer-account.md", "docs/api/partners.md", "docs/api/deliveries.md", "docs/api/payments.md",
    "docs/api/delivery-location.md", "docs/api/public-site.md", "docs/api/push.md",
    "docs/features/customer-app.md", "docs/features/partner-app.md", "docs/features/driver-jobs.md",
    "docs/features/authentication.md", "docs/features/pricing.md", "docs/features/delivery-location.md",
    "docs/features/driver-cash.md", "docs/features/pwa.md",
]
source_paths = set(docs)
for r in INDEX["routes"]:
    if r["component_file"]:
        source_paths.add(r["component_file"])
source_paths.update([
    "frontend/src/features/customer/CustomerArea.tsx", "frontend/src/features/customer/routes.tsx",
    "frontend/src/features/customer/components/CustomerChrome.tsx", "frontend/src/features/customer/components/LocationCard.tsx",
    "frontend/src/features/customer/pages/Splits.tsx", "frontend/src/features/customer/order/draft.ts",
    "frontend/src/features/customer/order/OrderDraftProvider.tsx", "frontend/src/features/customer/queries.ts",
    "frontend/src/features/customer/customerApi.ts", "frontend/src/features/partner/routes.tsx",
    "frontend/src/features/partner/PartnerArea.tsx", "frontend/src/features/partner/partnerContext.ts",
    "frontend/src/features/partner/components/PartnerChrome.tsx", "frontend/src/features/partner/components/AssignedSheet.tsx",
    "frontend/src/features/partner/components/JobStep.tsx", "frontend/src/features/partner/components/JobParts.tsx",
    "frontend/src/features/partner/queries.ts", "frontend/src/features/partner/partnerApi.ts",
    "frontend/src/features/auth/RequireRole.tsx", "frontend/src/features/auth/SessionRedirects.tsx",
    "frontend/src/features/auth/PhoneCodeParts.tsx", "frontend/src/features/auth/SignUpSecurityFields.tsx",
    "frontend/src/components/layout/MobileShell.tsx", "frontend/src/components/layout/ShellScope.tsx",
    "frontend/src/components/layout/shellContext.ts", "frontend/src/components/layout/DrawerMenu.tsx",
    "frontend/src/components/layout/BottomTabBar.tsx", "frontend/src/components/layout/StateScreens.tsx",
    "frontend/src/components/brand/Logo.tsx", "frontend/src/components/brand/Illustration.tsx",
    "frontend/src/styles/theme.css", "frontend/src/styles/components.css", "frontend/src/styles/base.css",
    "frontend/src/styles/fonts.css", "frontend/src/styles/motion.css", "frontend/src/index.css",
    "frontend/src/lib/useMediaQuery.ts", "frontend/src/lib/features.ts", "frontend/src/lib/api/mode.ts",
    "frontend/src/components/layout/mobileShell.test.tsx", "frontend/src/app/router.tsx",
    "frontend/src/features/customer/customerNav.ts", "frontend/src/features/customer/order/livePrice.ts",
    "frontend/src/features/customer/components/OrderBits.tsx", "frontend/src/features/customer/components/OrderParts.tsx",
    "frontend/src/features/customer/components/AreaPicker.tsx", "frontend/src/features/customer/components/PinMap.tsx",
    "frontend/src/features/partner/components/ArriveButton.tsx", "frontend/src/features/partner/components/AttemptList.tsx",
    "frontend/src/features/partner/components/StepError.tsx", "frontend/src/features/partner/cash/CashParts.tsx",
    "frontend/src/features/auth/authApi.ts", "frontend/src/features/auth/useSession.ts", "frontend/src/features/auth/phoneCode.ts",
    "frontend/src/components/brand/HomeLogo.tsx", "frontend/src/components/brand/logoTarget.ts",
    "frontend/src/components/ui/buttonClasses.ts", "frontend/src/components/art/Art.tsx",
    "frontend/src/lib/api/publicSite.ts",
])
for source in (ROOT / "frontend/src/components/ui").glob("*.tsx"):
    if ".test." not in source.name:
        source_paths.add(source.relative_to(ROOT).as_posix())
for name in ["auth", "phoneVerification", "customerAccount", "customerSupport", "customerNotifications", "orders", "quotes", "partners", "driverJobs", "driverCash", "client"]:
    source_paths.add(f"frontend/src/lib/api/{name}.ts")
for folder in ["customer", "partner"]:
    for source in (ROOT / f"frontend/src/features/{folder}/real").glob("*.ts"):
        if ".test." not in source.name:
            source_paths.add(source.relative_to(ROOT).as_posix())
for name in ["orders.ts", "partner.ts", "quantity.ts", "tankCapacity.ts", "publicSite.ts", "push.ts"]:
    source_paths.add(f"frontend/src/domain/{name}")

reference_records = []
missing_sources = []
for source_name in sorted(source_paths):
    source = ROOT / source_name
    if not source.is_file():
        missing_sources.append(source_name)
        continue
    raw = source.read_bytes()
    content = raw.decode("utf-8-sig").replace("\r\n", "\n").replace("\r", "\n")
    # Illustrative credential VALUES are excluded as well as real secrets.
    # Field names, type definitions and descriptions remain useful to reviewers.
    content, redactions = re.subn(
        r'(?i)("(?:password|current_password|new_password|csrf_token|access_token|refresh_token|session_token|api_key|secret)"\s*:\s*)"[^"\n]*"',
        r'\1"[REDACTED IN AUDIT COPY]"', content,
    )
    content, more = re.subn(r'(?im)^(\s*(?:Cookie|Set-Cookie|Authorization):).+$', r'\1 [REDACTED IN AUDIT COPY]', content)
    examples = 0
    if source.suffix == ".md":
        content, examples = re.subn(r'(?i)(password\s*(?:=|:)\s*)([\'\"])([^\n]*?)\2', r'\1"[REDACTED IN AUDIT COPY]"', content)
    target = PACK / "references" / source_name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8", newline="\n")
    reference_records.append({"originalPath": source_name, "originalSha256": hashlib.sha256(raw).hexdigest(), "copySha256": hashlib.sha256(target.read_bytes()).hexdigest(), "redactions": redactions + more + examples})

# Existing public logos are copied unchanged for visual reference, never redrawn.
brand = ROOT / "frontend/public/brand"
assets = [p for p in brand.iterdir() if p.is_file() and p.suffix.lower() in [".png", ".webp", ".svg"]] if brand.is_dir() else []
assets += list((ROOT / "frontend/public/fonts").glob("plus-jakarta-sans*.woff2"))
license_file = ROOT / "frontend/public/fonts/OFL.txt"
if license_file.is_file():
    assets.append(license_file)
for source in sorted(assets):
    target = PACK / "references" / source.relative_to(ROOT)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(source.read_bytes())
    reference_records.append({"originalPath": source.relative_to(ROOT).as_posix(), "originalSha256": hashlib.sha256(source.read_bytes()).hexdigest(), "copySha256": hashlib.sha256(target.read_bytes()).hexdigest(), "redactions": 0})
write("references/manifest.json", json.dumps({"commit": COMMIT, "note": "Reference copies only. Some illustrative credential values are redacted. Do not treat copied TSX as application code to run or modify.", "files": reference_records, "missing": missing_sources}, ensure_ascii=False, indent=2))

status_counts = Counter(r["status"] for r in CAPTURES)
png_count = len(list((PACK / "screenshots").rglob("*.png")))
case_count = len({r["id"] for r in CAPTURES})

write("README.md", f"""
# MmiriOma responsive redesign: current-interface reference pack

**Audit only · 4 November 2026 · source commit `{COMMIT}`.** This pack records the existing customer, tanker-driver and Keke-rider interfaces. It contains no redesigned screens and authorizes no implementation, contract, model, or workflow changes. The working branch was `feat/344-contact-page`, whose HEAD had been fast-forwarded to `origin/main` at this commit.

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

Playwright **{MANIFEST['playwrightVersion']}**, headless Chrome **{MANIFEST['browser']}**, isolated browser contexts, Africa/Lagos timezone, reduced motion, scale 1. Viewports: **390 × 844**, **768 × 1024**, **1440 × 1000**. These are CSS pixels; this is browser emulation, not physical-device certification.

At generation: **{case_count} screen/state cases**, **{len(CAPTURES)} viewport records**, **{png_count} PNG files** (including separately named bottom-of-scroll references). Statuses: {dict(status_counts)}. The screenshot manifest is the exact source for counts, final URLs, loading state, measured frames, scroll regions, alerts and any failed or redirected captures.

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
""")

def design_for(route: str) -> str:
    if route in ["/signup", "/partner/signup"]:
        return "handoff-v1; sign-up-password-and-terms; original auth prompt"
    if "verify-phone" in route or "profile/phone" in route:
        return "phone-verification; partner-phone-verification where applicable"
    if "/addresses" in route or "/order/details" in route or "/order/save-address" in route:
        return "handoff-v1; customer-device-location; service-zone amendments"
    if route.startswith("/order"):
        return "handoff-v1; customer-live-prices; customer-delivery-window"
    if "/cash" in route:
        return "driver-cash; cash-remittance"
    if any(s in route for s in ["/arrived", "/unreachable", "/failed"]):
        return "driver-arrival-unreachable"
    if route.startswith("/partner/"):
        return "handoff-v1 r-/t- screens; original driver/auth prompts (historical)"
    return "handoff-v1; pattern-derived screen where noted in route source"


def problem_for(r: dict) -> str:
    route = r["route"]
    if r["flag"]:
        return r["flag"] + "; no active screen to redesign"
    if route == "/partner":
        return "Redirect by vehicle; no independent page"
    if r["area"] in ["driver", "rider", "partner-shared"]:
        extra = "; absolute map/sheet composition" if any(s in route for s in ["/refill", "/customer", "/assigned"] ) else ""
        return "430 px default shell on larger screens; mobile navigation retained" + extra
    if route in ["/signin", "/signup", "/forgot-password", "/support/contact"]:
        return "480 px signed-out card at md; no desktop-specific auth composition"
    if route == "/home":
        return "1120 px desktop shell; two-column dashboard exists; not globally phone-capped"
    if route.startswith("/addresses") or route == "/orders" or re.fullmatch(r"/orders/:reference", route):
        return "1120 px shell; fixed 380 px left pane at xl; independent inner scroll"
    if route == "/menu":
        return "310 px drawer panel in full route; mobile menu pattern retained"
    return "1120 px outer shell at xl, but 720 px centered main/footer content"


inventory = """# Screen inventory

Source: the actual customer and partner route definitions at audit commit `59bda1a`; not the historical route names in old prompts. There are 90 unique route patterns, including redirects and disabled features. Parameters such as `:reference` and `:id` are route parameters, not extra screens. A path can show multiple lifecycle states.

## Styling and layout legend

**G** = `frontend/src/index.css` importing `styles/theme.css`, `styles/fonts.css`, `styles/motion.css`, `styles/base.css`, and `styles/components.css`, plus Tailwind utilities colocated in each `.tsx`. Customer and partner screens do **not** have separate per-page CSS files; the source snapshots show the exact class strings and inline/absolute positioning.

Customer signed-in routes are below `CustomerArea` → `ShellScope width="customer"` → `RequireRole` → `OrderDraftProvider`. `MobileShell` controls the frame. Auth/support routes explicitly use `ShellScope width="card"`. Partner routes have `RequireRole` and, for vehicle areas, `PartnerArea`/`VehicleGate`; they do not set a wider `ShellScope`, so the default is `phone`. Public partner auth uses that same default. `Splits.tsx` composes existing customer lists/details into panes at 1280 px.

Component links below lead to included source snapshots. Route line numbers refer to the original repository files. Design reference names resolve in [design-references.md](design-references.md). Shared screen components are preserved, not proposed for duplication.
"""
for area, title in [("customer", "Customer"), ("partner-shared", "Shared partner authentication and redirects"), ("driver", "Tanker driver"), ("rider", "Keke rider")]:
    inventory += f"\n## {title}\n\n| Route | Actual React component / source | Styling | Design reference | Existing constraint or status |\n| --- | --- | --- | --- | --- |\n"
    for r in INDEX["routes"]:
        if r["area"] != area:
            continue
        component = link(r["component_file"], r["component"]) if r["component_file"] else f"`{r['component']}` in `{r['route_file']}`"
        handoff_note = ("; source annotation: " + r["handoff_comment"].replace("|", "/")) if r["handoff_comment"] else ""
        inventory += f"| `{r['route']}` | {component}; route L{r['line']} | G + JSX | {design_for(r['route'])}{handoff_note} | {problem_for(r)} |\n"
inventory += """
## State and capture interpretation

The screenshot index maps each captured case to all three widths and records whether the requested route was actually rendered. Empty lists, 404s, validation errors, approval pending, phone-code entry, manual quotes, delivery-code waiting/locked/SMS-failed, failed delivery and success are separate cases rather than separate URL routes. Mock-only screens are not proof of real API availability. A bottom-scroll image is an additional view of the same case, not a new screen.

`/points` and partner earnings/withdrawal routes redirect because their flags are false even in mock mode. The tanker `.../pickup` alias intentionally redirects to `.../loading`; `/partner` chooses the signed-in partner's vehicle home. Do not propose replacement screens for these redirects. Driver/rider history, notifications, vehicle, profile, settings and cash pages share real components; the inventory lists both route families so tanker variants are not missed.

The customer `/profile/email`, some preference controls, partner documents and push prompts can be shown by mock mode but lack corresponding live MVP capability. See the feature-flag table in [api-dependencies.md](api-dependencies.md).
"""
write("screen-inventory.md", inventory)

write("layout-audit.md", """
# Layout audit

Audit commit `59bda1a`. Findings below distinguish source-confirmed policy, browser measurements, and risks needing future validation. No replacement screens or new API behavior are designed here.

## Shared architecture and the actual root cause

```text
App / RouterProvider / AppRoot
├─ customer signed-out route → ShellScope(card) → MobileShell
├─ CustomerArea → ShellScope(customer) → RequireRole → draft provider → page
│  └─ Orders / Addresses at xl → TwoPanes → Pane(list) + Pane(detail)
└─ PartnerArea → RequireRole → VehicleGate → page → MobileShell(default phone)
   └─ public partner auth also uses MobileShell(default phone)
```

The shell's width is a React context setting, not a Claude-specific token. `shellContext.ts` defaults to `{width: 'phone'}`. `MobileShell.tsx` maps that to `max-w-phone`. In `theme.css` that token is **430 px**. There is no tablet/desktop width branch for driver/rider pages. The later `data-scroll="window"` media query changes scrolling, not width. The existing driver layout is therefore implementing the approved narrow-column policy while conflicting with the new desktop-workspace objective.

Customer routes do set `width="customer"`: `max-w-phone md:max-w-customer xl:max-w-customer-wide` yields a 720 px tablet shell and 1120 px desktop shell. Most customer pages then get `XL_COLUMN` padding in `ScrollArea` and `Footer`, centering a **720 px content band** inside the wider shell. The dashboard explicitly opts out with `wide`; order/address split routes use `Pane` to opt out. A global claim that every customer page is still 430 px would be incorrect.

## Browser-confirmed representative widths

| View | 390 px viewport | 768 px viewport | 1440 px viewport |
| --- | --- | --- | --- |
| Customer signed-in shell | 390 px | 720 px | 1120 px |
| Customer form main/footer content policy | frame minus gutters | frame minus gutters | approximately 720 px band, then ordinary inner gutters |
| Customer signed-out card | 390 px | 480 px | 480 px |
| Driver/rider shell | 390 px | 430 px | 430 px |
| Menu panel | up to 310 px, max 85% of its shell | same panel rule | same panel rule |

The 1440 px driver frame occupies **29.9%** of viewport width and leaves **1010 px** outside the frame. A 1120 px customer frame occupies **77.8%**. A centered 720 px form band occupies **50%** before inner gutters. Maximum width alone is not a defect: readable forms and dialogs can remain capped while their surrounding workspace adapts. Actual measurements for each screenshot are in `screenshots/manifest.json`; the policy row for form content describes the padding rule, not a measured element pretending to be 720 px wide.

## Prioritized findings

| ID | Classification | Evidence and affected files | Consequence | Architectural correction to specify later |
| --- | --- | --- | --- | --- |
| L1 | Confirmed shared policy mismatch, high priority | `components/layout/shellContext.ts` default phone; `MobileShell.tsx` FRAME; `styles/theme.css` `--container-phone`; partner routes/`PartnerArea.tsx` have no wider scope | All driver/rider auth, dashboards, lists, details, proof and account screens retain the phone column on larger screens | Define a reviewed partner workspace-width policy independently from phone and readable-content widths; propagate it through the partner layout rather than widening pages one by one |
| L2 | Confirmed customer shared constraint, not universal missing responsiveness | `MobileShell.tsx` `XL_COLUMN` applied to normal `ScrollArea` and `Footer`; `CustomerArea.tsx` sets the wider shell | Settings, forms, checkout and tracking keep one centered content band; widening the shell token alone does not change their usable content | Make future handoff explicit about which existing content uses a readable column and which uses the workspace; keep main and footer aligned |
| L3 | Confirmed navigation policy | `CustomerChrome.tsx` / `BottomTabBar.tsx`: customer header nav at xl; `PartnerChrome.tsx` retains bottom tabs; `DrawerMenu.tsx` fixed 310 px panel | Driver desktop navigation still behaves like a mobile app; customer desktop has header links but its account drawer remains a route-sized mobile pattern | Specify navigation behavior for each viewport and role using existing destinations, active states and sign-out behavior; no new destinations assumed |
| L4 | Shared scroll/height coupling and future-change risk | `MobileShell.tsx`: `h-dvh overflow-hidden`; `components.css`: from 768 px phone scopes become auto-height, visible overflow, sticky header/footer/tabs; customer scope keeps inner scroll | Screens differ by scope and viewport; changing only width can introduce double scroll, missing footer or clipped dialogs | Decide the scroll owner per shell and pane; verify header/action placement, safe areas and short heights before altering frame rules |
| L5 | Confirmed narrow overlay architecture; future widening risk | `AssignedSheet.tsx`: `md:fixed md:mx-auto md:max-w-phone`, absolute bottom sheet; `DrawerMenu.tsx`: `w-[310px] max-w-[85%]`; `ConfirmDialog.tsx`: 420 px portal dialog | Some overlays remain constrained even if their parent is widened. Assignment overlay behavior is tied to the phone frame | Separate overlay bounds from workspace bounds; preserve focus, dismissal, destructive confirmation and in-flight states. A 420 px confirmation is not inherently wrong |
| L6 | Actual customer desktop adaptation exists; fixed split assumptions | `pages/Splits.tsx`: breakpoint `(min-width:1280px)`, fixed 380 px left pane and remaining detail pane; same child screen components reused | Existing two-pane work should be retained as evidence; it is not a missing desktop implementation. New pane policies must account for navigation and available content width | Reuse existing list/detail components and state; evaluate fit by available workspace, not by blindly copying another screen's breakpoint |
| L7 | Confirmed page-specific fixed composition | Customer `SignIn.tsx` 270 px hero; partner `PartnerLogin.tsx` 300 px hero and absolute artwork; `DriverTrip.tsx` absolute full-frame maps and bottom cards; `RiderTrip.tsx` / customer `Track.tsx` percentage-positioned art and fixed step grids | These scenes were composed for a phone. Global width removal may stretch art, detach context, or cause overlap on short screens | Review these page families separately after the shared shell policy; preserve meaning of navigation, progress, pickup and proof actions |
| L8 | Approval/implementation inconsistency | Responsive review decisions require 48 px interactive targets, while `theme.css` still sets `--spacing-touch:44px`; `.mo-ib` and bottom-tab/link minima remain 44 px in places, with selective `hit-48` use | The documents do not provide one consistently implemented target-size contract | Resolve and record a single approved target-size policy. Audit actual hit rectangles; a decorative icon's size is not its hit target |
| L9 | Verification gap | `mobileShell.test.tsx` checks class strings; `useMediaQuery` defaults false without matchMedia; jsdom does not perform browser layout | Tests can pass while an actual viewport remains narrow or clipped | Preserve unit tests for state logic and require real-browser viewport/geometry checks for visual acceptance |
| L10 | Confirmed shared navigation geometry issue | `BottomTabBar.tsx` hardcodes `grid-cols-4`; `PartnerChrome.tsx` supplies only Home, Orders and Profile while `PARTNER_PAY_ENABLED=false` | Three visible tabs occupy the first three of four grid tracks, leaving an unused right-hand track on every partner viewport | Match track count to the enabled destinations while preserving the feature flag; do not restore Earnings merely to fill space |

## Screen-specific review points

- **Authentication/registration:** customer auth gets the 480 px card scope; partner login/registration and shared partner recovery/password pages remain in the 430 px phone scope. Both use the same underlying form primitives. Treat these as differing wrapper policies, not a reason for separate form implementations per device. The sign-in hero heights remain fixed. Long registration forms need both first-viewport and bottom-scroll references.
- **Customer dashboard:** a true xl grid exists; its hero spans both columns, and Keke/tanker cards sit side by side. It should not be described as unresponsive merely because it has outer margins. Inspect card art, dense secondary actions and reading order before changing it.
- **Address management/order history:** split routes are real React branches at xl, not CSS-only duplications. The same `Orders`, `OrderDetail`, `SavedAddresses` and `AddressForm` components fill panes. Avoid duplicated query/mutation ownership when preserving this reuse.
- **Ordering/quotes/tracking:** mobile step order, quantity validation, area choices and quote/manual-quote states remain one workflow. Existing content stays centered through shared padding. The four-step tracking row and map art deserve individual checks; do not invent a live map/ETA from the illustrative mock state.
- **Driver dashboard, deliveries and details:** reusable job cards and stats are stacked within the phone shell. Available work, assigned work and active jobs have different actions and ownership. The assignment sheet is a distinct state over the dashboard, not the default unobstructed dashboard.
- **Pickup/loading/proof:** tanker loading uses a gauge/counter and receipt/photo controls; Keke pickup has different checks. These differences are functional and should not be erased as apparent visual duplication. Code waiting, SMS failure, expired/locked code, delivery success and incident reporting must remain distinguishable.
- **Forms/dialogs:** a narrow form or destructive-confirmation dialog can be intentionally readable on desktop. The gap is the surrounding workspace policy and missing explicit larger-screen handoff, not every max-width declaration. Existing portal focus/scroll protections should be preserved.

## Breakpoints and Tailwind

The current reviewed layout thresholds are 768 px (`md`) and 1280 px (`xl`). Tailwind's `sm` is also used for details such as auth borders and centering confirmation dialogs from 640 px. That is not automatically incorrect; the future specification should distinguish structural breakpoints from component-level adaptations. The responsive classes are present in the built CSS: this audit found no evidence of a blanket Tailwind compilation failure or missing viewport meta tag.

Source-confirmed additional constraint: below 768 px, all FRAME variants still have `max-w-phone` (430 px). At viewport widths from 431 to 767 px, they remain a centered 430 px frame rather than filling the width. This follows the class rules; those intermediate widths were not added to the three requested screenshot sets.

No proof was found that an AI-provider token incompatibility causes these constraints. The repository contains normal CSS custom properties and Tailwind classes. Colors and fonts should not be replaced to solve layout width.

## Overflow, clipping, fixed elements and duplication

At the three requested viewport sizes, all completed capture records had document scroll width no greater than viewport width, and the measured buttons, links, inputs, selects, textareas, headings and dialogs had no horizontal viewport outliers. No document-level horizontal overflow was reproduced. The capture manifest records these measurements per case. This is not a claim that every nested component, scroll position or viewport height is overflow-free: the check omits decorative map art and can miss content clipped by an ancestor. Compare child bounds to the relevant container in future implementation acceptance.

Customer/partner frames clip at phone sizes, customer pages keep internal scrolling on larger screens, and partner pages switch to window scrolling. Fixed and sticky elements therefore need a separate short-height and virtual-keyboard pass. The three requested captures establish the recorded widths/heights only; they do not establish every height/zoom condition.

Shared stateful screens are largely reused across sizes. The customer two-pane implementation explicitly composes the same screens. Rider/tanker trip files differ because their physical loading workflows differ; the audit does not classify those as unnecessary viewport duplication. Do not create parallel desktop copies that could drift in API/error behavior.

## Acceptance evidence to require from a future handoff

Specify outer workspace, readable content, navigation, scroll owner, pane/overlay behavior, safe areas and existing states for each page family at mobile/tablet/desktop. Check at the requested widths plus around actual breakpoint boundaries and at shorter heights/zoom. Verify interactive controls and primary actions remain reachable. Approval should explicitly replace the prior driver phone-column decision before implementation begins. These are review requirements, not new screen designs.
""")

write("component-inventory.md", """
# Component inventory: reuse and preservation

All paths below are real project paths retained under `references/` where included. Abbreviated `layout/`, `ui/`, `brand/` and `art/` paths are below `frontend/src/components/`; abbreviated `customer/`, `partner/` and `auth/` paths are below `frontend/src/features/`. Styling uses Tailwind utilities and global `frontend/src/styles/*`; there is no separate customer/driver CSS framework. Do not introduce an AI-provider-specific design system.

## Shells, routing and state

| Existing component / file | Current responsibility | Preserve in later work |
| --- | --- | --- |
| `components/layout/MobileShell.tsx` | MobileShell, TopBar, ScrollArea, Footer, back/menu/profile/notification links; scope-controlled width | Header/actions, safe-area padding, reading order; separate shell width from content width |
| `layout/ShellScope.tsx`, `shellContext.ts` | Width/nav context and Pane context | One source of width policy; pane-aware bars/footers |
| `features/customer/CustomerArea.tsx` | Customer role guard, width, draft provider and leave-order guard | Same protected routes and draft ownership |
| `features/partner/PartnerArea.tsx`, `partnerContext.ts` | Driver role, vehicle gate, rider/tanker wording and trip-step routing | Same vehicle/assignment boundaries and step guards |
| `features/customer/pages/Splits.tsx` | Existing desktop order/address list-detail composition | Same child screens and queries, not cloned desktop business logic |
| `features/auth/RequireRole.tsx`, `SessionRedirects.tsx` | Session loading/error, signed-in/out redirects | No sign-in flash, wrong-role leakage or new authentication mechanism |
| `features/customer/order/OrderDraftProvider.tsx`, `draft.ts` | Draft storage, address/quantity choices, idempotency key | Retry safety and field retention; no prices stored as authoritative client data |
| `customer/queries.ts`, `partner/queries.ts` | TanStack Query keys, refresh, polling and mutations | Existing loading/error handling and mutation invalidation |

## Navigation

| Pattern | Actual implementation | Responsive context |
| --- | --- | --- |
| Customer tabs/header links | `customer/components/CustomerChrome.tsx`, `customerNav.ts` | Bottom tabs below xl; header navigation from 1280 px |
| Driver/rider bottom tabs | `partner/components/PartnerChrome.tsx` using `BottomTabBar.tsx` | Three enabled destinations in a hardcoded four-track grid; bottom navigation remains on larger screens |
| Full-route drawer | `layout/DrawerMenu.tsx`; customer Menu and partner PartnerMenu supply content | 310 px panel, max 85% of shell; Escape/backdrop/close routing |
| Trip navigation | `partnerContext.ts`, `JobStep.tsx` | Guarded by stage/arrival/unloading state, not arbitrary navigation tabs |
| Public/role-aware logo | `brand/Logo.tsx`, `HomeLogo.tsx`, `logoTarget.ts` | Keep official assets and appropriate destination, never redraw |

## Reusable UI primitives

| Source | Existing exports / patterns | What must survive |
| --- | --- | --- |
| `components/ui/Button.tsx`, `buttonClasses.ts` | Button, ButtonLink, ExternalButton; primary/alt/line/danger/small states | Disabled/loading labels, link vs action semantics, visible focus |
| `ui/IconButton.tsx` | IconButton, IconLink, badge/dot states | Accessible names, adequate hit area, current destinations |
| `ui/Field.tsx` | TextField, TextAreaField, password show/hide, hints and errors | Visible labels, error associations, phone/number input behavior |
| `ui/Choice.tsx` | OptionTile, RadioDot, RadioRow | Selection and keyboard semantics, explicit labels |
| `ui/Controls.tsx` | Segmented, PageTabs, Pills, Toggle/ToggleKnob | Active/disabled states, intentional horizontal filtering and touch area |
| `ui/Card.tsx` | Card, CardLink, CARD class constant | Card/link semantics and current token values |
| `ui/Content.tsx` | ScreenHeading, SectionTitle/Header, KeyValue, IconBadge, ActionTile, MenuItem, StepBar | Current wording, data formatting and hierarchy |
| `ui/Chip.tsx`, `Avatar.tsx` | Status chips, SampleTag, initials/tones | Status words + icon, simulation disclosure, official blue/green role cues |
| `ui/Notice.tsx` | Information/warning/error/success notices | Error text, action/retry affordance, status distinctions |
| `ui/CodeEntry.tsx` | CodeBoxes and Keypad | Physical keyboard support, six-digit limit, invalid/locked states; not a new proof method |
| `ui/PasswordChecklist.tsx`, `auth/SignUpSecurityFields.tsx` | Shared signup checklist, confirm-password, age/terms checkbox | Current approved password and consent rules |
| `layout/StateScreens.tsx` | LoadingBlock, WaterLoader, LoadingScreen, ErrorBlock/ErrorScreen, EmptyBlock | In-flight vs empty vs failed distinction, retry and accessible status |
| `ui/ConfirmDialog.tsx` | Portal alertdialog, 420 px max width, safe initial focus, trap/restore focus, Escape/backdrop, scroll lock | Preserve protections; no automatic confirmation or destructive-action shortcut |
| `ui/Admin.tsx` | MiniButton/MiniLink and DataTable reused by shared screens | Use only where currently needed; admin redesign is outside this pack |

## Domain-specific components

| Source family | Reusable existing pieces | Preserve |
| --- | --- | --- |
| Customer `components/OrderBits.tsx`, `OrderParts.tsx` | Order list/recent cards, price/quantity/summary rows | Real vs sample amounts and honest unknowns |
| Customer `components/AreaPicker.tsx`, `LocationCard.tsx`, `PinMap.tsx` | Service-area choice, optional location explanation/finding/error/map states | Manual address fallback; no automatic permission request |
| `auth/PhoneCodeParts.tsx` | Shared request/code/success/notice presentation | Verification and phone-change purposes remain distinct |
| Partner `components/JobParts.tsx` | Job cards, quantity/source/customer details and role chips | Data minimization, stage-specific actions |
| Partner `components/JobStep.tsx`, `StepError.tsx` | Stage guarding and failure/retry states | Do not show wrong step after refresh/reassignment |
| Partner `components/AssignedSheet.tsx` | Assigned-order overlay on real dashboard | Explicit accept or reasoned decline, assignment and loading/error states |
| Partner `components/AttemptList.tsx`, `ArriveButton.tsx` | Arrival confirmation and contact-attempt records | Server-allowed steps and attempt conditions |
| Partner `cash/CashParts.tsx`, `CashPages.tsx` | Cash card, record cash, My cash, handover | Integer-kobo amounts, custody states and explicit actions |
| `components/art/Art.tsx` and `brand/Illustration.tsx` | Existing map artwork, gauges, brand vehicle/water illustrations | Distinguish illustrative art from actual navigation/telemetry |

## Drawers and dialogs are not all the same

`DrawerMenu` is a routed menu, `AssignedSheet` is an assignment modal over the dashboard, and `ConfirmDialog` is a destructive/sensitive-action alertdialog. `AreaPicker` and `LocationCard` are inline form components in the current implementation; do not infer an existing modal just from the word picker. Preserve these differing interaction and workflow rules.

## Duplication assessment

No new device-specific screen copies are recommended by this audit. Customer panes reuse existing components. Partner shared history/account/cash/code components serve both vehicles through context. The separate Keke pickup and tanker loading compositions support different operational inputs, so they are functional variants rather than proven unnecessary duplication. A future refactor should address repeated presentation only after preserving data ownership, validation and mutation behavior.
""")

design_rows = []
for name in docs:
    if not name.startswith("docs/design/") or "/prompts/" in name:
        continue
    record = next((d for d in INDEX["documents"] if d["path"] == name), None)
    if not record:
        continue
    approval = "; ".join(m["text"] for m in record["status_mentions"] if "Status" in m["text"] or "Reviewed" in m["text"])
    if name == "docs/design/handoff-v1.md":
        approval = "Handoff approved by @chidimmamogbo for this frontend on 2026-10-16; service-zone amendment separately approved G2 by @nnamdi-security on 2026-10-26"
    urls = ", ".join(f"[recorded canvas]({u})" for u in record["design_links"]) or "No external canvas URL recorded in this document"
    design_rows.append(f"| {link(name, name.split('/')[-1])} | {approval or 'Read its recorded handoff/decision text'} | {urls} |")
prompt_rows = "\n".join(f"- {link(n)}" for n in docs if "/prompts/" in n)

write("design-references.md", """
# Design references and authority

## Resolve the two design generations before designing

1. The current PRD and **SRS v0.3 (19 October 2026)** define product requirements and business rules; the SRS is normative. Source copies: [PRD](references/MmiriOma_MVP_PRD.md), [SRS](references/MmiriOma_MVP_SRS.md). Later agreed API contracts/amendments describe the current linked MVP behavior; apparent gaps are not permission to add new business rules during a layout redesign.
2. [CLAUDE.md](references/CLAUDE.md) describes the present organization repository, contribution and adapter architecture. No Git mutation or implementation is performed in this audit.
3. [handoff-v1.md](references/docs/design/handoff-v1.md), approved for this frontend on **16 October 2026**, explicitly replaces the older Noto Sans design system and authentication visual design for this codebase. Its underlying `design/MmiriOma-design-handoff/` PNG/HTML/token files are git-ignored and **absent from this checkout**.
4. Subsequent approved feature designs (phone verification, signup terms/password, live pricing, delivery windows, optional location, cash, arrival/unreachable) amend the handoff where recorded. The 3 November [responsive specification](references/docs/design/responsive.md) controls the current width/layout policy. It explicitly keeps partners at phone width.
5. Actual current visual values are recorded in `frontend/src/styles/theme.css` and existing components. They match the later handoff interpretation described in frontend architecture. Do not silently switch branding back to the older canvas because its file is named `design-system.md`.
6. The 4 November user brief asks for proper customer and driver desktop use. That reopens the current driver-width policy. This pack is evidence for review; no new desktop screens or handoff are marked approved here.

## Branding to preserve from the current frontend

| Item | Actual current value / source |
| --- | --- |
| Font | Plus Jakarta Sans, weights 400–800, with existing offline fallback; `styles/fonts.css` / `theme.css` |
| Primary | `#1570D8`; primary-dark `#0B4FA8`; ink `#0A2540` |
| Brand accents | navy `#054D6D`, deep-blue `#097CA0`, ocean `#16A0B8`, turquoise `#26C0C1`, gold `#F2B33D` |
| Role cues | Existing blue customer/Keke patterns and green tanker pattern; preserve current semantics |
| Main surfaces | canvas `#F4F7FB`, white surface, sky `#EAF3FE`; existing semantic text/background pairs |
| Type | title 24 px, body 14 px / 1.45, section 16 px, input 15 px, existing caption/label scales; these are current values, not a fresh accessibility approval |
| Layout tokens | phone 430 px; customer 720 px; customer-wide 1120 px; card 480 px; gutter 18 px |
| Other tokens | Card radius 20 px, input radius 12 px, current shadows and transform/opacity motion; reduced-motion behavior |
| Logos and illustration policy | Use actual `frontend/public/brand/` files and `Logo`/`Illustration` components. Brand asset copies are included unchanged under `references/frontend/public/brand/`; never redraw them |

The older document records **Noto Sans**, primary `#0B6786`, 16 px body and a 48 px target minimum. The later handoff uses Plus Jakarta Sans / `#1570D8` and 44 px baseline hits with later selective 48 px changes. These are documented generations, not interchangeable token sets. The newer responsive decision again calls for 48 px interactive targets while the code token remains 44 px. That specific inconsistency needs a recorded decision/implementation review. Enlarging page width does not resolve it.

## Existing approved references

Approval statements below are recorded metadata in the repository, not a fresh approval by this audit. The old file's approval does not override the later handoff/screen amendments. External canvas versions may differ today and were not authenticated or compared pixel-for-pixel.

| Source snapshot | Recorded approval/status | Existing external reference |
| --- | --- | --- |
""" + "\n".join(design_rows) + """

## Original Claude Design prompts

The following original prompt files are included as historical input. They must be read alongside later decisions, not pasted as current requirements without reconciliation.

""" + prompt_rows + """

Important conflicts: prompt 01 permits a centered max-width desktop customer column and describes early manual phone verification/no price. Prompt 03 explicitly asks for a 360 px phone-only driver design and says drivers do not use desktops. Later SMS verification, pricing, partner registration, cash and arrival designs supersede those early behavior assumptions. The new desktop brief should preserve the current contracts, not revive historical placeholder flows.

## Missing or incomplete references

| Gap | Why it matters / next information needed |
| --- | --- |
| Original `design/MmiriOma-design-handoff/` (`screens-png/`, `screens-html/`, `tokens/mo.css`, `tokens/tokens.json`) absent | Cannot certify pixel parity with the approved 57-screen visual pack. Obtain the version approved on 16 October and its README/index |
| Standalone `docs/design/customer-ordering.md` and `docs/design/driver-deliveries.md` absent | Original prompts reference early screen slices, but this checkout's active reference is the handoff plus later amendments; do not invent missing approvals |
| No approved expanded desktop driver workspace specification | Original phone-only prompt and current approved 430 px policy differ from the new objective; reviewer must decide replacement responsive behavior |
| Pattern-derived screens lack individual original artboards | Handoff lists added address/account/recovery/partner-registration/tanker-assignment screens. Their origin is a reused pattern, not an unseen approved PNG |
| Several late features are text designs without external canvas | The recorded Markdown describes their states; obtain any private artboards if pixel references are required |
| Physical tablet review, short-height/keyboard/zoom evidence | A 720 px customer tablet width was explicitly conditional on looking at a real tablet. Headless viewport captures do not prove that review occurred |
| External canvas access/version | Recorded URLs are supplied for authorized review; mutable canvas links alone do not establish the approved historical revision |

## Inconsistencies to carry into the review

- Broad handoff statement “responsive on phone, tablet and desktop” coexists with a phone-only original driver prompt and a later explicitly narrow partner policy. Describe the requested change as a revised desktop policy, not only a missing media query.
- Legacy design-system/authentication documents still appear approved, while the chosen handoff says it replaces their visual system. New designers must be given the authority order above.
- Current component behavior and several older feature docs refer to different route generations (`/sign-in`, `/request`, `/driver` versus current `/signin`, `/order`, `/partner/driver`). The screen inventory uses actual current routes.
- Some mock fields/actions are richer than real contracts: email/preferences/photo, documents, push and sample earnings. Preserve flags and real-mode honesty rather than treating every visible mock control as an approved production capability.
- No blanket absence of responsive CSS was found. Customer desktop grids and list/detail panes exist; the main conflict is selected scope/content rules and missing enlarged driver specifications.
""")

write("api-dependencies.md", """
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
""")

groups = {}
for r in CAPTURES:
    groups.setdefault(r["id"], []).append(r)
shot_index = """# Existing-interface screenshots

**Current implementation, simulated data, not redesigned screens.** Captured at 390×844, 768×1024 and 1440×1000 CSS pixels. See [offline gallery](index.html) and [manifest](manifest.json). The small audit stamp is capture-only. Filenames ending `--bottom.png` show the bottom of an existing scroll region, not a separate screen. Mock-only controls and mock timing are not production contracts.

| Case / state | Requested route | 390 px | 768 px | 1440 px |
| --- | --- | --- | --- | --- |
"""
gallery = ["<!doctype html><html lang='en'><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>MmiriOma current UI audit references</title><style>body{font:15px/1.5 system-ui;margin:24px;color:#182b42;background:#f4f7fb}h1{margin-bottom:4px}.case{background:white;padding:16px;margin:20px 0;border:1px solid #d5dfeb;border-radius:10px}.views{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.views img{width:100%;height:auto;border:1px solid #d5dfeb}code{overflow-wrap:anywhere}.note{color:#56677d}@media(max-width:850px){.views{grid-template-columns:1fr}}a{color:#0b4fa8}</style><h1>MmiriOma: current interfaces</h1><p>SIMULATED DATA · documentation only · source 59bda1a · 4 November 2026</p><p>Existing mobile, tablet and desktop UI. This gallery is a reference viewer, not a redesign. Open images for native resolution. External APIs and map/font services were blocked; see the capture notes and manifest.</p><p><a href='../README.md'>Reference pack</a> · <a href='manifest.json'>Capture measurements</a></p>"]
for ident, rows in sorted(groups.items()):
    ordered = {r["viewport"]["width"]: r for r in rows}
    cells = []
    gallery.append(f"<section class='case' id='{html.escape(ident)}'><h2>{html.escape(ident)}</h2><code>{html.escape(rows[0]['requestedRoute'])}</code><p class='note'>State: {html.escape(rows[0]['state'])}; account: {html.escape(rows[0]['account'])}</p><div class='views'>")
    for width in [390, 768, 1440]:
        r = ordered.get(width)
        if r and r.get("file"):
            file = r["file"].removeprefix("screenshots/")
            cell = f"[{r['status']}]({file})"
            bottom = r.get("bottomFile", "").removeprefix("screenshots/")
            if bottom:
                cell += f"; [bottom]({bottom})"
            if r["status"] != "captured":
                cell += f" → `{r.get('actualRoute', r.get('reason', ''))}`"
            gallery.append(f"<div><h3>{width} px · {html.escape(r['status'])}</h3><a href='{file}'><img loading='lazy' src='{file}' alt='{html.escape(ident)} at {width} px'></a>" + (f"<p><a href='{bottom}'>Bottom of scroll area</a></p>" if bottom else "") + "</div>")
        else:
            reason = r.get("reason", "Not captured") if r else "Not captured"
            cell = reason.replace("|", "/")
            gallery.append(f"<div><h3>{width} px</h3><p>{html.escape(reason)}</p></div>")
        cells.append(cell)
    gallery.append("</div></section>")
    shot_index += f"| {ident} ({rows[0]['state']}) | `{rows[0]['requestedRoute']}` | " + " | ".join(cells) + " |\n"
gallery.append("</html>")
shot_index += """

## Routes without independent screenshots

All 83 active screen route patterns have at least one captured state at each requested width. The remaining seven entries in the 90-pattern inventory are redirects, not independent visual screens:

| Route | Reason / existing destination |
| --- | --- |
| `/points` | `POINTS_ENABLED=false`; redirects to `/home` |
| `/partner` | `PartnerHomeRedirect` selects the current vehicle home |
| `/partner/rider/earnings`, `/partner/rider/earnings/withdraw` | `PARTNER_PAY_ENABLED=false`; redirects to rider home |
| `/partner/driver/earnings`, `/partner/driver/earnings/withdraw` | Same disabled flag; redirects to driver home |
| `/partner/driver/jobs/:reference/pickup` | Compatibility alias redirects to the tanker's `/loading` step, which is captured |

Real-device behavior, production-only responses, real maps/geolocation permissions, external canvases and every possible server-error variant were not captured. Screens behind mock-only flags are identified in the inventory and API notes. Initial readiness/fixture problems were corrected and the affected images repeated; the final manifest has no unavailable or redirected capture records.
"""
write("screenshots/index.html", "\n".join(gallery))
write("screenshots/README.md", shot_index)

print(json.dumps({"documents": 6, "routePatterns": len(INDEX['routes']), "caseCount": case_count, "viewportRecords": len(CAPTURES), "pngFiles": png_count, "captureStatuses": dict(status_counts), "referenceFiles": len(reference_records), "missingReferenceFiles": missing_sources}))
