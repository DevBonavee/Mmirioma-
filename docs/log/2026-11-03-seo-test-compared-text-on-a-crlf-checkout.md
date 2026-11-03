# 2026-11-03: A test comparing file text with served text failed on a Windows checkout

- **Area:** backend
- **Author:** Bonvee120 + agent
- **Symptom:** `tests/test_seo_files.py::test_the_server_sends_robots_txt_as_a_file_not_the_app_page`
  passed when written and then failed after switching branches on Windows, on the
  line `assert response.text == (PUBLIC / "robots.txt").read_text(encoding="utf-8")`.
- **Cause:** the checkout turns line endings into CRLF. The server sends the
  file's bytes as they are, so `response.text` has CRLF, while `read_text` turns
  them into LF. CI runs on Linux, where they agree.
- **Fix / workaround:** the test compares bytes: `response.content ==
  (PUBLIC / "robots.txt").read_bytes()`. Any test that compares a served file
  with a file on disk should compare bytes.
- **Status:** resolved
- **Refs:** #338, #331; `backend/tests/test_seo_files.py`. Related:
  `2026-11-02-css-text-test-failed-on-windows-line-endings.md`.
