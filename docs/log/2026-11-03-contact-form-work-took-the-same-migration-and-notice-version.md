# 2026-11-03: The contact form work took the same migration number and notice version

- **Area:** database
- **Author:** chidimmamogbo (+ Claude Code)
- **Symptom:** PR #367 showed `CONFLICTING` and `gh pr checks` said `no checks
  reported`, because GitHub does not start `pull_request` CI on a conflicting PR.
  #339 had reached `development` with its own migration `0024`, and had moved the
  privacy notice to 4.0, the number #367 used. Git reported text conflicts in
  `PRIVACY_NOTICE.md`, `LegalPages.tsx` and `privacy-retention.md`, but not the
  migration, because the two files have different names.
- **Cause:** both branches started from a `development` with head `0023`, and each
  took the next number.
- **Fix / workaround:** merged `development` into the branch, renumbered this
  migration to `0025` after `0024`, and made the notice 5.0 with both changes kept.
  #346 then also took 5.0, which git merged silently because both branches had the
  same line, so the notice became 6.0 on a second merge. Check the version on
  `development` before merging, not only the conflicts.
  The scratch test database was recreated, because it had the old `0024` applied.
  Before opening a PR with a migration, check the head on an up-to-date
  `development` with `git ls-tree origin/development --name-only backend/alembic/versions/`.
- **Status:** resolved
- **Refs:** #332, #339, #367,
  [earlier case](2026-10-27-two-open-prs-took-the-same-migration-number.md)
