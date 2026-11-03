# 2026-11-03: migration `0026` and notice 6.0 may collide with #367 (#332)

- **Area:** process
- **Author:** cloudcrackamara + agent
- **Symptom:** The #385 branch adds migration `0026` (revising `0024`) and privacy notice version 6.0 while #367 (#332), still open, adds migration `0025` (also revising `0024`) and notice 6.0. Whichever merges second would leave two Alembic heads and a duplicate notice version, and git does not flag either.
- **Cause:** Parallel branches take the next number when they start; the same kind of collision as the contact form (#339) and the service-area map (#346) had on the notice version.
- **Fix / workaround:** The second PR to merge changes `down_revision` of its migration to the other's revision (`alembic heads` must show one), renames its notice version to the next major, and re-runs `alembic upgrade head`, `downgrade -1` and `alembic check` and `privacyNotice.test.tsx`. Said in the #385 PR body.
- **Status:** open (until #367 or #385 merges)
- **Refs:** #385, #367, `backend/alembic/versions/20261103_0026_add_road_distance_pricing.py`, `PRIVACY_NOTICE.md`.
