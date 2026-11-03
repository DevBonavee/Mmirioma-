# 2026-11-03: Typecheck failed on `maplibre-gl` after merging `development`

- **Area:** tooling
- **Author:** chidimmamogbo (+ Claude Code)
- **Symptom:** `npm run typecheck` failed with `error TS2307: Cannot find module
  'maplibre-gl' or its corresponding type declarations.` in `loadMapLibre.ts` and
  `ServiceAreaMap.tsx`.
- **Cause:** the merge brought in #346's new dependency, and the local `node_modules`
  was from before it.
- **Fix / workaround:** run `npm ci` after merging a `development` that changed
  `package-lock.json`. Nothing in the lockfile changed.
- **Status:** resolved
- **Refs:** #336, #346
