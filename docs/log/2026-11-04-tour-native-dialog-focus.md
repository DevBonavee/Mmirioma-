# 2026-11-04: Tour keyboard focus could leave the action loop

- **Area:** frontend accessibility
- **Author:** Daveoski (+ Codex agent)
- **Symptom:** Playwright reported `AssertionError: Focus escaped the guide`
  while tabbing through the first-time guide in Chrome.
- **Cause:** Native modal dialog behavior inerts the underlying page, but the
  browser can still move focus to its chrome at the ends of the action sequence.
- **Fix / workaround:** Add an explicit Tab/Shift+Tab loop for the dialog's
  controls, including reverse navigation from the initially focused heading.
  Keep native modal semantics, heading focus, Escape and opener restoration.
- **Status:** resolved; keyboard containment passed across all three audiences
  at 320, 390, 768 and 1440 px in the browser checks.
- **Refs:** `frontend/src/features/onboarding/WelcomeTour.tsx`,
  `frontend/scripts/check-first-time-tour.cjs`.
