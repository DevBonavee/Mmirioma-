# 2026-11-02: `npm run typecheck` showed 650 errors because node_modules was out of date

- **Area:** tooling
- **Author:** cloudcrackamara + agent
- **Symptom:** `npm run typecheck` printed 650 errors on an unchanged checkout, such as `Property 'toBeInTheDocument' does not exist on type 'Assertion<void, HTMLElement>'`, `Cannot find module '@testing-library/jest-dom/vitest'` and `Cannot find module 'vite-plugin-pwa'`.
- **Cause:** The installed `node_modules` predated `@testing-library/jest-dom` and `vite-plugin-pwa` in `package.json` and `package-lock.json`.
- **Fix / workaround:** `npm ci` in `frontend/`. After it, lint, typecheck and build pass. Run it after pulling a change to `package-lock.json`.
- **Status:** resolved
- **Refs:** #333.
