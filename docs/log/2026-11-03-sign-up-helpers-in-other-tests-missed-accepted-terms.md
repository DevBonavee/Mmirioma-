# 2026-11-03: A sign-up helper in another test file missed `accepted_terms`

- **Area:** backend
- **Author:** chidimmamogbo (+ Claude Code)
- **Symptom:** after #332 made `accepted_terms` required, every test in
  `test_phone_verification_integration.py` that signs up failed: its `register`
  helper posted to `/auth/register` without the field and got 422.
- **Cause:** the agent updated `test_auth_integration.py` and missed this file's own
  copy of the helper. The failure shows only with `TEST_DATABASE_URL` set, so a plain
  `pytest` run does not catch it.
- **Fix / workaround:** added the field to the helper. After a change to a sign-up
  request, search the tests for `auth/register`, and run the integration tests too.
- **Status:** resolved
- **Refs:** #332, `backend/tests/test_phone_verification_integration.py`
