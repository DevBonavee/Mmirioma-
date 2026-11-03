# 2026-11-03: Playwright screenshots and snapshots land inside the repository

- **Area:** tooling
- **Author:** DevBonavee + agent
- **Symptom:** While measuring screens for #335, `browser_take_screenshot` with a path in the session scratchpad failed with `File access denied: ... is outside allowed roots. Allowed roots: ...\mmirioma\.playwright-mcp, ...\mmirioma`. A screenshot saved under `.playwright-mcp/` worked, and the same folder also collected a snapshot and a console log for every page visited. `git status` then showed `?? .playwright-mcp/`, because the folder is not git-ignored.
- **Cause:** The Playwright tool only writes inside the repository (its allowed roots), and `.playwright-mcp/` is not in `.gitignore`.
- **Fix / workaround:** Save screenshots to `.playwright-mcp/<name>.png`, copy anything worth keeping to the scratchpad, and delete the folder before committing (`rm -rf .playwright-mcp`). Adding `.playwright-mcp/` to `.gitignore` would stop it being committed by accident; it is a shared file, so that is a separate small PR.
- **Status:** workaround
- **Refs:** #335, `.gitignore`.
