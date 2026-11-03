# 2026-11-02: Issue #332 would break sign-up until #336 ships

- **Area:** process
- **Author:** chidimmamogbo (+ Claude Code)
- **Symptom:** while drafting the #332 contract, the plan turned out to leave
  sign-up broken. #332 makes `accepted_terms` required on the server and in the
  mocks, and #336, which depends on #332, adds the checkbox. Between the two,
  every real sign-up gets 422 `validation_error`, and the customer form shows
  nothing: `SignUp.tsx` hides its notice for that code, and `accepted_terms` is
  not in its field map. #332 also asks for frontend tests to pass with the mocks
  enforcing the field. The issue's "a null value is read as before this rule" also
  misses accounts made with the command-line tool or the demo seed, which never
  go through sign-up.
- **Cause:** the issues are ordered by contract dependency, not by what is safe
  to deploy.
- **Fix / workaround:** the proposed contract records the rollout rule and the
  wider meaning of null (`docs/api/auth.md`). The owner decided the order: #336 is
  built on top of the #332 backend branch, and the two merge back to back with no
  deploy or promotion in between. Sending `accepted_terms: true` from today's forms
  is not an option: it would record an acceptance nobody gave.
- **Status:** workaround
- **Refs:** #332, #336, `frontend/src/features/customer/pages/SignUp.tsx`
