# 2026-11-03: a scripted test edit did nothing because Python is not installed

- **Area:** tooling
- **Author:** DevBonavee + agent
- **Symptom:** a `python3 - <<EOF` heredoc used to rewrite a test file printed `Python was not found; run without arguments to install from the Microsoft Store`. The next test run was the unchanged file, so the same failure appeared to repeat.
- **Cause:** this Windows machine has only the Microsoft Store shortcut for `python3`, no interpreter. The command failed, but the output that followed (the test run) looked like a result of the edit.
- **Fix / workaround:** edit files with the editor tool or `sed`, and read the first lines of a command's output before trusting the lines after it.
- **Status:** resolved
- **Refs:** #345
