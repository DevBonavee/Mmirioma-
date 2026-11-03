"""Delivery locations against a real PostGIS database (#340).

docs/api/delivery-location.md: a saved address and an order each keep an
optional map point; the order keeps its own copy (FR-024); the driver sees it
only while the job is accepted; ``anonymize-customer`` and the retention review
clear it. Also the table CHECKs that keep a point and its source together.

Runs only when TEST_DATABASE_URL is set (``alembic upgrade head`` first).
Rows come from the privacy tests' helpers and fixtures, so they are dated
2017-2021 where the review is involved and are deleted afterwards.
"""

import uuid
from datetime import UTC, datetime

import pytest
from geoalchemy2 import WKTElement
from sqlalchemy import select, text, update
from sqlalchemy.exc import IntegrityError

from app.core.errors import APIError
from app.modules.audit.models import AuditLog
from app.modules.auth.models import User, UserRole
from app.modules.customers import service as customers
from app.modules.deliveries import service as deliveries
from app.modules.deliveries.schemas import DriverJobDetail
from app.modules.dispatch.models import AssignmentStatus
from app.modules.orders import service as orders
from app.modules.orders.models import Order, OrderStatus
from app.modules.orders.schemas import OrderRead
from app.modules.pricing.models import ServiceZone
from app.modules.privacy import service as privacy
from app.shared.location import Location
from tests import test_deliveries_integration as part1
from tests.test_deliveries_integration import NOW, add_job, add_user, setup
from tests.test_privacy_integration import (  # noqa: F401  (fixtures: cleanup of this module's rows)
    OLD,
    REVIEW_NOW,
    ZONE_IDS,
    Created,
    Sessions,
    Setup,
    anonymize,
    delete_audit_rows,
    finished_job,
    pytestmark,
    run,
)

created = part1.created

PIN = Location.model_validate({"latitude": 6.452713, "longitude": 7.510348, "source": "map_pin"})
DEVICE = Location.model_validate(
    {"latitude": 6.4584, "longitude": 7.4951, "source": "device_location"}
)
ELSEWHERE = Location.model_validate({"latitude": 6.46, "longitude": 7.52, "source": "map_pin"})


async def add_zone(sessions: Sessions) -> ServiceZone:
    async with sessions() as session:
        zone = ServiceZone(
            name=f"Sample zone {uuid.uuid4().hex[:8]}",
            is_active=True,
            centre=WKTElement("POINT(7.4951 6.4584)", srid=4326),
        )
        session.add(zone)
        await session.commit()
    ZONE_IDS.append(zone.id)
    return zone


def address_data(
    zone: ServiceZone, *, location: Location | None = None, change: bool = True
) -> customers.AddressData:
    return customers.AddressData(
        label="Home",
        address="12 Sample Close, Enugu",
        landmark=None,
        zone_id=zone.id,
        make_default=False,
        location=location,
        change_location=change,
    )


async def add_address(
    sessions: Sessions, customer: User, zone: ServiceZone, location: Location | None
) -> customers.AddressView:
    async with sessions() as session:
        return await customers.add_address(session, customer, address_data(zone, location=location))


async def update_address(
    sessions: Sessions,
    customer: User,
    address_id: uuid.UUID,
    zone: ServiceZone,
    *,
    location: Location | None = None,
    change: bool,
) -> customers.AddressView:
    async with sessions() as session:
        return await customers.update_address(
            session, customer, address_id, address_data(zone, location=location, change=change)
        )


def point_of(view: customers.AddressView) -> tuple[float | None, float | None, str | None]:
    address = view.address
    return address.location_latitude, address.location_longitude, address.location_source


def new_order(location: Location | None, **changes: object) -> orders.NewOrder:
    fields: dict[str, object] = {
        "idempotency_key": uuid.uuid4(),
        "quantity_litres": 1200,
        "contact_name": "Sample Customer",
        "contact_phone": "+2348000000001",
        "delivery_address": "12 Sample Close, Independence Layout, Enugu",
        "delivery_location": location,
    }
    fields.update(changes)
    return orders.NewOrder(**fields)  # type: ignore[arg-type]


