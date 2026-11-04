# Responsive customer and partner layouts

## 1. Overview and purpose

On 4 November 2026 the user requested that customer, Keke-rider and tanker-driver
pages stop appearing as narrow mobile columns on larger screens. The shared
workspaces now fill the available width. The existing mobile workflows, branding,
fields and actions remain in place. This supersedes the former 430 px partner
policy and customer 720 px content band; it does not introduce a new visual brand.

## 2. Feature workflow

Phones retain one-column pages with reachable footer actions. Larger screens use
the available width, with two/three-column driver dashboard and delivery-card
grids, two-column delivery details/code entry and the existing customer
list/detail panes. At 1280 px primary navigation moves to the header for both
roles. Authentication forms are full-width on phones and capped at 768 px on
larger screens for readable inputs. Assignment sheets become centered dialogs
up to 640 px with a maximum height and internal scrolling; routed account menus
expand up to 720 px. Neither limit constrains the surrounding app workspace.

## 3. Important files and responsibilities

- `frontend/src/components/layout/MobileShell.tsx`, `shellContext.ts`,
  `ShellScope.tsx`: fluid customer/partner scopes, explicit auth/legacy policies,
  shared header and consistent main/footer bounds.
- `frontend/src/styles/components.css`: workspace gutters, window scrolling and
  sticky grouped headers/actions on larger partner screens.
- `frontend/src/features/customer/CustomerArea.tsx` and
  `frontend/src/features/partner/PartnerArea.tsx`: apply the scope around role
  guards as well as loaded pages.
- `frontend/src/features/partner/routes.tsx`: auth and shared account scopes.
- `PartnerChrome.tsx`, `BottomTabBar.tsx`: one enabled partner destination list,
  active links, desktop header and evenly divided mobile tabs.
- `DriverHome.tsx`, `RiderHome.tsx`, `DriverOrders.tsx`, `AvailableOrders.tsx`,
  `PartnerShared.tsx`, `JobDetail.tsx`, `CodeStep.tsx`: responsive presentation of
  the existing data and actions. Code entry retains keyboard operation.
- `DriverTrip.tsx`: the absolute refill-map scene explicitly keeps a viewport
  height; its action card scrolls and moves to a side of the wider map.
- `AssignedSheet.tsx`, `DrawerMenu.tsx`: adapt overlay bounds independently of
  the workspace; preserve acceptance/decline and menu close behavior.
- `frontend/scripts/check-responsive-layout.cjs`: real-browser width, overflow,
  navigation, keyboard and action-reachability checks with isolated simulated
  fixtures. It requires an existing Playwright installation, not a new runtime
  application dependency.

## 4. Database models and relationships

None changed. This is a frontend layout correction.

## 5. API endpoints and request/response behavior

None changed. Screens continue through the same feature APIs, query hooks and
real/mock adapters. Existing contracts are mapped in
[the baseline audit](../design/responsive-redesign/api-dependencies.md).

## 6. Important business rules

No changes to quote calculation, order idempotency, partner eligibility,
approval, vehicle payload, assignment, unloading, proof codes, cash custody or
feature flags. Earnings remains disabled; its missing tab no longer leaves an
unused grid track. Responsive views reuse the same state and mutations.

## 7. Authentication and authorization

Existing role/vehicle guards remain unchanged. Width scopes wrap loading/error
views as well as authorized pages. No new authentication or permission is added.

## 8. Error handling and edge cases

Existing empty, loading, validation, unavailable quote, locked code, SMS failure
and retry states remain. Customer panes keep independent scroll regions.
Partner pages use window scrolling from 768 px, except viewport map scenes and
menus. Scrollable assignment cards keep their accept/decline controls reachable
at short viewport heights. Optional location and manual address entry are unchanged.

## 9. Testing instructions

From `frontend/`, run the existing lint, typecheck, Vitest and build commands.
The layout unit tests cover scope and scroll-owner selection, panes and header
composition. Real geometry requires a browser, not jsdom.

For browser regression checks, start the existing app in mock mode:

```bash
VITE_USE_MOCKS=true VITE_VAPID_PUBLIC_KEY= npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

In a second terminal, from `frontend/`:

```bash
PLAYWRIGHT_MODULE=/path/to/installed/playwright node scripts/check-responsive-layout.cjs --boundaries
```

`--full` expands the three standard viewport checks to all 113 baseline states.
`--only '<regular-expression>'` runs selected named cases for focused follow-up.
The default covers representative customer and both vehicle workflows at
390, 768 and 1440 px. `--boundaries` adds 360, 600, 1024, 1279, 1280 and 1920 px
checks plus 568 px-high desktop/phone viewports. Checks assert actual workspace
width, horizontal overflow, visible navigation, tab alignment, assignment-action
reachability and physical-keyboard code entry. Existing mock fixtures are reset
in isolated contexts; API and external requests are blocked. No credentials or
browser storage exports are written. Results and selected simulated screenshots
are saved under the OS temporary directory (`mmirioma-responsive-checks`), or
`AUDIT_OUTPUT` when explicitly supplied.

Verified on 4 November 2026:

| Check | Result |
| --- | --- |
| Real-browser regression | 150 passed across 11 viewport sizes, plus 9 focused account-menu checks; no horizontal overflow or browser runtime errors |
| Measured app workspace width | Customer, tanker and Keke homes: 390/768/1440 px at those viewport widths; customer delivery details likewise |
| Frontend Vitest | 125 files, 1,632 tests passed, with two workers |
| Frontend typecheck/build | Passed; real-mode build also passed the existing demo-value exclusion check |
| Frontend lint | Passed |
| Backend lint/format | Passed; 258 files already formatted |
| Backend regression | 1,745 passed, 307 skipped, 23 existing Windows Bash/deployment-script failures; backend and deployment sources unchanged |

The 21 representative screenshots and 9 menu screenshots are synthetic browser
references in the temporary output folders, kept separate from the original
before-change audit. The full frontend suite emits jsdom's existing unsupported
`window.scrollTo` notices; these do not fail the tests. The build retains its
previously documented PWA plugin deprecation and large-chunk warnings.

## 10. Known limitations

This is headless browser coverage, not physical-device or native PWA certification.
OS virtual keyboards, arbitrary browser text zoom, external mapping providers and
every possible production response need their usual acceptance review. The
original approved visual handoff assets remain absent from the checkout.
The baseline audit and its screenshots describe commit `59bda1a` before these
changes; do not overwrite that evidence with current screenshots or treat its
old widths as the present implementation.

Issue-log entries: [layout caps](../log/2026-11-04-customer-partner-phone-width-caps.md),
[format-command quoting](../log/2026-11-04-responsive-format-command-quoting.md),
and [verification environment notes](../log/2026-11-04-responsive-checks-config-discovery.md).
