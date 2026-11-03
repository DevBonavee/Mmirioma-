# 2026-11-03: ESLint `react-hooks/refs` flagged refs read in a `handleSubmit` callback

- **Area:** frontend
- **Author:** Daveoski + agent
- **Symptom:** `npx eslint src/features/marketing` failed on the contact form:
  `Passing a ref to a function may read its value during render  react-hooks/refs`,
  pointing at `const onSubmit = handleSubmit((values) => { if (inFlight.current) return ... })`.
- **Cause:** the React Compiler rule cannot tell that React Hook Form's
  `handleSubmit` only calls the callback later, on submit. A callback that reads
  `ref.current`, passed to a function during render, looks like a ref read
  during render.
- **Fix / workaround:** declare the callback as a plain function and call
  `handleSubmit` inside the event handler:
  `<form onSubmit={(event) => void handleSubmit(submit)(event)}>`. The refs are
  then read only from the submit event. No rule was switched off.
- **Status:** resolved
- **Refs:** #344; `frontend/src/features/marketing/ContactForm.tsx`.
