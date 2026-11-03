"""The new-password rule and recorded acceptance (docs/api/auth.md, #332). No database.

Database behaviour (the stored time and version, null for other accounts) is in
test_password_rule_integration.py.
"""

import re
from collections.abc import Iterator
from datetime import date, datetime
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.core.errors import APIError
from app.modules.auth import cli, service
from app.modules.auth.dependencies import CSRF_HEADER_NAME, SESSION_COOKIE_NAME
from app.modules.auth.models import User, UserRole
from app.modules.auth.schemas import LoginRequest, password_problem
from tests.test_auth_api import csrf_for, error_code, fake_session

STRONG = "Sample-Passw0rd"
REGISTER = "/api/v1/auth/register"
TERMS_MESSAGE = "Confirm you are 18 or older and accept the Terms of Service and Privacy Notice."
ROOT = Path(__file__).resolve().parents[2]


def register_body(**changes: Any) -> dict[str, Any]:
    body = {"name": "Sample", "phone": "08000000001", "password": STRONG, "accepted_terms": True}
    return {key: value for key, value in {**body, **changes}.items() if value is not ...}


def details(response: Any) -> list[dict[str, Any]]:
    return response.json()["error"]["details"]


# --- The rule -----------------------------------------------------------------------


@pytest.mark.parametrize(
    "password",
    [
        pytest.param("Aa1!aaaa", id="exactly 8 characters"),
        pytest.param("A1!" + "a" * 125, id="exactly 128 characters"),
        pytest.param("ALLCAPS1!", id="no lowercase needed"),
        pytest.param("Password1₦", id="naira sign is a symbol"),
        pytest.param("Pass word 1_", id="spaces allowed, underscore is a symbol"),
    ],
)
def test_strong_passwords_pass(password: str) -> None:
    assert password_problem(password) is None


@pytest.mark.parametrize(
    ("password", "message"),
    [
        pytest.param("Aa1!aaa", "Your password needs at least 8 characters.", id="7 characters"),
        pytest.param("password1!", "Your password needs an uppercase letter.", id="no uppercase"),
        pytest.param("Password!!", "Your password needs a number.", id="no number"),
        pytest.param("Password11", "Your password needs a symbol.", id="no symbol"),
        pytest.param(
            "password",
            "Your password needs an uppercase letter, a number and a symbol.",
            id="three missing",
        ),
        pytest.param(
            "abc",
            "Your password needs at least 8 characters, an uppercase letter, a number "
            "and a symbol.",
            id="everything missing",
        ),
        pytest.param(
            "password1",
            "Your password needs an uppercase letter and a symbol.",
            id="two missing",
        ),
        pytest.param("A1!" + "a" * 126, "Use 128 characters or fewer.", id="129 characters"),
        pytest.param(
            "Password1 ", "Your password needs a symbol.", id="a space does not count as a symbol"
        ),
        pytest.param(
            "Éclair1!", "Your password needs an uppercase letter.", id="accented is not uppercase"
        ),
        pytest.param("Pass١word!", "Your password needs a number.", id="only 0-9 count as numbers"),
        pytest.param("Passw0rdé", "Your password needs a symbol.", id="a letter is not a symbol"),
    ],
)
def test_weak_passwords_name_everything_missing(password: str, message: str) -> None:
    assert password_problem(password) == message


# --- POST /auth/register ------------------------------------------------------------


