# 2026-11-03: PartnerAccount "Verify" test fails when `.env.local` sets a VAPID key

- **Area:** frontend
- **Author:** nnamdi-security + agent
- **Symptom:** `npm test` in `frontend/` failed one test every time, while the same test passed on a clean checkout of `development`: `src/features/partner/pages/PartnerAccount.test.tsx > profile phone verification link > offers "Verify" while the phone is not verified` with `TestingLibraryElementError: Unable to find role="link" and name "Verify"`. Run alone it failed three times in a row, so it was not intermittent here.
- **Cause:** not traced to the line. The difference was `frontend/.env.local`: with `VITE_VAPID_PUBLIC_KEY` set (any value) the test fails; with `VITE_VAPID_PUBLIC_KEY=` empty, or with the file absent, it passes. `VITE_API_BASE_URL` made no difference.
- **Fix / workaround:** run the tests with the variable emptied: `VITE_USE_MOCKS=true VITE_VAPID_PUBLIC_KEY= npm test`. CI has no `.env.local`, so it is not affected. A proper fix is for the test to stub the push setting instead of reading the environment; not done here. #367's description calls this test "intermittent"; this may be its cause.
- **Status:** workaround
- **Refs:** #364 (found while checking it), `frontend/src/features/partner/pages/PartnerAccount.test.tsx`; see also `2026-10-31-frontend-tests-fail-with-local-env-use-mocks-false.md`.
