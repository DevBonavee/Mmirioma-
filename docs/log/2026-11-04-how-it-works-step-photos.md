# 2026-11-04: How it works cards used icons instead of realistic imagery

- **Area:** public website / landing page
- **Author:** Daveoski (+ Codex agent)
- **Symptom:** The owner wanted the small generated icons in the delivery steps
  replaced with the realistic imagery in their supplied delivery guide.
- **Cause:** `Landing.tsx` mapped the steps to the original `step-order`,
  `step-deliver`, `step-pour` and `step-code` illustration assets.
- **Fix / workaround:** Copy the supplied guide unchanged into the marketing
  assets and display its photo portions in responsive card windows. Keep the
  four existing steps and readable HTML instructions. Use lazy loading,
  reserved image proportions, rounded clipping and one cacheable source.
  The photo's printed copy is not a new business or API specification.
- **Status:** resolved; all 10 browser viewport checks and the 134 public-page
  tests passed, plus all 1,632 frontend tests in 125 files before pushing for
  review. Static/build verification is recorded in the public-pages doc.
- **Refs:** `frontend/src/features/marketing/Landing.tsx`,
  `frontend/src/features/marketing/marketing.css`,
  `frontend/public/marketing/how-it-works-guide.png`,
  `docs/features/public-pages.md`, `docs/design/landing-v1.md`.
