# 2026-11-03: A seventh header link pushed the order button off the edge, and no scrollbar showed

- **Area:** frontend
- **Author:** Bonvee120 + agent
- **Symptom:** after adding "About" to the public header (#338), at 962 px the
  "Order Water" button was cut off at the right edge in a screenshot of the
  header. A check for horizontal scroll said all was well:
  `document.documentElement.scrollWidth > clientWidth` was `false`. A later
  measurement showed the button's right edge 51 px past the header's right edge
  (75 px past its padded content edge).
  Before that, with the labels allowed to shrink, four of the seven links had
  wrapped onto two lines ("How It / Works", "Our / Services").
- **Cause:** the page wrapper has `overflow-x-clip`, so content that spills past
  the viewport is cut, not scrolled, and a scroll-width check cannot see it. The
  seven links need about 598 px at a 20 px gap and 658 px at 30 px; at 962 px the
  header has 898 px of content width for the logo (190), the links, two 24 px
  gaps and the button (137), which is 75 px short.
- **Fix / workaround:** below 1100 px the header is compact: logo `h-9`, labels
  14 px, gap 12 px; each label has `whitespace-nowrap`. It was measured at 962,
  1099, 1100, 1179 and 1280 px (one line, button inside, 44 to 113 px spare). To
  check a layout under `overflow-x-clip`, compare each element's right edge with
  its container's, not the document's scroll width.
- **Seen again (Daveoski + agent, #344, 2026-11-03):** an eighth link,
  "Contact", put the button's right edge 12 px past the header's padded edge at
  961 px, and left no room at 1100 and 1180 px (the button touched the edge).
  Measured in Chrome through the DevTools protocol, comparing the button's right
  edge with the padded edge. The gaps were narrowed (below 1100 px: 8 px between
  links and 16 px between logo, links and button; 16 px from 1100 px; 24 px from
  1180 px). Remeasured from 961 to 1920 px: one line, the button inside, at
  least 32 px between the last link and the button.
- **Status:** resolved
- **Refs:** #338, #344; `frontend/src/features/marketing/MarketingParts.tsx`.
