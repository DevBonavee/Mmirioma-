# 2026-11-03: the 1400 px "panel beside the table" rule could never be met under the 1440 px cap

- **Area:** design
- **Author:** cloudcrackamara + agent
- **Symptom:** After building #343 exactly as `docs/design/responsive.md` reads, the Orders and Riders panels were a side sheet even at 1920 px. Measured in headless Chrome: content area 1440 px wide, but `SplitLayout` saw 1392 px.
- **Cause:** The document caps the admin content at 1440 px and puts the panel beside the table "when the content is at least 1400 px wide". The page has 24 px of padding on each side, so a component inside it sees at most 1392 px and the rule never held.
- **Fix / workaround:** `PANEL_BESIDE_MIN_PX` is 1400 minus the 48 px padding (1352), so the panel sits beside the table once the page content area is 1400 px wide, which is a viewport of about 1663 px with the sidebar. Said in the PR for the reviewer to confirm; if the intent was the 1400 px inside the padding, the cap would have to be 1448 px or more.
- **Status:** workaround
- **Refs:** #343, `frontend/src/features/admin/AdminParts.tsx`
