# 2026-11-04: First-time guidance, public-home logos and clearer marketing images

- **Area:** frontend / onboarding / public website
- **Author:** Daveoski (+ Codex agent)
- **Symptom:** The owner requested a polished guide for new customers and
  partners, universal homepage logo taps, and clearer, natural-looking imagery
  for the driver banner and phone install cards.
- **Cause:** No first-time guide existed. A deliberate older partner logo rule
  returned to `/partner/`; two customer marks were decorative. The old banner
  and phone illustrations contained soft detail and distorted rendered branding.
- **Fix / workaround:** Implement the owner-authorized shared optional tour
  after successful signup and the existing verification flow, with role copy,
  Back/Next/Skip/Finish, browser-local completion and account-menu replay.
  Defer to active work and keep all APIs and business actions intact. Send
  every HTML logo to `/`, including signup/delivered marks. Replace the banner
  with a new imagegen edit, and the phones with high-resolution screenshots of
  actual app screens using isolated labelled sample accounts. Update design,
  feature, architecture and PWA documentation together.
- **Authorization:** The owner explicitly answered "Implement now under my
  owner authorization" to the documented G2 override question on 4 November
  2026. No team-reviewer approval is claimed. Existing agreed APIs are reused.
- **Verification:** Full frontend suite: 126 files / 1,641 tests passed. After
  the focus, copy and empty-state refinements, the targeted tour/partner/signup/
  logo suite passed 255 tests in 19 files. All 23 browser scenarios passed:
  three audiences across five effective viewports, priority/existing-login/
  marketing checks, and actual customer/Keke/tanker signup forms through the
  existing verification screen and its skip action. Widths were 320, 390, 768
  and 1440 px, plus 720 x 500 (equivalent CSS layout at 200% desktop zoom).
  Lint, TypeScript, real-mode production build and demo-value exclusion passed;
  214 build files were checked. Existing map chunk and PWA deprecation warnings
  remain. Desktop/mobile artwork and tour captures were reviewed visually.
  No backend code or dependencies changed.
- **Status:** resolved; implemented and verified locally.
- **Refs:** `docs/features/first-time-tour.md`, `docs/design/first-time-tour.md`,
  `docs/features/public-pages.md`,
  `docs/design/prompts/driver-banner-photography.md`,
  `frontend/scripts/check-first-time-tour.cjs`,
  `frontend/scripts/capture-install-previews.cjs`.
