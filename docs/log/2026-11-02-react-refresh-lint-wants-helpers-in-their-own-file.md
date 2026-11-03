# 2026-11-02: ESLint refused helpers exported from a component file

- **Area:** frontend
- **Author:** Bonvee120 + agent
- **Symptom:** `npm run lint` failed with `Fast refresh only works when a file
  only exports components. Use a new file to share constants or functions between
  components  react-refresh/only-export-components` on `HomeLogo.tsx` (it also
  exported `homeFor` and `HOME_LOGO_NAME`) and on `LeaveOrderGuard.tsx` (it also
  exported `isOrderStep` and `shouldAskBeforeLeaving`).
- **Cause:** the repo's lint rule keeps component files to components, so hot
  reload does not lose state.
- **Fix / workaround:** the plain functions and constants moved to
  `components/brand/logoTarget.ts` and `features/customer/order/leaveOrder.ts`;
  the component files import them. Put a helper next to its component in its own
  `.ts` file from the start.
- **Status:** resolved
- **Refs:** #337.
