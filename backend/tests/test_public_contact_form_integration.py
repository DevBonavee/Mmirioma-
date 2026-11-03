"""The website contact form against a real, migrated database (#339).

docs/api/public-site.md ("POST /public/contact", agreed 2026-11-02): the
message is stored as a support request with no user, it shows in the admin
queue and can be searched, called and resolved there, every active admin is
told without the name, phone or message in the notification, the database
refuses a request that mixes the app and website shapes, the customer's own
list never shows it, and the 3-years-after-resolution deletion reaches it.

Runs only when TEST_DATABASE_URL is set (``alembic upgrade head`` first).
Every row is created here and deleted afterwards: website requests have no
user, so they are removed by their unique phone number.
"""

import secrets
import uuid
from collections.abc import Iterator
from datetime import UTC, datetime

import psycopg
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError

from app.core.config import get_settings
from app.main import create_app
from app.modules.audit.models import AuditLog
from app.modules.auth.models import UserRole
from app.modules.customers import requests, retention
from app.modules.customers.models import (
    SupportRequest,
    SupportRequestSource,
    SupportRequestStatus,
    SupportRequestType,
)
from app.modules.public.contact_form import get_contact_form_limits
from tests import test_admin_operations_integration as part1
from tests import test_dispatch_integration as dispatch_tests
from tests.test_admin_operations_integration import Created, admin_messages_for
from tests.test_deliveries_integration import Sessions, expect_error
from tests.test_orders_integration import TEST_DATABASE_URL, run

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(not TEST_DATABASE_URL, reason="TEST_DATABASE_URL is not set"),
]

created = part1.created

VISITOR_NAME = "Chinedu Visitor"
VISITOR_MESSAGE = "Do you deliver to Independence Layout?"
LONG_AGO = datetime(1990, 1, 1, tzinfo=UTC)


@pytest.fixture
def visitor_phone(created: Created) -> Iterator[str]:
    """A phone number no other row uses; website requests with it are deleted afterwards."""
    phone = "+23480" + "".join(secrets.choice("0123456789") for _ in range(8))
    yield phone
    url = get_settings().sync_database_url.set(drivername="postgresql")
    with psycopg.connect(url.render_as_string(hide_password=False)) as connection:
        connection.execute("DELETE FROM support_requests WHERE contact_phone = %s", (phone,))


async def send(sessions: Sessions, phone: str, **changes: str) -> SupportRequest:
    async with sessions() as session:
        return await requests.create_website_support_request(
            session,
            **{
                "name": VISITOR_NAME,
                "phone": phone,
                "message": VISITOR_MESSAGE,
                "type": SupportRequestType.OTHER,
                **changes,
            },  # type: ignore[arg-type]
        )


def test_a_website_message_is_stored_without_a_user_and_tells_every_admin(
    created: Created, visitor_phone: str
) -> None:
    async def scenario(sessions: Sessions) -> None:
        admin = await dispatch_tests.add_user(sessions, created, UserRole.ADMIN)  # type: ignore[arg-type]
        before = await admin_messages_for(sessions, [admin.id])
        stored = await send(sessions, visitor_phone)
        assert stored.reference.startswith("SR-") and len(stored.reference) == 11
        assert (stored.source, stored.user_id, stored.idempotency_key) == (
            SupportRequestSource.WEBSITE,
            None,
            None,
        )
        assert (stored.contact_name, stored.contact_phone) == (VISITOR_NAME, visitor_phone)
        assert (stored.status, stored.order_id) == (SupportRequestStatus.OPEN, None)

        new = (await admin_messages_for(sessions, [admin.id]))[len(before) :]
        assert [row[1:] for row in new] == [
            ("support_request", "Someone sent a message through the website.", None)
        ]
        text = new[0][2]
        assert VISITOR_NAME not in text and visitor_phone not in text
        assert VISITOR_MESSAGE not in text

    run(scenario)


def test_staff_list_search_call_and_resolve_a_website_request(
    created: Created, visitor_phone: str
) -> None:
    async def scenario(sessions: Sessions) -> None:
        admin = await dispatch_tests.add_user(sessions, created, UserRole.ADMIN)  # type: ignore[arg-type]
        stored = await send(sessions, visitor_phone)

        async with sessions() as session:
            views, total = await requests.list_admin_support_requests(
                session, status=SupportRequestStatus.OPEN, q="chinedu vis", limit=50, offset=0
            )
            assert [view.request.reference for view in views] == [stored.reference]
            assert total == 1
            view = views[0]
            assert (view.customer.id, view.customer.name, view.customer.phone) == (
                None,
                VISITOR_NAME,
                visitor_phone,
            )
            assert (view.order_reference, view.is_simulated) == (None, False)

            detail, contacts = await requests.get_admin_support_request(
                session, reference=stored.reference
            )
            assert detail.request.source is SupportRequestSource.WEBSITE
            assert [(c.role, c.name, c.phone) for c in contacts] == [
                ("customer", VISITOR_NAME, visitor_phone)
            ]
            assert await requests.count_open_support_requests(session) >= 1

        async with sessions() as session:
            resolved = await requests.resolve_support_request(
                session, reference=stored.reference, admin=admin, note="Called the visitor."
            )
        assert resolved.request.status is SupportRequestStatus.RESOLVED
        assert resolved.customer.id is None
        async with sessions() as session:
            await expect_error(
                requests.resolve_support_request(
                    session, reference=stored.reference, admin=admin, note="Again, later."
                ),
                409,
                "support_request_already_resolved",
            )
            audit = list(
                await session.scalars(select(AuditLog).where(AuditLog.target_id == stored.id))
            )
        # The audit row holds ids and kinds only, never the visitor's details.
        assert [row.action for row in audit] == ["support_request_resolved"]
        assert VISITOR_NAME not in str(audit[0].__dict__)
        assert visitor_phone not in str(audit[0].__dict__)

    run(scenario)


