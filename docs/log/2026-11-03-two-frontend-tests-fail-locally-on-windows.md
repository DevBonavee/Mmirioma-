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
  2. Timing, by reading the test; not proven by reproducing it on `development`. The
     profile comes from a test fixture at once, but the link waits for the session
     query, which goes through the mock's delay. `findByRole` gives up after 1 second,
     which a loaded machine can miss. CI passes it.
- **Fix / workaround:** the first passed again after `development` was merged in on
  2026-11-03. For the second, a longer `findByRole` timeout in that test is the fix,
  left for its own change. Rerun it alone before treating it as a real failure.
  It failed again in a full `npm test` run on 2026-11-03 while working on #341
  (1 failed, 1517 passed of 1518, no file of #341 involved) and passed alone, in a
  run with the layout tests.
- **Status:** workaround
- **Refs:** #332, #330, #341, `frontend/src/features/marketing/sizeTiles.test.tsx`,
  `frontend/src/features/partner/pages/PartnerAccount.test.tsx`
