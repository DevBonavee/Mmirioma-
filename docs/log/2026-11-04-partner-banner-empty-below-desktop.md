# 2026-11-04: Partner account banner lacked explanation and tanker artwork

- **Area:** frontend / partner account design
- **Author:** Daveoski (+ Codex agent)
- **Symptom:** The owner reported an empty blue banner showing only the keke
  and requested a tanker plus text explaining the page.
- **Cause:** Shared AuthLayout hid its copy below 1024 px and positioned a
  single small vehicle absolutely in the corner.
- **Fix:** Keep introductory copy visible at every width, add the existing
  transparent tanker artwork beside the loaded keke and label both vehicle
  types. Use a normal-flow grid, switching copy/fleet arrangement at 640 and
  1024 px. Preserve account forms and all existing routes/contracts.
- **Verification:** Both login/signup passed geometry, image decode, action
  reachability, runtime-error and overflow checks at 320, 390, 639, 640, 768,
  1023, 1024, 1144, 1440 and 1920 px. Captures reviewed at phone/tablet/desktop.
- **Status:** resolved locally.
- **Refs:** `frontend/src/components/layout/AuthLayout.tsx`,
  `frontend/src/styles/components.css`.
