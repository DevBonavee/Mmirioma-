# 2026-11-03: a Review test clicked a disabled placeholder button and saw no order

- **Area:** frontend
- **Author:** DevBonavee + agent
- **Symptom:** `Review.test.tsx` waited with `findByRole('button', { name: /^Place order/ })`, clicked it, and then failed with `expected "vi.fn()" to be called 1 times, but got 0 times`. The page dump showed an enabled "Place order · ₦6,500" button.
- **Cause:** while the quote is loading, Review draws a disabled "Place order" button. The regex matched that one at once, the click did nothing, and the priced button replaced it afterwards.
- **Fix / workaround:** wait for the priced label, `name: /^Place order · ₦/`. When a test must click a button whose label changes as data arrives, match the final label, not its prefix.
- **Status:** resolved
- **Refs:** `frontend/src/features/customer/pages/order/Review.test.tsx` (#345)
