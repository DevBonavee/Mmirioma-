# 2026-11-04: Customer and partner pages retained narrow layout caps

- **Area:** frontend
- **Author:** Daveoski (+ Codex agent)
- **Symptom:** Driver pages occupied only 430 px of a 1440 px desktop viewport.
  Many customer pages used a 720 px content band even inside their wider shell.
  Partner bottom navigation rendered three items in four grid tracks.
- **Cause:** The original driver policy deliberately preserved a phone column;
  the shared customer main/footer padding separately recreated a fixed column.
  These policies conflicted with the user's subsequent request for fluid pages.
- **Fix / workaround:** Add an explicit fluid partner scope, make customer
  workspaces fluid, remove the main/footer column padding, adapt driver grids,
  navigation and overlays, and size tab tracks from enabled destinations.
  Preserve explicit viewport height for the absolute refill-map scene.
- **Status:** resolved
- **Refs:** `docs/features/responsive-layout.md`,
  `frontend/src/components/layout/MobileShell.tsx`,
  `frontend/scripts/check-responsive-layout.cjs`.
