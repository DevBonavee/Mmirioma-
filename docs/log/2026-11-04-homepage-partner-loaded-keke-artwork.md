# 2026-11-04: Homepage and partner keke needed the supplied loaded cargo vehicle

- **Area:** public homepage and partner illustrations
- **Author:** Daveoski (+ Codex agent)
- **Symptom:** The owner wanted the supplied open cargo tricycle in place of
  the existing keke, with a realistic seated rider, MmiriOma branding,
  right-facing direction and 25-litre water containers at the back. They also
  requested the same artwork on the partner side.
- **Cause:** The homepage's existing scene and the partner handoff illustration
  used different vehicle artwork. Replacing one did not update the other.
- **Fix / workaround:** Use imagegen to create a transparent loaded vehicle
  cutout and integrate it into the homepage scene. Add the `keke-rider`
  illustration name and select it for partner keke images. Preserve the
  original `keke` asset for other callers and preserve tanker illustrations.
  Update sharing metadata to match the new homepage scene.
- **Composition correction:** An initial scene placed the cargo bed too near
  the desktop badges. Move the vehicle right, and fade only the scene's empty
  left region into the existing gradient. Tablet and mobile use the same scene
  with a right-anchored crop. The rider, load and tires remain in frame.
- **Status:** resolved locally. Homepage browser checks passed at 11 widths;
  33 partner browser checks passed across mobile, tablet and desktop with
  simulated data. Marketing, partner and brand tests passed all 354 tests in
  26 files. Lint, TypeScript, the real-mode production build and demo-value
  exclusion check also passed (210 build files checked). The existing map-chunk
  and PWA deprecation warnings remain.
- **Refs:** `frontend/src/features/marketing/Landing.tsx`,
  `frontend/src/features/marketing/marketing.css`,
  `frontend/src/components/brand/Illustration.tsx`,
  `frontend/src/components/layout/AuthLayout.tsx`,
  `frontend/src/features/partner/`,
  `docs/design/prompts/homepage-cargo-keke.md`,
  `docs/features/public-pages.md`, `docs/features/partner-app.md`.

Follow-up while implementing the welcome tour: partner empty states passed
`illustration="keke"` through `EmptyBlock`, bypassing the earlier explicit
`Illustration` replacements. Add the new cutout as an allowed empty-state option
and select it for Keke home, orders, history, cash and earnings. Tanker history
and cash select tanker artwork. The refreshed partner app-preview capture now
includes the matching loaded cutout. Partner regression tests passed after this
correction.
