# 2026-11-04: Responsive-check configuration discovery

- **Area:** tooling
- **Author:** Daveoski (+ Codex agent)
- **Symptom:** Reading `frontend/vitest.config.ts` failed with
  `Cannot find path ... because it does not exist.` The production build also
  emitted the existing large-chunk notice and
  `inlineDynamicImports option is deprecated, please use codeSplitting: false instead.`
- **Cause:** Vitest settings live in `frontend/vite.config.ts`, not a separate
  config file. The deprecated option comes from the existing PWA plugin;
  see the 2026-10-19 archived build-warning entry in `LOG.md`.
- **Fix / workaround:** Read the existing Vite configuration. The build passed;
  no dependency or unrelated bundling changes were introduced for this layout fix.
  Full frontend tests passed (125 files, 1,632 tests), with jsdom's unsupported
  `Window's scrollTo() method` notices. The backend run repeated the documented
  Windows Bash/deployment limitations: 23 failed, 1,745 passed, 307 skipped.
  No backend or deployment files changed. See the existing Windows-checkout
  and pytest temporary-directory entries for those environment limitations.
- **Status:** workaround
- **Refs:** `frontend/vite.config.ts`, `LOG.md` (PWA build warning and chunk-size entries),
  `docs/features/responsive-layout.md`.
