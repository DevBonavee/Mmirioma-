# 2026-11-04: Separate tracking issue blocked during responsive PR preparation

- **Area:** GitHub
- **Author:** Daveoski (+ Codex agent)
- **Symptom:** Automatic approval review rejected creating a separate GitHub
  issue while preparing the requested commit, push and pull request.
- **Cause:** The reviewer considered publishing an additional persistent issue
  beyond the user's explicit authorization to commit, push, open a PR and
  request review. The rejected command did not execute.
- **Fix / workaround:** Do not retry issue creation or bypass the rejection.
  Continue the explicitly authorized work on a dedicated responsive-fix branch;
  use the PR to record the follow-up and relate closed issues #341 and #342.
  Creating a separate issue would need explicit user approval.
- **Status:** workaround
- **Refs:** `CLAUDE.md` (one issue per task), #341, #342.
