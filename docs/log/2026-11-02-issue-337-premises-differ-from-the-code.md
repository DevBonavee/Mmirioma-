# 2026-11-02: Issue #337 describes two things the code does not do

- **Area:** process
- **Author:** Bonvee120 + agent
- **Symptom:** issue #337 says (1) the order draft "is only in memory" and (2)
  that "Install the app" "stays in its own section and the header". Neither
  matches the code on `development`. The draft is kept in `sessionStorage`
  (`frontend/src/features/customer/order/draft.ts`, key
  `mmirioma.orderDraft.v1`), so it survives a reload. The public header has no
  install link: `NAV_LINKS` in `features/marketing/content.ts` lists Home, How It
  Works, Our Services, For Drivers, FAQs and Service Areas, and the only install
  buttons are the two in the "Put MmiriOma on your phone" section (`#download`,
  `Landing.tsx`). The hero's "Install the app" link goes to that section.
- **Cause:** the issue was written from the design, not from the current code.
- **Fix / workaround:** the design amendment in `docs/design/landing-v1.md`
  describes the real behaviour: the leave-the-order prompt is still wanted
  (the draft is kept but not placed), and install stays in its own section with
  no header link added, since the issue's scope does not ask for a new one.
  Say so on the issue if the team wants an install link in the header.
- **Status:** workaround
- **Refs:** #337; `docs/design/landing-v1.md`.
