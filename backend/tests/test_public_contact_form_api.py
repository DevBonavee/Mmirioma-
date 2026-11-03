"""``POST /public/contact``, the website contact form (#339). No database.

Contract: docs/api/public-site.md ("POST /public/contact", agreed 2026-11-02).
The store step is replaced by a fake, so these tests cover validation, the
honeypot, the per-IP and per-phone limits, the response shape against the
example, the 429 envelope, that nothing personal reaches the logs, and that
the form needs no session. The real write, the admin queue and the migration
are in test_public_contact_form_integration.py.
"""

import json
import logging
import uuid
from collections.abc import Iterator
from datetime import datetime
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.modules.customers.models import SupportRequest, SupportRequestSource, SupportRequestType
from app.modules.public import router as public_router
from app.modules.public.contact_form import (
    MESSAGES_PER_IP,
    MESSAGES_PER_PHONE,
    get_contact_form_limits,
)

EXAMPLES = Path(__file__).resolve().parents[2] / "docs/api/examples"
REQUEST = json.loads((EXAMPLES / "public-contact-request.json").read_text())
RECEIPT = json.loads((EXAMPLES / "public-contact-receipt.json").read_text())
PATH = "/api/v1/public/contact"
VISITOR_NAME = "Sample Visitor"
VISITOR_MESSAGE = "Do you deliver to Independence Layout?"


class FakeStore:
    """Replaces ``create_website_support_request``: keeps what it was given."""

    def __init__(self) -> None:
        self.calls: list[dict[str, Any]] = []
        self.fail = False

    async def __call__(self, _: object, **kwargs: Any) -> SupportRequest:
        if self.fail:
            raise RuntimeError("database down")
        self.calls.append(kwargs)
        return SupportRequest(
            id=uuid.uuid4(),
            reference=RECEIPT["reference"],
            source=SupportRequestSource.WEBSITE,
            created_at=datetime.fromisoformat(RECEIPT["created_at"].replace("Z", "+00:00")),
        )


@pytest.fixture
def store(monkeypatch: pytest.MonkeyPatch) -> Iterator[FakeStore]:
    fake = FakeStore()
    monkeypatch.setattr(public_router.support_requests, "create_website_support_request", fake)
    get_contact_form_limits().clear()
    yield fake
    get_contact_form_limits().clear()


def send(client: TestClient, **changes: Any) -> Any:
    body = {**REQUEST, **changes}
    return client.post(PATH, json={key: value for key, value in body.items() if value is not ...})


def test_it_stores_the_message_and_matches_the_example(
    client: TestClient, store: FakeStore
) -> None:
    response = send(client)
    assert response.status_code == 201
    assert response.json() == RECEIPT
    assert store.calls == [
        {
            "name": VISITOR_NAME,
            "phone": "+2348000000001",
            "message": VISITOR_MESSAGE,
            "type": SupportRequestType.OTHER,
        }
    ]


def test_it_needs_no_session_and_no_csrf_token(client: TestClient, store: FakeStore) -> None:
    client.cookies.set("mmirioma_session", "not-a-session")
    assert send(client).status_code == 201


def test_topic_is_optional_and_may_be_any_in_app_type(client: TestClient, store: FakeStore) -> None:
    assert send(client, topic=...).status_code == 201
    assert send(client, topic="payment", phone="08000000002").status_code == 201
    assert [call["type"] for call in store.calls] == [
        SupportRequestType.OTHER,
        SupportRequestType.PAYMENT,
    ]


def test_the_honeypot_may_be_absent_or_empty(client: TestClient, store: FakeStore) -> None:
    assert send(client, website=...).status_code == 201
    assert send(client, website="", phone="08000000002").status_code == 201
    assert len(store.calls) == 2


def test_a_filled_honeypot_gets_a_201_and_stores_nothing(
    client: TestClient, store: FakeStore
) -> None:
    response = send(client, website="http://spam.example")
    assert response.status_code == 201
    body = response.json()
    assert set(body) == {"reference", "created_at"}
    assert body["reference"].startswith("SR-") and len(body["reference"]) == 11
    assert body["reference"] != RECEIPT["reference"]
    assert store.calls == []


