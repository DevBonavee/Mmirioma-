# 2026-11-03: migration and notice numbers collided with #340 and may with #367 (#332)

- **Area:** process
- **Author:** cloudcrackamara + agent
- **Symptom:** The #385 branch adds migration `0026` (revising `0024`) and privacy notice version 6.0 while #367 (#332), still open, adds migration `0025` (also revising `0024`) and notice 6.0. Whichever merges second would leave two Alembic heads and a duplicate notice version, and git does not flag either.
- **Cause:** Parallel branches take the next number when they start; the same kind of collision as the contact form (#339) and the service-area map (#346) had on the notice version.
- **Fix / workaround:** The second PR to merge changes `down_revision` of its migration to the other's revision (`alembic heads` must show one), renames its notice version to the next major, and re-runs `alembic upgrade head`, `downgrade -1` and `alembic check` and `privacyNotice.test.tsx`. Said in the #385 PR body.
- **Status:** resolved (#340 merged first, then #367: the migration is now `0027` revising `0026`, and the notice is 8.0)
- **Refs:** #385, #367, `backend/alembic/versions/20261103_0027_add_road_distance_pricing.py`, `PRIVACY_NOTICE.md`.
