# 2026-11-03: Project review looked for a nonexistent environment helper

- **Area:** tooling
- **Author:** Daveoski + agent
- **Symptom:** During the project review, `Get-Content` reported `Cannot find path 'frontend/src/lib/env.ts' because it does not exist.`
- **Cause:** The review assumed an environment helper filename before checking the source tree.
- **Fix / workaround:** Read `frontend/src/lib/api/mode.ts`, `frontend/src/lib/features.ts`, and `frontend/vite.config.ts` for mock selection, feature flags, and build configuration. Discover paths with `rg --files` before reading them.
- **Status:** resolved
- **Refs:** Project review after pulling `main` at `59bda1a`; `frontend/src/lib/api/mode.ts`.
