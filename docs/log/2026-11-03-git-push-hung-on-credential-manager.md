# 2026-11-03: `git push` hung for several minutes on the credential manager

- **Area:** tooling
- **Author:** cloudcrackamara + agent
- **Symptom:** `git push origin <branch>` ran with no output for over 6 minutes (processes `git`, `git-remote-https` and `git-credential-manager` alive); `git ls-remote origin` showed the branch unchanged.
- **Cause:** Not confirmed. The push was waiting on `git-credential-manager`, probably for a prompt that a non-interactive shell cannot show.
- **Fix / workaround:** Killed the git processes and ran `GIT_TERMINAL_PROMPT=0 git push origin <branch>`, which finished at once.
- **Status:** workaround
- **Refs:** #398
