# 2026-11-02: eight tests fail on a Windows checkout and pass in CI

- **Area:** tooling
- **Author:** cloudcrackamara + agent
- **Symptom:** (Updated 2026-11-03: a ninth, `backend/tests/test_seo_files.py::test_the_server_sends_robots_txt_as_a_file_not_the_app_page`, fails for the same line-ending reason: `assert response.text == (PUBLIC / "robots.txt").read_text(...)` sees `
` in the served file.) On Windows, backend `pytest` reports 7 failures in `tests/test_deployment_config.py::TestScripts` (for example `test_is_valid_bash_and_executable[production-migrate.sh]`: `assert os.access(path, os.X_OK), f"chmod +x deploy/{name}"`, then `CalledProcessError`). Frontend `npm test` reports 1 failure: `src/features/marketing/sizeTiles.test.tsx > plays no transition under reduced motion` with `expected -1 to be greater than or equal to 0`. Both fail the same way on a clean `development` checkout (checked with `git stash`), and CI is green.
- **Cause:** The deployment tests run the `deploy/*.sh` scripts and need the executable bit, which Windows does not keep. The CSS test searches `marketing.css` for a string with `\n`, and a Windows checkout with CRLF line endings has `\r\n` there.
- **Fix / workaround:** None needed for CI. Locally, run these two files in WSL or Git Bash with LF line endings, and treat the eight failures as environment-only when nothing in `deploy/` or `marketing.css` changed. A test that does not depend on line endings would fix the CSS one.
- **Status:** workaround
- **Quality-review recurrence (2026-11-04):** The broad Windows run again
  failed direct Unix deployment-script execution. A corrected run passed all
  1,724 non-deployment tests (307 database skips); 21 deployment configuration
  checks passed with 23 Unix execution tests deselected. All seven deploy
  scripts passed Git Bash `bash -n`. Docker's daemon was unavailable; the WSL
  Ubuntu installation has Python 3.12 rather than the required 3.14 and lacks
  the test dependencies. Linux execution, database migrations and integration
  remain for the configured Ubuntu/PostGIS CI environment. Deployment scripts
  and CI were not changed for Windows.
- **Refs:** #333 (found while running the full checks), `backend/tests/test_deployment_config.py`, `frontend/src/features/marketing/sizeTiles.test.tsx`.