def test_the_honeypot_still_counts_against_the_ip(client: TestClient, store: FakeStore) -> None:
    for _ in range(MESSAGES_PER_IP):
        assert send(client, website="spam").status_code == 201
    assert send(client).status_code == 429
    assert store.calls == []


@pytest.mark.parametrize(
    "changes",
    [
        {"name": ...},
        {"name": "   "},
        {"name": "x" * 101},
        {"phone": ...},
        {"phone": "12345"},
        {"phone": "not a number"},
        {"message": ...},
        {"message": "ab"},
        {"message": "   ab   "},
        {"message": "x" * 1001},
        {"topic": "refund"},
        {"website": 5},
        {"email": "a@b.example"},
    ],
)
def test_bad_bodies_are_validation_errors_and_store_nothing(
    client: TestClient, store: FakeStore, changes: dict[str, Any]
) -> None:
    response = send(client, **changes)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
    assert store.calls == []


def test_validation_details_never_repeat_what_was_sent(
    client: TestClient, store: FakeStore
) -> None:
    text = send(client, name=VISITOR_NAME, phone="12345").text
    assert VISITOR_NAME not in text
    assert "12345" not in text


def test_the_boundary_lengths_are_accepted(client: TestClient, store: FakeStore) -> None:
    assert send(client, name="x", message="abc").status_code == 201
    assert send(client, name="y" * 100, message="m" * 1000, phone="08000000002").status_code == 201


def test_the_eleventh_message_from_one_ip_in_an_hour_is_429(
    client: TestClient, store: FakeStore
) -> None:
    for number in range(MESSAGES_PER_IP):
        assert send(client, phone=f"0800000{number:04d}").status_code == 201
    response = send(client, phone="08000009999")
    assert response.status_code == 429
    error = response.json()["error"]
    assert error["code"] == "too_many_attempts"
    assert error["details"]["retry_after_seconds"] == int(response.headers["Retry-After"]) > 0
    assert len(store.calls) == MESSAGES_PER_IP


def test_the_fourth_message_from_one_phone_in_an_hour_is_429(
    client: TestClient, store: FakeStore
) -> None:
    for _ in range(MESSAGES_PER_PHONE):
        assert send(client).status_code == 201
    response = send(client)
    assert response.status_code == 429
    assert response.json()["error"]["code"] == "too_many_attempts"
    assert int(response.headers["Retry-After"]) > 0
    assert len(store.calls) == MESSAGES_PER_PHONE
    # Another number is not affected.
    assert send(client, phone="08000000002").status_code == 201


def test_the_same_phone_in_another_format_is_the_same_phone(
    client: TestClient, store: FakeStore
) -> None:
    for phone in ("08000000001", "+2348000000001", "2348000000001"):
        assert send(client, phone=phone).status_code == 201
    assert send(client, phone="0800 000 0001").status_code == 429


def test_a_failed_write_does_not_use_up_the_phone_allowance(
    store: FakeStore,
) -> None:
    from app.main import create_app

    store.fail = True
    with TestClient(create_app(), raise_server_exceptions=False) as client:
        for _ in range(MESSAGES_PER_PHONE + 1):
            assert send(client).status_code == 500
        store.fail = False
        assert send(client).status_code == 201


def test_logs_name_only_the_outcome_never_what_the_visitor_wrote(
    client: TestClient, store: FakeStore, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level(logging.DEBUG):
        send(client)
        send(client, website="spam", phone="08000000002")
        send(client, phone="not a number")
        for _ in range(MESSAGES_PER_PHONE):
            send(client)
    logged = " ".join(record.getMessage() for record in caplog.records)
    for secret in (VISITOR_NAME, "08000000001", "+2348000000001", VISITOR_MESSAGE, "Independence"):
        assert secret not in logged
    assert "outcome=stored" in logged
    assert "outcome=honeypot" in logged


def test_other_methods_are_not_allowed(client: TestClient) -> None:
    assert client.put(PATH, json=REQUEST).status_code == 405
    assert client.delete(PATH).status_code == 405
