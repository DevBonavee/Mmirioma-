# 2026-11-04: Tour destination was absent from the accessible description

- **Area:** frontend / accessibility
- **Author:** Daveoski (+ Codex agent)
- **Symptom:** Sighted users saw the destination such as Saved addresses;
  assistive technology received only the step's explanatory paragraph.
- **Cause:** The destination pill belonged to the decorative, aria-hidden diagram.
- **Fix:** Include a screen-reader text destination in `aria-describedby` for
  every step. Keep the diagram decorative and the heading focus behavior.
- **Verification:** An accessible-description regression reproduced the gap
  before the fix and passed afterward.
- **Status:** resolved locally.
- **Refs:** `frontend/src/features/onboarding/WelcomeTour.tsx`.
