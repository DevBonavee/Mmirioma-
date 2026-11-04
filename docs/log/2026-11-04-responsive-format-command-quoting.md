# 2026-11-04: Quoting warning in a responsive-layout formatting command

- **Area:** tooling
- **Author:** Daveoski (+ Codex agent)
- **Symptom:** An inline Python formatting command emitted
  `SyntaxWarning: "\>" is an invalid escape sequence` and left the intended
  JSX indentation unchanged.
- **Cause:** Nested string quotes did not survive PowerShell argument parsing.
- **Fix / workaround:** Pass the Python source through a literal PowerShell
  here-string on standard input. The corrected command only indents the new
  wrappers in CodeStep and PartnerShared; it changes no JSX behavior.
  The publishing whitespace check also caught an extra blank line at EOF in
  the browser-check script; it was trimmed and `node --check` passed.
- **Status:** resolved
- **Refs:** `frontend/src/features/partner/pages/CodeStep.tsx`,
  `frontend/src/features/partner/pages/PartnerShared.tsx`.
