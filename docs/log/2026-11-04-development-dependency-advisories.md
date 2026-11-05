# 2026-11-04: Development dependency advisories remain

- **Area:** tooling / dependency review
- **Author:** Daveoski (+ Codex agent)
- **Symptom:** `npm audit --json` reports 21 advisories: 19 moderate and 2 low.
  `npm audit --omit=dev --json` reports zero production dependency advisories.
- **Cause:** Development/build chains include affected minimatch, glob and
  deepmerge versions, through ESLint/TypeScript ESLint and PWA/Workbox tooling.
- **Investigation:** A non-mutating `npm audit fix --dry-run --json` did not
  resolve all advisories. Suggested direct-tool changes included major
  downgrades; no forced update, override, package or lockfile change was applied.
- **Next step:** A deliberate dependency maintenance change must select
  compatible supported tool versions, review release notes, and rerun lint,
  typecheck, unit tests, the service-worker build and the audit. These findings
  are not claimed as fixed by this UI review.
- **Status:** open; no high/critical advisory reported by this audit.
- **Refs:** `frontend/package-lock.json`,
  [minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249),
  [glob advisory](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4),
  [deepmerge advisory](https://github.com/advisories/GHSA-gcqx-w48m-w2h4).
