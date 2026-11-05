# 2026-11-04: Tour copy needed the current pilot's available features

- **Area:** frontend content
- **Author:** Daveoski (+ Codex agent)
- **Symptom:** The first proposal described choosing a water category, delivery
  window and payment option, and checking partner earnings.
- **Cause:** The broader PRD/SRS covers features narrowed by the approved pilot
  screens and flags. Review currently shows pay on delivery and time agreed by
  phone; Keke/Tanker choices use container/tank sizes; partner pay is disabled.
- **Fix / workaround:** Check the actual Review screen and `PARTNER_PAY_ENABLED`.
  Use the current pilot wording and condition earnings guidance on its existing
  flag. Explain My cash/history instead. Update the proposal and implementation.
- **Status:** resolved; no workflow, flag or API behavior changed.
- **Refs:** `frontend/src/features/onboarding/tourContent.ts`,
  `frontend/src/features/customer/pages/order/Review.tsx`,
  `frontend/src/lib/features.ts`, `docs/design/first-time-tour.md`.
