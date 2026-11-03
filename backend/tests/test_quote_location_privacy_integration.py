"""The map pin kept on a quote follows the privacy rules (#385).

docs/api/order-details-and-price.md, "Amendment #385" (agreed 2026-11-03, with
the technical lead's condition): a quote priced for a customer's pin keeps that
personal data, so ``anonymize-customer`` clears it, the monthly review clears it
with the order's copy or 90 days after an unplaced quote's price expired, the
price and distance stay, and neither path writes the coordinates to the audit
log. Runs only when TEST_DATABASE_URL is set.
"""

import uuid
from datetime import UTC, datetime, timedelta

import httpx2
from sqlalchemy import func, select, update

from app.modules.audit.models import AuditLog
from app.modules.auth.models import UserRole
from app.modules.orders import service as orders
from app.modules.pricing import quotes as quote_service
from app.modules.pricing import retention
from app.modules.pricing.models import Quote
from app.modules.privacy import service as privacy
from tests import test_quotes_integration as part1
from tests.test_deliveries_integration import Created, Sessions, add_user, run
from tests.test_quotes_integration import Rows, order_for, rows, tanker, world
from tests.test_road_distance_integration import (
    PIN,
    SOURCE_A,
    FakeOsrm,
    ask,
    osrm_on,
    set_location,
)

pytestmark = part1.pytestmark

created = part1.created
rows = rows  # fixtures re-exported so pytest finds them in this module
osrm_on = osrm_on

NOW = datetime(2026, 11, 3, 12, 0, tzinfo=UTC)


async def pinned_quotes(sessions: Sessions, customer_id: uuid.UUID) -> list[Quote]:
    async with sessions() as session:
        return list(
            await session.scalars(
                select(Quote).where(Quote.customer_id == customer_id).order_by(Quote.created_at)
            )
        )


async def has_pin(sessions: Sessions, quote_id: uuid.UUID) -> bool:
    async with sessions() as session:
        quote = await session.get(Quote, quote_id)
    assert quote is not None
    return quote.delivery_location is not None


def priced_by_road() -> FakeOsrm:
    fake = FakeOsrm()
    fake.answer(SOURCE_A, 5_000)
    return fake


def test_anonymizing_a_customer_clears_the_pin_on_their_quotes_and_keeps_the_price(
    created: Created, rows: Rows, osrm_on: None
) -> None:
    async def scenario(sessions: Sessions) -> None:
        w = await world(sessions, created, rows)
        await set_location(sessions, w.admin, w.borehole_id, SOURCE_A)
        road = await ask(sessions, w, priced_by_road())
        plain = await ask(sessions, w, priced_by_road(), location=None)
        assert road.quote is not None and plain.quote is not None
        before = await stored_quote(sessions, road.quote.id)

        async with sessions() as session:
            dry = await privacy.anonymize_customer(
                session, actor=w.admin, customer_phone=w.customer.phone, now=NOW, apply=False
            )
        assert dry.quote_locations_cleared == 1
        assert await has_pin(sessions, road.quote.id)  # a dry run saves nothing

        async with sessions() as session:
            done = await privacy.anonymize_customer(
                session, actor=w.admin, customer_phone=w.customer.phone, now=NOW, apply=True
            )
        assert done.quote_locations_cleared == 1
        after = await stored_quote(sessions, road.quote.id)
        assert after.delivery_location is None and after.delivery_location_source is None
        # The price, the distance and the rates are accounting and FR-024 records: they stay.
        assert (
            after.total_minor_units,
            after.delivery_minor_units,
            after.road_distance_metres,
            after.base_delivery_fee_minor_units,
            after.delivery_basis,
        ) == (
            before.total_minor_units,
            before.delivery_minor_units,
            before.road_distance_metres,
            before.base_delivery_fee_minor_units,
            before.delivery_basis,
        )
        async with sessions() as session:
            [audit] = list(
                await session.scalars(
                    select(AuditLog).where(
                        AuditLog.action == "customer_anonymized",
                        AuditLog.target_id == w.customer.id,
                    )
                )
            )
        assert audit.details["quote_locations_cleared"] == 1
        assert "6.45" not in str(audit.details) and "7.51" not in str(audit.details)

    run(scenario)


async def stored_quote(sessions: Sessions, quote_id: uuid.UUID) -> Quote:
    async with sessions() as session:
        quote = await session.get(Quote, quote_id)
    assert quote is not None
    return quote


