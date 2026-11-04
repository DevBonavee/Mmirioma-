# 2026-11-04: Preview checks assumed inaccessible or non-unique readiness targets

- **Area:** browser verification tooling
- **Author:** Daveoski (+ Codex agent)
- **Symptom:** Capture timed out waiting for `navigation` named `/navigation/i`;
  a later wait for `You are offline` failed strict mode because two elements
  matched. The tour helper also timed out looking for a heading `New order for
  you`, then for a `Do this later` link that is actually a button. An early
  mobile banner capture showed its lazy image before decoding.
- **Cause:** The actual navigation labels are Main/Rider/Driver; the offline
  text appears in both the switch and empty state; the assignment title is a
  styled div inside a dialog, not a heading. The priority fixture also needed
  an explicit assignment. A scroll call alone does not await lazy-image decode.
- **Fix / workaround:** Wait for unique existing actions, explicitly assign the
  synthetic job, and use the dialog's actual accessible name `New order assigned`.
  Use the verification screen's existing button role. Decode images before
  taking complete section captures.
- **Status:** resolved; preview captures generated and the tour matrix passed.
- **Refs:** `frontend/scripts/capture-install-previews.cjs`,
  `frontend/scripts/check-first-time-tour.cjs`.
- **Quality-review recurrence:** A whole-page capture initially showed unloaded
  below-fold images; section captures now explicitly decode them first. A new
  full-storage check also directly imported a dev-server module and read a
  separate memory instance (`pending`) after the live guide had dismissed.
  Verify the real behavior through client-side menu/home navigation instead
  of importing an internal memory map from a potentially different HMR URL.
- **Photo-update recurrence:** A temporary account-page probe initially used
  `Enter a phone number.` instead of the actual `Enter your phone number.`,
  matched both signup logos and tried clicking Create account while its
  password prerequisite was unmet. Read the existing form rules, scope the
  logo to the header and supply a fictional valid password before checking
  empty-phone validation. The corrected 39-case matrix passed. Early screenshot
  reads also preceded generation of those files; inspect captures after the
  browser run completes.
