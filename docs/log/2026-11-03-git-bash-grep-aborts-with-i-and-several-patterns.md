# 2026-11-03: Git Bash grep aborts on a log search with -i and several -e patterns

- **Area:** tooling
- **Author:** Daveoski + agent
- **Symptom:** Searching the log before starting #340, `grep -ril -e "postgis" -e "anonymize" docs/log LOG.md` printed `Aborted` and exited with 134. The same search with one pattern worked.
- **Cause:** A fault in the GNU grep 3.0 that ships with this Git Bash. It reproduced only with `-i` combined with more than one `-e` pattern: without `-i`, two `-e` patterns worked. Not traced further.
- **Fix / workaround:** Put the words in one pattern joined by `\|`, as `docs/log/README.md` already shows: `grep -ril "postgis\|anonymize" docs/log LOG.md`. Agents can use their own search tool instead.
- **Status:** workaround
- **Refs:** #340, `docs/log/README.md`.