def test_the_review_clears_an_unplaced_quotes_pin_only_90_days_after_its_price_expired(
    created: Created, rows: Rows, osrm_on: None
) -> None:
    async def scenario(sessions: Sessions) -> None:
        w = await world(sessions, created, rows)
        await set_location(sessions, w.admin, w.borehole_id, SOURCE_A)
        recent = (await ask(sessions, w, priced_by_road())).quote
        just_inside = (await ask(sessions, w, priced_by_road())).quote
        old = (await ask(sessions, w, priced_by_road())).quote
        assert recent and just_inside and old
        async with sessions() as session:
            for quote, expired_days_ago in ((recent, 1), (just_inside, 89), (old, 91)):
                await session.execute(
                    update(Quote)
                    .where(Quote.id == quote.id)
                    .values(price_valid_until=NOW - timedelta(days=expired_days_ago))
                )
            await session.commit()

        async with sessions() as session:
            review = await privacy.retention_review(session, actor=w.admin, now=NOW, apply=True)
        assert review.quote_locations_cleared >= 1
        assert await has_pin(sessions, recent.id)
        assert await has_pin(sessions, just_inside.id)
        assert not await has_pin(sessions, old.id)
        assert (await stored_quote(sessions, old.id)).total_minor_units == old.total_minor_units

        async with sessions() as session:
            again = await privacy.retention_review(session, actor=w.admin, now=NOW, apply=True)
        assert again.quote_locations_cleared == 0  # running it again finds nothing new

    run(scenario)


def test_a_quote_an_order_was_placed_with_keeps_its_pin_until_the_order_is_anonymized(
    created: Created, rows: Rows, osrm_on: None
) -> None:
    async def scenario(sessions: Sessions) -> None:
        w = await world(sessions, created, rows)
        await set_location(sessions, w.admin, w.borehole_id, SOURCE_A)
        choice = tanker(w.zone_id)
        answer = await ask(sessions, w, priced_by_road())
        assert answer.quote is not None
        async with sessions() as session:
            order, _ = await orders.create_order(
                session,
                customer_id=w.customer.id,
                request=order_for(choice, answer.quote.id, delivery_location=PIN),
            )
        # Long expired, but an order was placed with it: the review leaves the pin.
        async with sessions() as session:
            await session.execute(
                update(Quote)
                .where(Quote.id == answer.quote.id)
                .values(price_valid_until=NOW - timedelta(days=400))
            )
            await session.commit()
        async with sessions() as session:
            await privacy.retention_review(session, actor=w.admin, now=NOW, apply=True)
        assert await has_pin(sessions, answer.quote.id)

        # Anonymizing the order takes the quote's pin with it.
        async with sessions() as session:
            cleared = await retention.clear_order_quote_locations(session, order_ids=[order.id])
            await session.commit()
        assert cleared == 1
        assert not await has_pin(sessions, answer.quote.id)

    run(scenario)


def test_an_unrelated_customers_quotes_are_untouched(
    created: Created, rows: Rows, osrm_on: None
) -> None:
    async def scenario(sessions: Sessions) -> None:
        w = await world(sessions, created, rows)
        other = await add_user(sessions, created, UserRole.CUSTOMER)
        await set_location(sessions, w.admin, w.borehole_id, SOURCE_A)
        mine = (await ask(sessions, w, priced_by_road())).quote
        async with sessions() as session:
            theirs = await quote_service.create_quote(
                session,
                customer_id=other.id,
                choice=tanker(w.zone_id),
                delivery_location=PIN,
                osrm_transport=httpx2.MockTransport(priced_by_road().handler),
            )
        assert mine and theirs.quote
        async with sessions() as session:
            await retention.clear_customer_quote_locations(session, customer_ids=[w.customer.id])
            await session.commit()
        assert not await has_pin(sessions, mine.id)
        assert await has_pin(sessions, theirs.quote.id)
        async with sessions() as session:
            count = await session.scalar(
                select(func.count())
                .select_from(Quote)
                .where(Quote.customer_id == other.id, Quote.delivery_location.is_not(None))
            )
        assert count == 1

    run(scenario)


def test_nothing_to_clear_is_a_quiet_zero(created: Created) -> None:
    async def scenario(sessions: Sessions) -> None:
        async with sessions() as session:
            assert await retention.clear_customer_quote_locations(session, customer_ids=[]) == 0
            assert await retention.clear_order_quote_locations(session, order_ids=[]) == 0

    run(scenario)
