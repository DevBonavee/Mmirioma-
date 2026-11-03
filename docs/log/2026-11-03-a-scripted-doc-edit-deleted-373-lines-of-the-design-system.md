# 2026-11-03: A scripted edit of the design system deleted 373 lines

- **Area:** process
- **Author:** Bonvee120 + agent
- **Symptom:** The reviewer of #400 (#341) found that `docs/design/design-system.md` had 512 lines on the branch against 885 on `development`. The sections `## Components`, `## Additions from the authentication design`, `## Formatting rules` and `## Accessibility requirements` were gone. `git diff origin/development --shortstat -- docs/design/design-system.md` showed 15 insertions and 388 deletions; the edit should have been about 15 and 13.
- **Cause:** The Breakpoints edit was made by a script that replaced the text from "Min-width breakpoints:" up to the first `## Tailwind CSS v4 theme` heading. That heading is not the next one after Breakpoints: `## Components` follows, and the Tailwind heading comes after the accessibility section. The script replaced everything in between with the new table. The checks (lint, typecheck, tests, build) do not read Markdown, so nothing failed, and I did not look at the diff stat of the doc before committing.
- **Fix / workaround:** Restored the file from `development` and applied only the intended edits: the new Breakpoints table and tokens paragraph, the old "Below the tablet width the table scrolls sideways" sentence removed, the `--breakpoint-*` block and sentence in the Tailwind theme section. The diff is now 14 insertions and 13 deletions. After any scripted edit of a document, check `git diff --shortstat` for that file before committing, and name the next heading as the end of the replaced range.
- **Status:** resolved
- **Refs:** #341, #400, `docs/design/design-system.md`.
