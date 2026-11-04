# 2026-11-04: Automatic welcome needed to defer to existing modals

- **Area:** frontend / onboarding
- **Author:** Daveoski (+ Codex agent)
- **Symptom:** The guide did not generally defer to an existing native/ARIA
  modal. An initial regression also exposed a race when sibling components
  mounted together (1 failure in the first 1,647-test run).
- **Cause:** Active-job gating alone was insufficient; inspecting the DOM
  during render could miss a sibling that had not committed yet.
- **Fix:** A per-instance external store observes committed modal changes and
  initially defers until subscription. Exclude the guide itself, preserve its
  pending marker and reopen only after other modals close. An intermediate
  set-state-in-effect mount gate failed lint and was replaced with this store.
- **Verification:** The regression mounts both components in the same render,
  then removes the competing modal and checks the welcome appears.
- **Status:** resolved; all 1,647 frontend tests and the expanded 25-scenario
  browser matrix passed, including first-mount native-modal priority.
- **Refs:** `frontend/src/features/onboarding/WelcomeTour.tsx`,
  `frontend/src/features/onboarding/WelcomeTour.test.tsx`.
