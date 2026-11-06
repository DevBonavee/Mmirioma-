# 2026-11-04: Bright teal text lacked contrast on pale backgrounds

- **Area:** frontend / public design
- **Author:** Daveoski (+ Codex agent)
- **Symptom:** Hero accent contrast reached only 2.77:1, below the 3:1 large
  text threshold. Other public headings reused that bright text color.
- **Cause:** The lighter decorative teal was used as text over a pale surface.
- **Fix:** Reuse the existing dark brand teal `#0E6F74` for the hero, About,
  FAQ, Contact and live-text Oma accent. Hero contrast is now at least 5.36:1.
  No palette or official image-logo replacement.
- **Verification:** Contrast regression checks the actual hero CSS token;
  mobile/desktop public-page checks and visual captures passed.
- **Status:** resolved locally.
- **Refs:** `frontend/src/features/marketing/marketing.css`,
  `frontend/src/features/marketing/sizeTiles.test.tsx`.
