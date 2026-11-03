# 2026-11-03: A local WhatsApp setting fails two backend tests

- **Area:** tooling
- **Author:** chidimmamogbo (+ Claude Code)
- **Symptom:** a full local `pytest` run fails
  `test_admin_operations_api.py::test_settings_follow_a_changed_support_number` and
  `test_public_contact_api.py::test_whatsapp_is_off_by_default` with
  `{'whatsapp_enabled': True} != {'whatsapp_enabled': False}`.
- **Cause:** the root `.env` sets `SUPPORT_WHATSAPP_ENABLED`, and the settings read
  `.env` during tests. These tests delete the environment variable to check the
  default, so the `.env` value wins, and setting the variable on the command line
  does not help (tried). CI has no `.env`, so it passes there.
- **Fix / workaround:** expect these two failures locally while `.env` sets it. The
  fix is for the tests to ignore `.env`, left for its own change.
- **Status:** workaround
- **Refs:** #332, `backend/tests/conftest.py`
