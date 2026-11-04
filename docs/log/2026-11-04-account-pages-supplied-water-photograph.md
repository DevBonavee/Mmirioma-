# 2026-11-04: Replace account-page artwork with the owner's water photograph

- **Area:** frontend / account-page design
- **Author:** Daveoski (+ Codex agent)
- **Symptom:** The owner requested higher-resolution photographic artwork and
  animation on the sign-in/signup pages, supplying a water-and-hands JPEG.
- **Cause:** Shared AuthLayout still used the older decorative drop artwork;
  its partner variant applied a screen blend and reduced opacity.
- **Fix / workaround:** Copy the original 1600 x 1066 JPEG unchanged to
  `frontend/public/marketing/auth-water-hands.jpg`. Use it in AuthLayout with
  responsive cover crops and a gentle 20-second transform-only pan/zoom.
  Replace the old blend with navy text-support gradients. Preserve partner
  Keke/tanker artwork, copy, forms and all existing account workflows.
  Reduced motion disables animation/transforms; no pause control is added.
- **Verification:** Source and destination match byte-for-byte. All 84 relevant
  frontend tests in six files passed. Chrome passed 39 cases covering four
  account routes at nine widths/short-height layouts, normal/reduced motion,
  image resolution, bounds, no blur, validation, action reachability and logos.
  Mobile/tablet/desktop captures reviewed visually. Lint, typecheck, real-mode
  production build and demo exclusion passed (215 files, 70 values); existing
  map-chunk/PWA warnings remain. Captures/results are under the operating
  system temp directory in `mmirioma-auth-photograph`.
- **Status:** resolved locally; no commit, push or deployment.
- **Refs:** `frontend/src/components/layout/AuthLayout.tsx`,
  `frontend/src/styles/components.css`, `docs/design/authentication.md`,
  `docs/features/authentication.md`.
