# 2026-11-04: Full storage could prevent tour dismissal

- **Area:** frontend / onboarding
- **Author:** Daveoski (+ Codex agent)
- **Symptom:** With a persisted pending welcome, reads succeeded but writes
  failed with `QuotaExceededError`; Skip left the guide open.
- **Cause:** The persisted marker took precedence over the newer memory fallback.
- **Fix:** Read the failed-write fallback first. Successful writes clear it;
  later storage events invalidate it so another tab's preference is adopted.
- **Verification:** Regression reproduced the failure before the fix, then
  passed alongside blocked-storage and cross-tab tests. Chrome also verified
  dismissal survives client-side menu/home navigation while writes fail.
- **Status:** resolved locally.
- **Refs:** `frontend/src/features/onboarding/tourStorage.ts`,
  `frontend/src/features/onboarding/WelcomeTour.test.tsx`.
