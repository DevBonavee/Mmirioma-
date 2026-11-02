# 2026-11-02: A test that matches stylesheet text failed on Windows line endings

- **Area:** frontend
- **Author:** Bonvee120 + agent
- **Symptom:** `sizeTiles.test.tsx` passed when written, then failed after a
  `git pull` on Windows: `AssertionError: expected -1 to be greater than or equal
  to 0` in "plays no transition under reduced motion". The test looks for the
  text `'@media (prefers-reduced-motion: reduce) {\n    .mk-tile-water'` in
  `marketing.css`.
- **Cause:** the checkout converts line endings to CRLF on Windows
  (`core.autocrlf`), so the file no longer contains `\n` on its own. CI runs on
  Linux, which is why it passed there.
- **Fix / workaround:** the test's `readSource` now turns CRLF into LF after
  reading. A first attempt that wrote the replacement through a Python string
  put real line breaks into the TypeScript regex (`Unterminated regular
  expression`); the fix uses `String.fromCharCode(13, 10)` so no escape
  sequence is involved. Any test that matches multi-line text in a file should
  normalize line endings the same way.
- **Status:** resolved
- **Refs:** #337; `frontend/src/features/marketing/sizeTiles.test.tsx`.
