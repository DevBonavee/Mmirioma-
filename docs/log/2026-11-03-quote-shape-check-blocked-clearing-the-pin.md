# 2026-11-03: a CHECK on the quote's pin made the privacy clear fail

- **Area:** database
- **Author:** cloudcrackamara + agent
- **Symptom:** `anonymize-customer` and the retention review failed on a road-distance quote with `CheckViolationError: new row for relation "quotes" violates check constraint "ck_quotes_delivery_basis_shape"` when they set `delivery_location` to null.
- **Cause:** In the first draft of migration `0026`, the "road distance" shape (and a second check, `fallback_reason_needs_location`) required `delivery_location IS NOT NULL`. The pin is personal data that the privacy rules must be able to remove later, while the price, distance and rates stay. Found by the privacy integration tests.
- **Fix / workaround:** The pin is no longer part of either check. `0026` keeps the `delivery_basis_shape` check on the distance, the source and the rates, and the `delivery_location_complete` check that the pin and its source are set or cleared together. The contract's "Built in #385" section says so.
- **Status:** resolved
- **Refs:** #385, `backend/alembic/versions/20261103_0026_add_road_distance_pricing.py`, `backend/tests/test_quote_location_privacy_integration.py`.
