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
