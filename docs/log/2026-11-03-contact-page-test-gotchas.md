# 2026-11-03: Three surprises while testing the Contact page

- **Area:** frontend
- **Author:** Daveoski + agent
- **Symptom:** four tests in `ContactPage.test.tsx` failed on the first run
  although the page worked:
  1. `expect(send).toHaveBeenCalledWith({...})` failed; the call had a second
     argument, `{ client: QueryClient {}, meta: undefined, mutationKey: undefined }`.
  2. `screen.queryByLabelText('Website')` found the honeypot, which is inside an
     `aria-hidden` box.
  3. A test of the page's `<meta name="description">` got `undefined`.
- **Cause:**
  1. TanStack Query 5 calls `mutationFn(variables, context)`, so a mocked API
     function used as the `mutationFn` sees two arguments.
  2. `getByLabelText` and `queryByLabelText` follow `<label for>` and ignore the
     accessibility tree; only `*ByRole` leaves out `aria-hidden` content.
  3. `seoTags.ts` updates the tags `index.html` has; the test's empty `<head>`
     had none (the About tests add them first).
- **Fix / workaround:** check `send.mock.calls[0][0]` instead of
  `toHaveBeenCalledWith`; check hidden content with
  `queryByRole('textbox', { name: 'Website' })`; add
  `<meta name="description">` to `document.head` before rendering.
- **Status:** resolved
- **Refs:** #344; `frontend/src/features/marketing/ContactPage.test.tsx`.
