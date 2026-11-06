# 2026-11-04: GitHub CLI access unavailable inside the execution sandbox

- **Area:** tooling
- **Author:** Daveoski (+ Codex agent)
- **Symptom:** `gh auth status` reported the saved account token as invalid,
  and a PR query failed with `connectex: An attempt was made to access a socket
  in a way forbidden by its access permissions.`
- **Cause:** The sandbox could not use the normal GitHub credential/network
  access. This did not establish that the user's verified credentials were bad.
- **Fix / workaround:** With execution approval, `gh api user` outside the
  sandbox verified the existing Daveoski account and repository access. No
  credential was replaced, displayed or copied into the repository.
- **Status:** resolved
- **Refs:** Responsive-layout PR preparation.
- **Recurrence (2026-11-05):** The PR query again hit the sandbox's socket
  restriction. Approved network access verified that PR #406 remains open
  against development with the expected branch head and review requests. No
  credential change was needed.
