# 2026-11-04: Multiline prompt text needed patch line prefixes

- **Area:** editing tooling
- **Author:** Daveoski (+ Codex agent)
- **Symptom:** `apply_patch` rejected the prompt document with
  `invalid hunk at line 16, 'Asset type: wide high-resolution website recruitment banner.'`.
- **Cause:** Interpolated prompt lines lacked the `+` prefix required by an
  Add File patch.
- **Fix / workaround:** Prefix every line of the final document before passing
  the structured patch. The rejected call made no file change.
- **Status:** resolved; the final prompt record was saved successfully.
- **Refs:** `docs/design/prompts/driver-banner-photography.md`.
- **Photo-documentation recurrence:** A combined documentation patch used a
  slightly different context line in the preview log and failed verification.
  The atomic rejection made no changes. Read the actual line before applying
  the corrected patch.
- **Review-push recurrence (2026-11-05):** The staged whitespace check found
  trailing blank lines in the two new driver/keke prompt records; the earlier
  unstaged check did not include untracked files. Remove only the extra EOF
  blank lines and rerun the staged check before committing.
