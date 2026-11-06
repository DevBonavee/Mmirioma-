# 2026-11-04: Keke Delivery needed the supplied banner fitted to its card

- **Area:** public website / delivery options
- **Author:** Daveoski (+ Codex agent)
- **Symptom:** The owner wanted the Keke Delivery artwork replaced by their
  realistic hero banner and fitted to the page.
- **Cause:** The existing option header placed a small vehicle illustration,
  capped at 320 px, beside its text; that layout did not suit a 3:1 banner.
- **Fix / workaround:** Add a banner option to the existing card. Use the
  supplied PNG unchanged, filling the card width at its original proportions
  from 768 px. On phones retain readable HTML text above a photo crop focused
  on the rider. Preserve the existing size tiles, interactions and tanker card.
- **Status:** resolved; 8 browser widths and all 134 public-page tests passed.
  Static/build verification is recorded in `docs/features/public-pages.md`.
- **Refs:** `frontend/src/features/marketing/Landing.tsx`,
  `frontend/src/features/marketing/marketing.css`,
  `frontend/public/marketing/keke-delivery-banner.png`,
  `docs/design/landing-v1.md`.