@pytest.fixture
def created(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> Iterator[list[dict[str, Any]]]:
    """Replace the database calls of ``/auth/register`` and record ``create_user``."""
    calls: list[dict[str, Any]] = []
    session = fake_session(UserRole.CUSTOMER, "new")

    async def create_user(_: object, **kwargs: Any) -> User:
        calls.append(kwargs)
        return session.user

    async def start_session(_: object, __: object) -> service.AuthenticatedSession:
        return session

    monkeypatch.setattr(service, "create_user", create_user)
    monkeypatch.setattr(service, "start_session", start_session)
    yield calls


def test_register_accepts_a_strong_password_and_records_the_acceptance(
    client: TestClient, created: list[dict[str, Any]]
) -> None:
    response = client.post(REGISTER, json=register_body())

    assert response.status_code == 201
    assert created[0]["password"] == STRONG
    assert created[0]["terms_accepted"] is True


def test_register_does_not_return_the_acceptance(
    client: TestClient, created: list[dict[str, Any]]
) -> None:
    user = client.post(REGISTER, json=register_body()).json()["user"]

    assert not {"accepted_terms", "terms_accepted_at", "terms_version"} & set(user)


@pytest.mark.parametrize(
    ("password", "message"),
    [
        ("Aa1!aaa", "Your password needs at least 8 characters."),
        ("A1!" + "a" * 126, "Use 128 characters or fewer."),
        ("password1!", "Your password needs an uppercase letter."),
        ("Password!!", "Your password needs a number."),
        ("Password11", "Your password needs a symbol."),
    ],
)
def test_register_refuses_a_weak_password(
    client: TestClient, created: list[dict[str, Any]], password: str, message: str
) -> None:
    response = client.post(REGISTER, json=register_body(password=password))

    assert (response.status_code, error_code(response)) == (422, "validation_error")
    assert details(response) == [
        {"loc": ["body", "password"], "msg": message, "type": "value_error"}
    ]
    assert password not in response.text
    assert created == []


@pytest.mark.parametrize("value", [False, "true", 1, None, "yes"])
def test_register_refuses_anything_but_true(
    client: TestClient, created: list[dict[str, Any]], value: Any
) -> None:
    response = client.post(REGISTER, json=register_body(accepted_terms=value))

    assert (response.status_code, error_code(response)) == (422, "validation_error")
    assert details(response) == [
        {"loc": ["body", "accepted_terms"], "msg": TERMS_MESSAGE, "type": "value_error"}
    ]
    assert created == []


def test_register_refuses_a_missing_acceptance(
    client: TestClient, created: list[dict[str, Any]]
) -> None:
    response = client.post(REGISTER, json=register_body(accepted_terms=...))

    assert (response.status_code, error_code(response)) == (422, "validation_error")
    assert [(d["loc"], d["type"]) for d in details(response)] == [
        (["body", "accepted_terms"], "missing")
    ]
    assert created == []


@pytest.mark.parametrize("field", ["terms_accepted_at", "terms_version"])
def test_the_client_cannot_send_the_time_or_version(
    client: TestClient, created: list[dict[str, Any]], field: str
) -> None:
    response = client.post(REGISTER, json=register_body(**{field: "2020-01-01"}))

    assert (response.status_code, error_code(response)) == (422, "validation_error")
    assert [d["loc"] for d in details(response)] == [["body", field]]
    assert created == []


# --- Endpoints that check a password keep checking only the maximum -----------------


@pytest.mark.parametrize("password", ["x", "short", "alllowercase", "x" * 128])
def test_sign_in_still_takes_any_existing_password(password: str) -> None:
    request = LoginRequest.model_validate({"phone": "08000000001", "password": password})
    assert request.password == password


def test_sign_in_with_an_old_style_password_reaches_the_password_check(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    session = fake_session(UserRole.CUSTOMER, "new")
    seen: list[str] = []

    async def authenticate(_: object, *, phone: str, password: str) -> User:
        seen.append(password)
        return session.user

    async def start_session(_: object, __: object) -> service.AuthenticatedSession:
        return session

    monkeypatch.setattr(service, "authenticate", authenticate)
    monkeypatch.setattr(service, "start_session", start_session)

    response = client.post(
        "/api/v1/auth/login", json={"phone": "08000000001", "password": "alllowercase"}
    )

    assert response.status_code == 200
    assert seen == ["alllowercase"]


@pytest.fixture
def signed_in_client(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    async def lookup(_: object, token: str) -> service.AuthenticatedSession:
        return fake_session(UserRole.CUSTOMER, token)

    monkeypatch.setattr(service, "get_authenticated_session", lookup)
    client.cookies.set(SESSION_COOKIE_NAME, UserRole.CUSTOMER.value)
    client.headers[CSRF_HEADER_NAME] = csrf_for(UserRole.CUSTOMER.value)
    return client


def test_phone_change_takes_an_old_style_current_password(
    signed_in_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    seen: list[str] = []

    async def check_password(_: object, password: str) -> None:
        seen.append(password)
        raise APIError(403, "password_incorrect", "Your password is incorrect")

    monkeypatch.setattr(service, "check_password", check_password)

    response = signed_in_client.post(
        "/api/v1/auth/phone-change", json={"phone": "08000000002", "password": "alllowercase"}
    )

    assert error_code(response) == "password_incorrect"
    assert seen == ["alllowercase"]


# --- The command-line tool ----------------------------------------------------------


def test_the_command_line_tool_refuses_a_weak_password(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(cli.getpass, "getpass", lambda _: "password")

    with pytest.raises(SystemExit, match="an uppercase letter, a number and a symbol"):
        cli._read_password()


def test_the_command_line_tool_takes_a_strong_password(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(cli.getpass, "getpass", lambda _: STRONG)

    assert cli._read_password() == STRONG


# --- The terms version --------------------------------------------------------------


def test_terms_version_is_the_latest_change_to_either_page() -> None:
    """Fails when a change edits ``/terms`` or the notice but forgets the constant."""
    notice = (ROOT / "PRIVACY_NOTICE.md").read_text(encoding="utf-8")
    pages = (ROOT / "frontend/src/features/marketing/LegalPages.tsx").read_text(encoding="utf-8")
    notice_date = re.search(r"\*\*Last updated:\*\* (\d+ \w+ \d{4})", notice)
    terms_date = re.search(r"TERMS_VERSION = 'Last updated (\d+ \w+ \d{4})\.'", pages)
    assert notice_date and terms_date

    dates = [datetime.strptime(m.group(1), "%d %B %Y").date() for m in (notice_date, terms_date)]

    assert date.fromisoformat(service.TERMS_VERSION) == max(dates)
