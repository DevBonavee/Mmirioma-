# 2026-11-03: Demo-seed and two quote integration tests fail on the shared test database

- **Area:** database
- **Author:** DevBonavee + agent
- **Symptom:** With `TEST_DATABASE_URL` set to the local `mmirioma_fork_test` database, the six tests in `tests/test_demo_seed_integration.py` error in setup with `psycopg.errors.ForeignKeyViolation: update or delete on table "order_events" violates foreign key constraint "fk_order_price_snapshots_event_id_order_events" on table "order_price_snapshots"`. Two tests in `tests/test_quotes_integration.py` fail: `test_manual_reasons_in_the_agreed_order_and_nothing_stored` and `test_a_suspended_source_does_not_price` (`NO_ELIGIBLE_SOURCE` where `CATEGORY_UNAVAILABLE` is expected). Both groups fail the same way on a clean `development` checkout with none of the #340 changes.
- **Cause:** Not traced. The setup error points at order and price-snapshot rows left in the shared local test database by earlier runs, and the quote tests probably see leftover water sources or categories in it. This database is shared by every branch on the machine.
- **Fix / workaround:** None applied. Run the other integration tests as usual and ignore these eight, or reset the local test database (drop it, create it, `alembic upgrade head`) before a run that needs them. CI starts from an empty database, so it is not affected.
- **Status:** open
- **Refs:** `tests/test_demo_seed_integration.py`, `tests/test_quotes_integration.py`, #340.