def test_a_customers_own_list_never_shows_a_website_request(
    created: Created, visitor_phone: str
) -> None:
    async def scenario(sessions: Sessions) -> None:
        customer = await dispatch_tests.add_user(sessions, created, UserRole.CUSTOMER)  # type: ignore[arg-type]
        await send(sessions, visitor_phone)
        async with sessions() as session:
            rows, total = await requests.list_support_requests(
                session, customer, limit=50, offset=0
            )
        assert (rows, total) == ([], 0)

    run(scenario)


def test_the_database_refuses_a_request_that_mixes_the_two_shapes(
    created: Created, visitor_phone: str
) -> None:
    async def scenario(sessions: Sessions) -> None:
        customer = await dispatch_tests.add_user(sessions, created, UserRole.CUSTOMER)  # type: ignore[arg-type]
        base = {
            "reference": requests.new_reference(requests.SUPPORT_PREFIX),
            "type": SupportRequestType.OTHER,
            "message": "A message",
        }
        bad = [
            # A website request with an account.
            {
                "source": SupportRequestSource.WEBSITE,
                "user_id": customer.id,
                "contact_name": "A",
                "contact_phone": visitor_phone,
            },
            # A website request without a phone.
            {"source": SupportRequestSource.WEBSITE, "contact_name": "A"},
            # An app request without an account.
            {"source": SupportRequestSource.APP, "idempotency_key": uuid.uuid4()},
            # An app request carrying contact fields.
            {
                "source": SupportRequestSource.APP,
                "user_id": customer.id,
                "idempotency_key": uuid.uuid4(),
                "contact_name": "A",
                "contact_phone": visitor_phone,
            },
        ]
        for fields in bad:
            async with sessions() as session:
                session.add(
                    SupportRequest(**{**base, "reference": requests.new_reference("SR-")}, **fields)  # type: ignore[arg-type]
                )
                with pytest.raises(IntegrityError):
                    await session.commit()

    run(scenario)


def test_the_three_year_deletion_reaches_a_resolved_website_request(
    created: Created, visitor_phone: str
) -> None:
    async def scenario(sessions: Sessions) -> None:
        admin = await dispatch_tests.add_user(sessions, created, UserRole.ADMIN)  # type: ignore[arg-type]
        due = await send(sessions, visitor_phone)
        open_one = await send(sessions, visitor_phone, message="Another question")
        async with sessions() as session:
            await requests.resolve_support_request(
                session, reference=due.reference, admin=admin, note="Called the visitor."
            )
        async with sessions() as session:
            await session.execute(
                update(SupportRequest)
                .where(SupportRequest.id == due.id)
                .values(resolved_at=LONG_AGO)
            )
            await session.commit()
        async with sessions() as session:
            deleted = await retention.delete_resolved_support_requests(
                session, resolved_before=datetime(1990, 1, 2, tzinfo=UTC)
            )
            await session.commit()
        assert deleted >= 1
        async with sessions() as session:
            assert await session.get(SupportRequest, due.id) is None
            # An unresolved request is kept, whatever its age.
            assert await session.get(SupportRequest, open_one.id) is not None

    run(scenario)


def test_the_endpoint_stores_the_message_over_http(
    created: Created, visitor_phone: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    get_contact_form_limits().clear()
    local = "0" + visitor_phone[4:]
    with TestClient(create_app()) as client:
        response = client.post(
            "/api/v1/public/contact",
            json={
                "name": VISITOR_NAME,
                "phone": local,
                "message": VISITOR_MESSAGE,
                "topic": "payment",
                "website": "",
            },
        )
    get_contact_form_limits().clear()
    assert response.status_code == 201
    reference = response.json()["reference"]

    async def scenario(sessions: Sessions) -> None:
        async with sessions() as session:
            row = await session.scalar(
                select(SupportRequest).where(SupportRequest.reference == reference)
            )
        assert row is not None
        assert (row.source, row.user_id, row.contact_phone, row.type) == (
            SupportRequestSource.WEBSITE,
            None,
            visitor_phone,
            SupportRequestType.PAYMENT,
        )

    run(scenario)
