# 2026-11-02: A Tailwind utility class beat a rule in the components layer, and `overflow: hidden` cut a label

- **Area:** frontend
- **Author:** Bonvee120 + agent
- **Symptom:** while checking the new size tiles in a browser (#330), two things
  were wrong. (1) On a hovered tile the unit text ("Gallons") stayed muted grey,
  `rgb(86, 103, 125)`, instead of turning ink `rgb(10, 37, 64)`, although
  `.mk-tile:hover .mk-tile-unit { color: var(--color-ink) }` matched. (2) At 360
  px the "Custom" label showed as "Custor": the tile's `overflow: hidden`, added
  to clip the rising water, also clipped the label, which is wider than the 41 px
  tile.
- **Cause:** (1) the span also had the utility class `text-mute`, and utilities
  come after the components layer in Tailwind's order, so the utility won over
  the rule in `@layer components` (`marketing.css`). (2) `overflow: hidden` on the
  tile clips everything inside it, not only the water.
- **Fix / workaround:** (1) the grey moved from the `text-mute` class into the
  `.mk-tile-unit` rule, so every colour for that text is in one layer. A test
  checks that the base colour is set in the stylesheet. (2) The tile is no longer
  clipped. A wrapper, `.mk-tile-clip`, holds the water, clips it, and rounds
  its corners, and the water scales inside it. Both were found by measuring the
  page, not by the unit tests, which cannot see layout or the cascade in jsdom.
  The narrow-tile overflow of "1,000" and "Custom" at 360 px was already there
  before the water was added.
- **Status:** resolved
- **Refs:** #330; `frontend/src/features/marketing/marketing.css`, `Landing.tsx`.
