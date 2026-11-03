"""Recorded acceptance against a real, migrated database (docs/api/auth.md, #332).

Runs only when TEST_DATABASE_URL is set (``alembic upgrade head`` first). Every
account uses a random phone number and is deleted afterwards.
"""

from datetime import UTC, datetime
from typing import Any

import psycopg
import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.modules.auth import service
from app.modules.auth.models import UserRole
from tests.test_auth_integration import (
    PASSWORD,
    TEST_DATABASE_URL,
    created_phones,  # noqa: F401  (fixture)
    db_client,  # noqa: F401  (fixture)
    e164,
    random_phone,
    register,
    run_service,
)

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(not TEST_DATABASE_URL, reason="TEST_DATABASE_URL is not set"),
]


def acceptance(phone: str) -> tuple[Any, Any]:
    url = get_settings().sync_database_url.set(drivername="postgresql")
    with psycopg.connect(url.render_as_string(hide_password=False)) as connection:
        row = connection.execute(
            "SELECT terms_accepted_at, terms_version FROM users WHERE phone = %s", (phone,)
        ).fetchone()
    assert row is not None
    return row[0], row[1]


def test_customer_sign_up_stores_the_time_and_version(
    db_client: TestClient,  # noqa: F811
    created_phones: list[str],  # noqa: F811
) -> None:
    before = datetime.now(UTC)

    session = register(db_client, created_phones)

    accepted_at, version = acceptance(session["user"]["phone"])
    assert version == service.TERMS_VERSION
    assert before <= accepted_at <= datetime.now(UTC)


def test_refused_sign_up_stores_nothing(
    db_client: TestClient,  # noqa: F811
) -> None:
    phone = random_phone()

    response = db_client.post(
        "/api/v1/auth/register",
        json={"name": "Sample", "phone": phone, "password": PASSWORD, "accepted_terms": False},
    )

    assert response.status_code == 422
    url = get_settings().sync_database_url.set(drivername="postgresql")
    with psycopg.connect(url.render_as_string(hide_password=False)) as connection:
        row = connection.execute("SELECT 1 FROM users WHERE phone = %s", (e164(phone),)).fetchone()
    assert row is None


def test_accounts_created_outside_sign_up_have_no_recorded_acceptance(
    db_client: TestClient,  # noqa: F811
    created_phones: list[str],  # noqa: F811
) -> None:
    # The command-line tool and the demo seed call create_user without an acceptance.
    phone = random_phone()
    created_phones.append(phone)

    run_service(
        lambda session: service.create_user(
            session, name="Sample", phone=e164(phone), password=PASSWORD, role=UserRole.ADMIN
        )
    )

    assert acceptance(e164(phone)) == (None, None)


def test_the_two_columns_can_only_be_set_together(
    db_client: TestClient,  # noqa: F811
    created_phones: list[str],  # noqa: F811
) -> None:
    session = register(db_client, created_phones)
    url = get_settings().sync_database_url.set(drivername="postgresql")

    with (
        psycopg.connect(url.render_as_string(hide_password=False)) as connection,
        pytest.raises(psycopg.errors.CheckViolation),
    ):
        connection.execute(
            "UPDATE users SET terms_version = NULL WHERE phone = %s",
            (session["user"]["phone"],),
        )
