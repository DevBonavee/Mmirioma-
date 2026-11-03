# 2026-11-02: Issue #334 said the OSM tile server forbids production use; the policy is softer

- **Area:** process
- **Author:** nnamdi-security + agent
- **Symptom:** Issue #334 says "the OpenStreetMap public tile server does not allow production use". The policy page (https://operations.osmfoundation.org/policies/tiles/) has no such sentence.
- **Cause:** A short paraphrase of the policy. It forbids heavy use without permission, gives no SLA or guarantee, and says commercial services should expect access "may be withdrawn at any point".
- **Fix / workaround:** `docs/architecture/maps.md` states the actual rules and still excludes the public tile server (option M4) for the pilot. The conclusion is the same; only the wording differs.
- **Status:** resolved
- **Refs:** #334, `docs/architecture/maps.md`.
