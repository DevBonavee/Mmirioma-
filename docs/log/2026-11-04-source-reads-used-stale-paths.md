# 2026-11-04: Source inspection used stale documentation paths

- **Area:** tooling / source navigation
- **Author:** Daveoski (+ Codex agent)
- **Symptom:** `Get-Content` returned `PathNotFound` for the old
  `features/auth/pages/HomePages.tsx`, assumed `ui/Sheet.tsx`,
  `layout/BottomSheet.tsx` and `customer/pages/Menu.test.tsx` paths.
  A literal `*.tsx` path passed to rg also returned Windows `os error 123`.
- **Cause:** Historical documentation referenced the retired frontend tree;
  the other names were assumed rather than found in the checkout. PowerShell
  does not expand the literal wildcard passed as that rg path.
- **Fix / workaround:** Use `rg --files` to locate real files, read the actual
  customer Home, ConfirmDialog and AssignedSheet, and filter searches with
  `rg -g '*.tsx' <pattern> <directory>`.
- **Status:** resolved; no application files were lost or moved.
- **Recurrence:** A later phone-card search passed `docs/log/2026-11-04*` as a
  literal rg path and received the same Windows wildcard error. Search the real
  directory with `-g '*2026-11-04*'` instead.
- **Refs:** `docs/features/customer-ordering.md`,
  `frontend/src/features/customer/pages/Home.tsx`,
  `frontend/src/features/partner/components/AssignedSheet.tsx`.
- **Quality-review recurrence:** An assumed `pwa/serviceWorker.test.ts` and
  `docs/design/partner-auth.md` did not exist; the PWA test is `pwa.test.ts` and
  partner references are in `partner-app.md` / the handoff. A literal
  `frontend/eslint.config.*` also repeated the PowerShell glob error. Locate
  files first and read the discovered `frontend/eslint.config.js` directly.
- **Photo-update recurrence:** Optional `.agents` and `.codex` workspace paths
  were included in a discovery search but do not exist in this checkout.
  Search the actual repository tree without assuming those directories.
