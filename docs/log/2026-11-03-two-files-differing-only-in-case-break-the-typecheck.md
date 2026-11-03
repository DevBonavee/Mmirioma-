# 2026-11-03: `shellScope.ts` and `ShellScope.tsx` in one folder broke the typecheck

- **Area:** frontend
- **Author:** Bonvee120 + agent
- **Symptom:** After adding a context file `components/layout/shellScope.ts` next to the component file `components/layout/ShellScope.tsx` (#341), `npx tsc -p tsconfig.app.json --noEmit` failed with `error TS2724: '"../../components/layout/ShellScope"' has no exported member named 'ShellScope'. Did you mean 'useShellScope'?` and `error TS1149: File name '.../ShellScope.ts' differs from already included file name '.../shellScope.ts' only in casing`.
- **Cause:** The two names differ only in case. On Windows and macOS (case-insensitive file systems) the import `./ShellScope` can resolve to either file, and TypeScript refuses to include both. It would also be ambiguous for anyone cloning on those systems, even if Linux CI accepted it.
- **Fix / workaround:** Renamed the context file to `shellContext.ts`. Do not give two files in one folder names that differ only in case.
- **Status:** resolved
- **Refs:** #341, `frontend/src/components/layout/shellContext.ts`.
