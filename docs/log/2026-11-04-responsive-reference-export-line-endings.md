# 2026-11-04: Reference exports duplicated Windows newline characters

- **Area:** tooling
- **Author:** Daveoski (+ Codex agent)
- **Symptom:** The staged audit pack's whitespace check reported trailing
  whitespace on every line of many reference snapshots; exported text contained
  `CR CR LF` line endings.
- **Cause:** The exporter decoded original CRLF bytes without normalizing them,
  then Python's Windows text writer translated LF to CRLF a second time.
- **Fix / workaround:** Normalize existing archival text copies to LF without
  rereading changed application sources; update their copy hashes, preserve the
  recorded original hashes and redactions, and fix the exporter. Pack-local
  attributes keep text LF and screenshots/fonts binary. Preserve intentional
  whitespace inherited from original references rather than changing their text.
- **Status:** resolved
- **Refs:** `docs/design/responsive-redesign/tools/build-pack.py`,
  `docs/design/responsive-redesign/references/manifest.json`.
