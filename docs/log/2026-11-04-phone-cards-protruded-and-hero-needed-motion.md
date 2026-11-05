# 2026-11-04: Phone previews protruded and the hero needed refined motion

- **Area:** frontend / public website
- **Author:** Daveoski (+ Codex agent)
- **Symptom:** The owner wanted both phones inside their allotted white cards,
  professional creative headline styling, slow bouncing motion and a realistic
  animated drop beside Order water. They then requested no pause control.
- **Cause:** The phone frame deliberately used a negative 28 px top margin,
  and its card had no top padding. The headline was static and uniformly heavy;
  the button used a flat filled icon.
- **Fix / workaround:** Give each card internal padding and centered grid
  columns, remove the negative margin and stack below 600 px. Refine the
  existing Outfit headline weights/spacing/underline and add a restrained
  six-second bounce. Replace only the hero button's icon with a translucent,
  highlighted inline SVG droplet and 3.8-second bob. Remove the initially
  implemented pause button as the owner instructed. Preserve reduced-motion
  handling, accessible link names and all destinations. No new assets,
  fonts, dependencies, APIs or application workflows.
- **Verification:** All 149 marketing/logo tests in 10 files passed. Playwright
  passed all 11 width checks (320 through 1920 px, including card and layout
  breakpoints) plus normal-motion checks for the headline/drop and absence of
  pause controls. Reduced motion, link names, destinations, card padding and
  horizontal overflow passed. Desktop/mobile captures and the droplet were
  reviewed visually. Lint, TypeScript, real-mode production build and demo-value
  exclusion passed; existing map chunk/PWA warnings remain.
- **Status:** resolved; implemented and verified locally.
- **Refs:** `frontend/src/features/marketing/Landing.tsx`,
  `frontend/src/features/marketing/marketing.css`,
  `docs/features/public-pages.md`, `docs/design/landing-v1.md`.
