# 2026-11-04: Pytest's temporary directory was blocked by the sandbox

- **Area:** tooling
- **Author:** Daveoski + agent
- **Symptom:** The backend project-review run at `59bda1a` reported 1,728 passed, 307 skipped, 11 failed and 29 setup errors. The setup errors were `PermissionError: [WinError 5] Access is denied` when pytest accessed its existing `pytest-of-<user>` directory under the user's local temporary directory (username redacted).
- **Cause:** The execution sandbox could not access the existing pytest temporary-directory root. The failures were separate from the Windows Bash execution limitations already recorded in the issue log.
- **Fix / workaround:** After approval, reran `python -m pytest -q --tb=short -ra tests/test_deployment_config.py tests/test_frontend_serving.py tests/test_seo_files.py` outside the sandbox, using the backend virtualenv. The 29 temporary-directory setup errors disappeared. The targeted run finished with 68 passed and 23 Windows Bash execution failures, all in `test_deployment_config.py`; see the existing Windows-checkout entry. Database integration tests were skipped because `TEST_DATABASE_URL` was unset for this review.
- **Status:** workaround
- **Refs:** PR #405; `2026-11-02-windows-checkout-fails-bash-and-css-tests.md`; `backend/tests/test_deployment_config.py`; `backend/tests/test_frontend_serving.py`; `backend/tests/test_seo_files.py`.
