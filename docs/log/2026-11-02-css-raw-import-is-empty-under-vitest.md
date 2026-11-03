# 2026-11-02: A CSS `?raw` import is empty under Vitest

- **Area:** frontend
- **Author:** Bonvee120 + agent
- **Symptom:** a test that imported a stylesheet as text,
  `import css from './marketing.css?raw'`, got an empty string, so
  `/--mk-water:\s*(#[0-9a-fA-F]{6})/.exec(css)![1]` failed with `TypeError:
  Cannot read properties of null (reading '1')`. A debug test printed
  `[0,0,"",false,false]` for the lengths and content of `marketing.css` and
  `theme.css`. Reading the file with `readFileSync(new URL('./marketing.css',
  import.meta.url))` then failed with `TypeError: The URL must be of scheme
  file` (jsdom gives `import.meta.url` a non-file scheme), and `import {
  readFileSync } from 'node:fs'` failed typecheck with `error TS2591: Cannot find
  name 'node:fs'` because the frontend has no Node type package.
- **Cause:** Vitest does not process CSS files by default, and that includes a
  `?raw` import. There are no Node types in the frontend's `tsconfig`, and adding
  `@types/node` is a new dependency that needs approval.
- **Fix / workaround:** `sizeTiles.test.tsx` loads the file by name with a
  dynamic import of `node:fs/promises` (the specifier is a variable, so
  TypeScript does not look for its types), types the one function it needs, and
  builds the path from `process.cwd()`; the tests run from `frontend/` through
  `npm test`. If more tests need to read source files, ask whether to add
  `@types/node` as a dev dependency.
- **Status:** workaround
- **Refs:** #330; `frontend/src/features/marketing/sizeTiles.test.tsx`.
