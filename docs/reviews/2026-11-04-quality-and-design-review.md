# Quality and design review — 4 November 2026

## Scope and result

Local review of the current customer, Keke rider, tanker driver and public-site
changes on `fix/fluid-customer-partner-layout`. The owner requested bug fixes,
professional visual review and a fuller partner account banner. Existing
branding, forms, business workflows, API contracts and database models remain.
This review is not a claim that every possible defect or production condition
has been eliminated. No commit, push, merge or deployment was performed.

## Corrections made during this review

| Finding | Correction | Actual files |
| --- | --- | --- |
| Persisted pending tour could not be dismissed when storage writes failed but reads worked | Latest failed-write memory preference takes precedence; successful writes and later cross-tab events clear it | `frontend/src/features/onboarding/tourStorage.ts` |
| A manually replayed pending welcome appeared again on the next eligible home visit | Replay consumes pending registration guidance while preserving prior completion | `frontend/src/features/onboarding/WelcomeTour.tsx` |
| Screen readers missed the destination shown in the decorative tour diagram | Include the destination in the dialog's accessible step description | `frontend/src/features/onboarding/WelcomeTour.tsx` |
| Automatic tour could compete with another modal, including a sibling mounted in the same render | Observe committed native/ARIA modals through an external store; defer and retain pending status | `frontend/src/features/onboarding/WelcomeTour.tsx` |
| Bright teal heading text was under the large-text contrast threshold | Reuse existing dark teal `#0E6F74`; minimum hero contrast increases from 2.77:1 to 5.36:1 | Marketing `marketing.css`, `AboutPage.tsx`, `FaqPage.tsx`, `ContactPage.tsx`, `MarketingParts.tsx` |
| Partner account banner looked empty and excluded tanker drivers visually | Show explanatory copy at every width and both existing vehicle assets, with captions and responsive normal-flow layout | `frontend/src/components/layout/AuthLayout.tsx`, `frontend/src/styles/components.css` |
| Setup instructions allowed an older Node 24 than the locked test tools support | Document Node 24.15+ within the 24.x line | `README.md` |

Regressions are covered by `WelcomeTour.test.tsx`, the existing marketing
contrast tests and `frontend/scripts/check-first-time-tour.cjs`. The first
regression run reproduced the storage, replay and accessible-description
failures. The initial broad frontend run found the modal first-commit race;
the final complete suite passed after its correction.

## Design assessment

The inspected layouts now have a consistent blue/navy/teal palette, a clear
heading/action hierarchy and readable spacing. Customer and partner workspaces
fill their available width while inputs keep a readable line length. The new
partner banner explains who the app serves and what it does, rather than
depending on an isolated small vehicle. At 640–1023 px its copy and fleet share
a row; on smaller screens and in the desktop side column they stack. Vehicles
and copy stay within the banner and do not overlap.

The supplied and owner-requested imagery retains its proportions. Recruitment
artwork and phone previews were inspected after image decode. Phone frames,
copy and install actions fit within their white cards. The phone images are
captures of the actual app using labelled synthetic data. Some other marketing
assets were generated in earlier owner-requested work; they must not be
represented as documentary photographs of real employees or deliveries.
The supplied three-scene guide reuses its phone scene for the fourth step;
original photography for each workflow step remains a possible future asset
improvement, not a changed business rule.

The headline and droplet retain their restrained transform animations. The
owner explicitly requested no pause control; none was reintroduced. Both stop
under `prefers-reduced-motion: reduce`. Keyboard focus, modal inertness,
reachable actions and 200% effective desktop zoom are covered by browser checks.
This is a practical design assessment, not an award or a formal accessibility
certification.

## Verification

| Check | Result |
| --- | --- |
| Frontend full Vitest suite | **1,647 passed, 126 files**; final run 503 seconds, two workers |
| ESLint and TypeScript | Passed |
| Real-API-mode production build | Passed, including the service worker |
| Demo-value exclusion | Passed: 214 build files, 70 values checked |
| Customer/partner Playwright matrix | **419 passed, zero failed**: 113 screen/state cases at 390/768/1440 px, plus 80 breakpoint/short-height cases |
| Public design and revised partner banner | **32 passed**: partner login/signup at ten widths from 320 to 1920 px; six public routes at 390/1440 px |
| Tour/signup/logo/artwork browser matrix | **25 passed**, including existing-modal priority and full-storage dismissal across client-side navigation |
| Phone-card fit and motion browser matrix | **12 passed**: eleven widths from 320 to 1920 px plus normal-motion behavior; no pause control and reduced-motion handling verified |
| Backend Ruff lint and format | Passed, 258 files already formatted |
| Backend non-deployment pytest | **1,724 passed, 307 skipped** |
| Deployment configuration checks that do not execute Unix scripts | **21 passed, 23 deselected** |
| Deployment script syntax | All seven `deploy/*.sh` files passed Git Bash `bash -n` |
| Python dependency consistency | `pip check` passed |
| npm production dependency audit | **Zero reported vulnerabilities** |
| npm full dependency audit | **21 development/build advisories: 19 moderate, 2 low; no high/critical** |
| Tracked package manifests and lockfile | Unchanged by this review; npm fix investigation was dry-run only |
| Diff whitespace check | Passed |

