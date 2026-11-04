# 2026-10-26: `vite/client` types not found in tsconfig.app.json

- **Area:** tooling
- **Author:** Daveoski (+ Claude Code)
- **Symptom:** VS Code showed an error on `frontend/tsconfig.app.json`:
  `Cannot find type definition file for 'vite/client'. The file is in the
  program because: Entry point of type library 'vite/client' specified in
  compilerOptions`.
- **Cause:** `frontend/node_modules` did not exist in a fresh clone, so
  `vite/client.d.ts` was missing. The config itself is correct.
- **Fix / workaround:** `cd frontend && npm ci` (installs from the committed
  lockfile). `npm run typecheck` then passed and the error cleared. Do not
  remove `"types": ["vite/client"]`: `import.meta.env` needs it. `npm ci` also
  warned `EBADENGINE` for jsdom 30 and friends on Node v24.14.0 (they want
  `^24.15.0`); the install and typecheck still worked, but upgrade Node to
  24.15 or later if tests misbehave.
- **Seen again (Daveoski + agent, 2026-11-03):** the same error, twice. First
  in a checkout with no `frontend/node_modules`: TypeScript then resolved to a
  stray 7.0.2 in a `node_modules` folder in the user's home directory (outside
  the repository), which hid the cause; `npm ci` fixed it. Then, after pulling
  `development`, `npm run typecheck` failed with `Cannot find module
  'maplibre-gl' or its corresponding type declarations`: the lockfile had gained
  `maplibre-gl` (#346), and `node_modules` was older. Run `npm ci` again after
  every pull that changes `frontend/package-lock.json`.
- **Status:** resolved
- **Quality-review recurrence (2026-11-04):** The read-only npm audit dry-run
  again reported `EBADENGINE`: local Node is 24.14.0 while jsdom 30.1.3 and
  related test tools require `^24.15.0` on Node 24. README now states the
  supported minimum. No global Node installation or lockfile was changed.
- **Refs:** `frontend/tsconfig.app.json`, `frontend/package-lock.json`
