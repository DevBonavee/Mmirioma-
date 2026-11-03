# 2026-11-02: A recursive grep of backend/ timed out on the virtualenv

- **Area:** tooling
- **Author:** chidimmamogbo (+ Claude Code)
- **Symptom:** `grep -rln "<words>" backend frontend/src docs` ran past the agent's
  120-second command limit and was moved to the background. A separate long inline
  Python heredoc also failed in Git Bash with `unexpected EOF while looking for
  matching` a quote.
- **Cause:** `backend/` holds the virtualenv, so the search walks every installed
  package. The cause of the heredoc failure was not found.
- **Fix / workaround:** search `backend/app backend/tests` instead of `backend`.
  Save a long script to a file and run the file.
- **Status:** workaround
- **Refs:** #332
