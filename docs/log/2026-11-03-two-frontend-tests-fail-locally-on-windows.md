# 2026-11-03: Two frontend tests fail locally on this Windows machine

- **Area:** frontend
- **Author:** chidimmamogbo (+ Claude Code)
- **Symptom:** a full `npm test` run reports 2 failures of 1312 tests.
  1. `sizeTiles.test.tsx`, "plays no transition under reduced motion":
     `AssertionError: expected -1 to be greater than or equal to 0`. It fails every
     time.
  2. `PartnerAccount.test.tsx`, "offers "Verify" while the phone is not verified":
     `Unable to find role="link" and name "Verify"`. It passes alone and failed in
     one of two runs of `src/features/partner/pages` with two workers.
- **Cause:**
  1. The test searches `marketing.css` for a string containing `\n`, and this
     checkout has CRLF line endings. Not related to #332, which does not touch that
     test or that file.
  2. Not proven. The failure is intermittent, which points to timing on a slow run.
     It was not tried on `development`.
- **Fix / workaround:** check both on CI. A fix for the first is to match either
  line ending, in its own change.
- **Status:** open
- **Refs:** #332, #330, `frontend/src/features/marketing/sizeTiles.test.tsx`,
  `frontend/src/features/partner/pages/PartnerAccount.test.tsx`