The 419-case matrix covers authentication, registration/verification, shared
navigation, customer dashboard, addresses, Keke/tanker ordering, quotes,
history/tracking, receipt/feedback, profile/settings and partner registration,
dashboards, assigned/available orders, trip details, pickup, arrival,
unreachable-customer handling, unloading/code proof and cash records. Loading,
empty, error, validation, assignment dialogs and success states are included.
All browser accounts and data are synthetic; production requests are blocked.

Public visual routes: `/`, `/about`, `/faq`, `/contact`, `/terms`, `/privacy`.
Partner banner widths: 320, 390, 639, 640, 768, 1023, 1024, 1144, 1440, 1920 px.
The full matrix preceded the final isolated banner/modal fixes; those changes
received the focused checks above and the final full unit suite.

## Reproduction and local evidence

With the existing mock Vite server at `http://127.0.0.1:5173` and an installed
Playwright package, run from `frontend`:

```powershell
$env:VITE_USE_MOCKS = 'true'
$env:VITE_VAPID_PUBLIC_KEY = ''
npm.cmd test -- --maxWorkers=2 --hookTimeout=60000
# Set PLAYWRIGHT_MODULE to the installed Playwright package if not locally resolvable.
node scripts/check-responsive-layout.cjs --full --boundaries
node scripts/check-first-time-tour.cjs
```

This run's JSON results and synthetic captures are in the operating system's
temporary directory under `mmirioma-comprehensive-browser-review`,
`mmirioma-quality-design`, `mmirioma-quality-tour` and
`mmirioma-phone-fit-headline`. The design and phone-fit checks were temporary
review probes, not new application dependencies. Full-page screenshots taken
before scrolling may show unloaded lazy images; the reviewed `how-loaded` and
`download-loaded` section captures explicitly await image decode. External map
tiles were blocked for these isolated checks, so map cartography is not a
visual acceptance claim.

## Remaining validation and maintenance

1. **Database integration:** 307 backend tests skipped because
   `TEST_DATABASE_URL` was not configured. Migrations/model synchronization
   and integration behavior require the existing Ubuntu/PostGIS CI workflow.
   No production database was used.
2. **Unix execution:** Windows cannot validate the 23 deployment script
   execution cases. The first broad run hit known Windows failures and a
   missing temp-parent setup error; corrected runs produced the results above.
   Docker's daemon was unavailable, and WSL's Python 3.12 installation lacked
   the required Python 3.14 test environment. Script syntax checks do not
   replace execution in Linux.
3. **Development-tool security advisories:** `npm audit fix --dry-run` did not
   resolve all findings and proposed incompatible direct-tool downgrades.
   A deliberate toolchain update with release-note review and full validation
   remains necessary. No forced updates or blanket overrides were applied.
   See [the dependency finding](../log/2026-11-04-development-dependency-advisories.md).
4. **Local Node version:** This machine runs 24.14.0; locked jsdom and related
   test tools require 24.15+. Checks passed, but the local runtime should be
   updated before future dependency installation. The global installation was
   not changed. CI already requests the latest Node 24.x.
5. **Existing build warnings:** The lazily loaded map library remains a large
   chunk, and the current PWA plugin emits the deprecated
   `inlineDynamicImports` option internally. These are documented upstream
   toolchain/performance follow-ups; warning thresholds were not increased
   to conceal them.
6. **Physical devices and real services:** Browser checks used local Chrome
   and mocked contracts. Physical iOS/Android install behavior, live SMS,
   notification delivery, real API connectivity, map tiles and production
   performance need their existing staging/CI acceptance checks.
7. **Storage fallback:** When persistence is unavailable, tour dismissal is
   remembered within the current document. A hard reload can restore an older
   pending marker until storage works again; it cannot provide cross-device
   persistence without a future agreed server contract.

The code and design fixes above are implemented locally. The open maintenance
and environment limits are retained explicitly rather than described as fixed.

## Subsequent account-photo verification

After the broad review, the owner supplied a 1600 x 1066 water-and-hands
photograph for customer and partner sign-in/signup pages. The original JPEG
is copied unchanged to `frontend/public/marketing/auth-water-hands.jpg`; only
the photo receives a gentle 20-second CSS pan/zoom. Reduced motion disables it.
The partner vehicles, text and all form behavior remain.

The final photo change passed 84 relevant tests in six files and 39 browser
checks across four account routes at nine widths, including a short-height
viewport, normal/reduced motion, image decode/coverage, form validation,
reachable actions and logo destinations. Lint, typecheck, production build
and demo exclusion passed (215 build files, 70 values checked). The earlier
1,647-test full run preceded this isolated photo change. Details are in
[the account-photo log](../log/2026-11-04-account-pages-supplied-water-photograph.md).
