# 2026-11-04: Initial pytest run used a missing temporary parent directory

- **Area:** tooling / quality review
- **Author:** Daveoski (+ Codex agent)
- **Symptom:** The first broad backend run produced 29 setup errors with
  `FileNotFoundError` / Windows error 3 when pytest created its base temp path.
- **Cause:** The chosen `.tmp` parent directory did not exist; pytest creates
  the base directory without creating missing parents.
- **Fix:** Create a task-specific parent under the operating system's temp
  directory, then rerun the affected backend suite there.
- **Verification:** Corrected non-deployment run passed 1,724 tests with
  307 database-dependent skips and no setup errors. See the quality report
  for the separate Windows/Unix deployment-test limitation.
- **Status:** resolved; no application change required.
