# 2026-11-03: `git switch development` aborted on line-ending noise, and the new branch started from the old one

- **Area:** tooling
- **Author:** cloudcrackamara + agent
- **Symptom:** `git switch development && git pull && git switch -c feat/343-admin-responsive` printed `Aborting`, then `Already up to date.`, then created the branch. The new branch pointed at the previous task's commit (`d88e6bf`), not at `development`.
- **Cause:** About 20 `docs/log/*.md` files showed as modified (`warning: ... LF will be replaced by CRLF`) although only their line endings differed. `git switch` refuses to move when a file it must change is "modified", and the `&&` chain used `tail` after the switch, so its failure was hidden and the later commands ran on the old branch.
- **Fix / workaround:** Caught by checking `git log` and `git merge-base --is-ancestor` before working. Deleted the wrong branch, ran `git checkout -- docs/log` to drop the line-ending noise, switched to `development`, pulled, and branched again. Check `git log --oneline -1` after every branch switch.
- **Status:** resolved
- **Refs:** #343