async def order_point(
    sessions: Sessions, reference: str
) -> tuple[float | None, float | None, str | None]:
    async with sessions() as session:
        row = (
            await session.execute(
                select(
                    Order.delivery_location_latitude,
                    Order.delivery_location_longitude,
                    Order.delivery_location_source,
                ).where(Order.reference == reference)
            )
        ).one()
    return row[0], row[1], row[2]


async def pin_order(sessions: Sessions, reference: str, location: Location = PIN) -> None:
    """Give an order made by the deliveries helpers a point."""
    async with sessions() as session:
        await session.execute(
            update(Order)
            .where(Order.reference == reference)
            .values(
                delivery_location=WKTElement(
                    f"POINT({location.longitude} {location.latitude})", srid=4326
                ),
                delivery_location_source=location.source.value,
            )
        )
        await session.commit()


# --- Saved addresses --------------------------------------------------------------------


def test_a_saved_address_keeps_its_location_and_patch_follows_the_contract(
    created: Created,
) -> None:
    async def scenario(sessions: Sessions) -> None:
        s = await setup(sessions, created)
        zone = await add_zone(sessions)

        saved = await add_address(sessions, s.customer, zone, PIN)
        assert point_of(saved) == (6.452713, 7.510348, "map_pin")
        bare = await add_address(sessions, s.customer, zone, None)
        assert point_of(bare) == (None, None, None)

        async with sessions() as session:
            listed, _ = await customers.list_addresses(session, s.customer, limit=10, offset=0)
        assert {view.address.id: point_of(view) for view in listed} == {
            saved.address.id: (6.452713, 7.510348, "map_pin"),
            bare.address.id: (None, None, None),
        }

        # PATCH without the field: the pin stays.
        kept = await update_address(sessions, s.customer, saved.address.id, zone, change=False)
        assert point_of(kept) == (6.452713, 7.510348, "map_pin")
        # PATCH with a new point: replaced, with its new source.
        moved = await update_address(
            sessions, s.customer, saved.address.id, zone, location=DEVICE, change=True
        )
        assert point_of(moved) == (6.4584, 7.4951, "device_location")
        # PATCH with null: removed, and the source with it.
        removed = await update_address(sessions, s.customer, saved.address.id, zone, change=True)
        assert point_of(removed) == (None, None, None)

    run(scenario)


def test_changing_the_pin_is_audited_by_field_name_and_never_with_the_coordinates(
    created: Created,
) -> None:
    async def scenario(sessions: Sessions) -> None:
        s = await setup(sessions, created)
        zone = await add_zone(sessions)
        saved = await add_address(sessions, s.customer, zone, PIN)

        # The same point again is not a change.
        await update_address(
            sessions, s.customer, saved.address.id, zone, location=PIN, change=True
        )
        await update_address(
            sessions, s.customer, saved.address.id, zone, location=ELSEWHERE, change=True
        )
        async with sessions() as session:
            rows = list(
                await session.scalars(
                    select(AuditLog).where(
                        AuditLog.target_id == saved.address.id,
                        AuditLog.action == "customer_address_updated",
                    )
                )
            )
        assert [row.details["fields"] for row in rows] == [["location"]]
        everything = " ".join(str(row.details) for row in rows)
        assert "6.4" not in everything and "7.5" not in everything

    run(scenario)


def test_another_customer_never_sees_or_changes_a_saved_pin(created: Created) -> None:
    async def scenario(sessions: Sessions) -> None:
        s = await setup(sessions, created)
        other = await add_user(sessions, created, UserRole.CUSTOMER)
        zone = await add_zone(sessions)
        saved = await add_address(sessions, s.customer, zone, PIN)

        async with sessions() as session:
            theirs, total = await customers.list_addresses(session, other, limit=10, offset=0)
        assert (theirs, total) == ([], 0)
        with pytest.raises(APIError) as caught:
            await update_address(sessions, other, saved.address.id, zone, change=True)
        assert caught.value.code == "address_not_found"
        mine = await update_address(sessions, s.customer, saved.address.id, zone, change=False)
        assert point_of(mine) == (6.452713, 7.510348, "map_pin")

    run(scenario)


