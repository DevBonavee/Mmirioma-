# 2026-11-04: Public account pages still used a desktop width cap

- **Area:** frontend / responsive public account pages
- **Author:** Daveoski (+ Codex agent)
- **Symptom:** The user's customer sign-in screenshot still showed unused space
  around a centered page on desktop after the workspace responsiveness fix.
- **Cause:** The earlier fix deliberately kept the `card` scope at 768 px and
  retained a fixed-height hero above an independently scrolling form. Making
  signed-in workspaces fluid did not address the public entry pages.
- **Fix / workaround:** Remove the account frame cap; share `AuthLayout` across
  customer and partner sign-in, registration, password help and contact. Use a
  full-width brand/form row from 1024 px and stacked content below it. Limit
  input line length independently and let the document scroll at every size.
  Preserve official artwork, fields, validation, mutations and redirects.
- **Verification tooling:** The old browser check expected the 768 px cap. Its
  first update used a repo-relative path from `frontend/`, so it did not apply;
  corrected the working directory before rerunning. Wrapped inline links also
  require hit-testing their individual client rectangles rather than the empty
  space inside their union bounding box. Source discovery located password
  help in `AccountPages.tsx` after an assumed standalone filename was absent.
  Windows process diagnostics (`Get-CimInstance`) were unavailable in the
  sandbox; ordinary test output remains the source for verification results.
- **Status:** resolved; 121 unique account-page/viewport checks passed, with
  33 simulated screenshots; all 1,632 frontend tests passed. Final static and
  production-build checks are recorded in `docs/features/responsive-layout.md`.
- **Refs:** `frontend/src/components/layout/AuthLayout.tsx`,
  `frontend/src/components/layout/MobileShell.tsx`,
  `frontend/scripts/check-responsive-layout.cjs`,
  `docs/features/responsive-layout.md`, PR #406.
