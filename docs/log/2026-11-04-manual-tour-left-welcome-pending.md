# 2026-11-04: A manually replayed welcome could repeat automatically

- **Area:** frontend / onboarding
- **Author:** Daveoski (+ Codex agent)
- **Symptom:** A new account replayed and dismissed its guide before visiting
  an eligible home screen; the next home visit opened it again.
- **Cause:** Replay never consumed a pending registration marker.
- **Fix:** Replay records dismissal/completion only when the marker is pending;
  it preserves an existing completed/dismissed preference.
- **Verification:** Regression failed before the fix and passed after it.
- **Status:** resolved locally.
- **Refs:** `frontend/src/features/onboarding/WelcomeTour.tsx`,
  `frontend/src/features/onboarding/WelcomeTour.test.tsx`.
