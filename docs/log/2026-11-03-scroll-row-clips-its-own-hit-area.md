# 2026-11-03: a filter-chip row that scrolls sideways cuts off the chips' invisible hit area

- **Area:** frontend
- **Author:** cloudcrackamara + agent
- **Symptom:** Giving the rider and driver filter chips a 48 px hit area (`hit-48`) had no effect on the Period and Tank type rows: the `::before` area of each chip is 48 px tall, but the row is only 40 px tall and `overflow-x: auto` also clips vertically, so the outer 4 px of the area never received a tap. The same was already true of `hit-44`.
- **Cause:** `overflow-x: auto` makes `overflow-y` compute to `auto`, so the row clips (and can scroll) vertically.
- **Fix / workaround:** With `Pills largeHit` and `wrap={false}` the row is padded 5 px above and 7 px below and pulled back by -5 px margins, so it takes the same 40 px of layout and holds the whole 48 px area. Layout positions are identical at 360 px. The three screens that have such a row (rider history, driver history, driver orders) are not byte-identical to before in a headless screenshot, only by anti-aliasing differences (up to 31,000 pixels, mostly 1 to 3 levels, some text edges higher); a 2 px version of the same change differs in 24 pixels by 1 level. Cause not found; said in the PR.
- **Status:** workaround
- **Refs:** #342, `frontend/src/components/ui/Controls.tsx`
