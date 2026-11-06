# 2026-11-04: Universal homepage logo target left an unused argument

- **Area:** frontend lint
- **Author:** Daveoski (+ Codex agent)
- **Symptom:** ESLint reported `'_pathname' is defined but never used` under
  `@typescript-eslint/no-unused-vars` after making the logo destination universal.
- **Cause:** The previous helper needed the current path for the partner scope
  exception. The owner's universal `/` rule no longer needs that argument.
- **Fix / workaround:** Remove the argument and location lookup, then update
  caller and route-based logo tests. Do not suppress the lint rule.
- **Status:** resolved; lint, typecheck and production build passed.
- **Refs:** `frontend/src/components/brand/logoTarget.ts`, `HomeLogo.tsx`,
  `HomeLogo.test.tsx`, `frontend/src/app/logoLinks.test.tsx`.