@pytest.mark.parametrize(
    "statement",
    [
        "UPDATE customer_addresses SET location_source = NULL, "
        "location = ST_GeogFromText('SRID=4326;POINT(7.5 6.4)') WHERE id = :id",
        "UPDATE customer_addresses SET location = NULL, location_source = 'map_pin' WHERE id = :id",
        "UPDATE customer_addresses SET location_source = 'typed', "
        "location = ST_GeogFromText('SRID=4326;POINT(7.5 6.4)') WHERE id = :id",
    ],
)
def test_the_database_keeps_a_point_and_its_source_together(
    created: Created, statement: str
) -> None:
    async def scenario(sessions: Sessions) -> None:
        s = await setup(sessions, created)
        zone = await add_zone(sessions)
        saved = await add_address(sessions, s.customer, zone, None)
        async with sessions() as session:
            with pytest.raises(IntegrityError):
                await session.execute(text(statement), {"id": saved.address.id})

    run(scenario)


# --- Orders -----------------------------------------------------------------------------


def test_an_order_keeps_its_own_copy_of_the_location(created: Created) -> None:
    async def scenario(sessions: Sessions) -> None:
        s = await setup(sessions, created)
        zone = await add_zone(sessions)
        saved = await add_address(sessions, s.customer, zone, PIN)

        async with sessions() as session:
            order, created_now = await orders.create_order(
                session, customer_id=s.customer.id, request=new_order(PIN)
            )
        assert created_now
        assert await order_point(sessions, order.reference) == (6.452713, 7.510348, "map_pin")

        # FR-024: moving or deleting the saved address never changes the order.
        await update_address(
            sessions, s.customer, saved.address.id, zone, location=ELSEWHERE, change=True
        )
        assert await order_point(sessions, order.reference) == (6.452713, 7.510348, "map_pin")
        async with sessions() as session:
            await customers.remove_address(session, s.customer, saved.address.id)
        assert await order_point(sessions, order.reference) == (6.452713, 7.510348, "map_pin")

        async with sessions() as session:
            lookups = await orders.read_lookups(session, [order], with_feedback=True)
            read = OrderRead.from_order(order, lookups)
        assert read.delivery_location is not None
        assert read.delivery_location.model_dump(mode="json") == {
            "latitude": 6.452713,
            "longitude": 7.510348,
            "source": "map_pin",
        }

    run(scenario)


def test_an_order_without_a_location_reads_back_null(created: Created) -> None:
    async def scenario(sessions: Sessions) -> None:
        s = await setup(sessions, created)
        async with sessions() as session:
            order, _ = await orders.create_order(
                session, customer_id=s.customer.id, request=new_order(None)
            )
            lookups = await orders.read_lookups(session, [order], with_feedback=True)
            assert OrderRead.from_order(order, lookups).delivery_location is None
        assert await order_point(sessions, order.reference) == (None, None, None)

    run(scenario)


def test_the_location_is_part_of_the_idempotency_comparison(created: Created) -> None:
    async def scenario(sessions: Sessions) -> None:
        s = await setup(sessions, created)
        key = uuid.uuid4()
        async with sessions() as session:
            first, made = await orders.create_order(
                session, customer_id=s.customer.id, request=new_order(PIN, idempotency_key=key)
            )
        assert made

        # The same key and the same point is a retry: the same order comes back.
        async with sessions() as session:
            again, made = await orders.create_order(
                session, customer_id=s.customer.id, request=new_order(PIN, idempotency_key=key)
            )
        assert (made, again.id) == (False, first.id)

        for changed in (ELSEWHERE, None):
            async with sessions() as session:
                with pytest.raises(APIError) as caught:
                    await orders.create_order(
                        session,
                        customer_id=s.customer.id,
                        request=new_order(changed, idempotency_key=key),
                    )
            assert caught.value.code == "idempotency_key_reused"

    run(scenario)


# --- The driver --------------------------------------------------------------------------


def test_the_driver_sees_the_point_only_while_the_job_is_accepted(created: Created) -> None:
    async def scenario(sessions: Sessions) -> None:
        s = await setup(sessions, created)
        driver = await add_user(sessions, created, UserRole.DRIVER)
        offered = await add_job(
            sessions,
            s,
            driver,
            order_status=OrderStatus.ASSIGNED,
            assignment_status=AssignmentStatus.OFFERED,
        )
        await pin_order(sessions, offered)

        async with sessions() as session:
            job = await deliveries.get_driver_job(
                session, driver_id=driver.id, reference=offered, now=NOW
            )
        offer = DriverJobDetail.from_job(job)
        assert offer.receiver is None and offer.delivery_location is None

        second_driver = await add_user(sessions, created, UserRole.DRIVER)
        accepted = await add_job(sessions, s, second_driver, order_status=OrderStatus.ACCEPTED)
        await pin_order(sessions, accepted)
        async with sessions() as session:
            job = await deliveries.get_driver_job(
                session, driver_id=second_driver.id, reference=accepted, now=NOW
            )
        detail = DriverJobDetail.from_job(job)
        assert detail.delivery_location is not None
        # Latitude and longitude only: the customer's "source" is not the driver's business.
        assert detail.delivery_location.model_dump() == {
            "latitude": 6.452713,
            "longitude": 7.510348,
        }

    run(scenario)


# --- The privacy tool --------------------------------------------------------------------


def test_anonymize_clears_the_order_points_and_counts_them_and_dry_run_saves_nothing(
    created: Created,
) -> None:
    async def scenario(sessions: Sessions) -> None:
        s = await setup(sessions, created)
        driver = await add_user(sessions, created, UserRole.DRIVER)
        zone = await add_zone(sessions)
        pinned = await finished_job(sessions, s, driver, order_status=OrderStatus.DELIVERED)
        bare = await finished_job(sessions, s, driver, order_status=OrderStatus.CANCELLED)
        await pin_order(sessions, pinned)
        saved = await add_address(sessions, s.customer, zone, PIN)

        dry = await anonymize(sessions, s, apply=False)
        assert (dry.orders_anonymized, dry.order_locations_cleared) == (2, 1)
        assert await order_point(sessions, pinned) == (6.452713, 7.510348, "map_pin")

        done = await anonymize(sessions, s, apply=True)
        assert (done.orders_anonymized, done.order_locations_cleared) == (2, 1)
        assert await order_point(sessions, pinned) == (None, None, None)
        assert await order_point(sessions, bare) == (None, None, None)
        # Saved addresses, with their points, are deleted with the account.
        assert done.addresses_removed == 1
        async with sessions() as session:
            assert await session.get(customers.CustomerAddress, saved.address.id) is None
            audit = await session.scalar(
                select(AuditLog).where(
                    AuditLog.actor_id == s.admin.id, AuditLog.action == "customer_anonymized"
                )
            )
        assert audit is not None and audit.details["order_locations_cleared"] == 1
        # Counts only: the audit row holds no coordinates.
        assert "6.45" not in str(audit.details) and "7.51" not in str(audit.details)

    run(scenario)


def test_the_review_clears_the_points_of_orders_finished_over_three_years_ago(
    created: Created,
) -> None:
    async def scenario(sessions: Sessions) -> None:
        s = await setup(sessions, created)
        driver = await add_user(sessions, created, UserRole.DRIVER)
        old = await finished_job(
            sessions,
            s,
            driver,
            order_status=OrderStatus.DELIVERED,
            events=[(OrderStatus.DELIVERED, datetime(2017, 5, 1, tzinfo=UTC))],
        )
        recent = await finished_job(
            sessions,
            s,
            driver,
            order_status=OrderStatus.DELIVERED,
            events=[(OrderStatus.DELIVERED, OLD)],
        )
        await pin_order(sessions, old)
        await pin_order(sessions, recent)

        async def review(apply: bool) -> privacy.ReviewResult:
            async with sessions() as session:
                return await privacy.retention_review(
                    session, actor=s.admin, now=REVIEW_NOW, apply=apply
                )

        dry = await review(False)
        assert dry.order_locations_cleared == 1
        assert await order_point(sessions, old) == (6.452713, 7.510348, "map_pin")

        done = await review(True)
        assert done.order_locations_cleared == 1
        assert await order_point(sessions, old) == (None, None, None)
        # Under three years: the order and its point are kept.
        assert await order_point(sessions, recent) == (6.452713, 7.510348, "map_pin")

        again = await review(True)
        assert again.order_locations_cleared == 0
        async with sessions() as session:
            audit = await session.scalar(
                select(AuditLog)
                .where(
                    AuditLog.actor_id == s.admin.id, AuditLog.action == "retention_review_applied"
                )
                .order_by(AuditLog.created_at)
            )
        assert audit is not None and audit.details["order_locations_cleared"] == 1

    run(scenario)
