"""Request and response bodies for the auth endpoints (docs/api/auth.md)."""

import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import (
    AfterValidator,
    BaseModel,
    BeforeValidator,
    ConfigDict,
    Field,
    StringConstraints,
)
from pydantic_core import PydanticCustomError

from app.modules.auth.models import User, UserRole
from app.shared.phone import normalize_nigerian_phone

PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 128

PhoneNumber = Annotated[str, Field(max_length=32), AfterValidator(normalize_nigerian_phone)]
PersonName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
TERMS_NOT_ACCEPTED_MESSAGE = (
    "Confirm you are 18 or older and accept the Terms of Service and Privacy Notice."
)


def password_problem(password: str) -> str | None:
    """Say what a new password still needs (docs/api/auth.md, #332).

    The one place the rule lives: the schemas below and the command-line tool
    both use it. The team asked for the composition rules; the length is what
    matters most for security, and the maximum also bounds hashing cost.

    Uppercase and number mean plain ``A-Z`` and ``0-9``, so the form's check
    gives the same answer. A symbol is anything that is not a letter, a number
    or whitespace, so a Nigerian keyboard's ``₦`` counts. Lowercase is not
    required.

    Args:
        password: The password as typed.

    Returns:
        A message for the person naming everything missing at once, or None
        when the password is acceptable. It never repeats the password.
    """
    if len(password) > PASSWORD_MAX_LENGTH:
        return f"Use {PASSWORD_MAX_LENGTH} characters or fewer."
    missing = []
    if len(password) < PASSWORD_MIN_LENGTH:
        missing.append(f"at least {PASSWORD_MIN_LENGTH} characters")
    if not any("A" <= c <= "Z" for c in password):
        missing.append("an uppercase letter")
    if not any("0" <= c <= "9" for c in password):
        missing.append("a number")
    if all(c.isalnum() or c.isspace() for c in password):
        missing.append("a symbol")
    if not missing:
        return None
    needed = missing[0] if len(missing) == 1 else f"{', '.join(missing[:-1])} and {missing[-1]}"
    return f"Your password needs {needed}."


def _check_new_password(password: str) -> str:
    problem = password_problem(password)
    if problem:
        # Not ValueError: pydantic would put "Value error, " before the message,
        # and screens show this message as it is.
        raise PydanticCustomError("value_error", problem)
    return password


def _require_true(value: object) -> object:
    # Before the Literal check, so "true", 1 or false all get the one message.
    if value is not True:
        raise PydanticCustomError("value_error", TERMS_NOT_ACCEPTED_MESSAGE)
    return value


# Every field that sets a password. A field that only checks an existing
# password takes the maximum alone, so accounts from before #332 can still sign in.
Password = Annotated[str, AfterValidator(_check_new_password)]
# The person's tick on one box: 18 or older, the Terms of Service and the Privacy
# Notice. The server stores the time and version itself (docs/api/auth.md).
AcceptedTerms = Annotated[Literal[True], BeforeValidator(_require_true)]


class RegisterRequest(BaseModel):
    """Customer self-registration. Unknown fields (such as ``role``) are rejected."""

    model_config = ConfigDict(extra="forbid")

    name: PersonName
    phone: PhoneNumber
    password: Password
    accepted_terms: AcceptedTerms


class LoginRequest(BaseModel):
    """Phone and password sign-in for every role."""

    model_config = ConfigDict(extra="forbid")

    phone: PhoneNumber
    # Only the maximum is enforced here: a password that breaks the new-password
    # rule simply fails to match, and accounts from before the rule must still
    # be able to sign in.
    password: Annotated[str, Field(min_length=1, max_length=PASSWORD_MAX_LENGTH)]


class UserRead(BaseModel):
    """The signed-in user's own account details."""

    id: uuid.UUID
    name: str
    phone: str
    role: UserRole
    phone_verified: bool

    @classmethod
    def from_user(cls, user: User) -> UserRead:
        """Build the response from a model, hiding internal fields.

        Args:
            user: The account to describe.

        Returns:
            The public representation.
        """
        return cls(
            id=user.id,
            name=user.name,
            phone=user.phone,
            role=user.role,
            phone_verified=user.phone_verified_at is not None,
        )


class SessionRead(BaseModel):
    """Returned by register, login and ``/auth/me``.

    Attributes:
        user: The signed-in user.
        csrf_token: Value to send in ``X-CSRF-Token`` on unsafe requests.
        expires_at: When the session ends; the user must sign in again after it.
    """

    user: UserRead
    csrf_token: str
    expires_at: datetime


class PhoneCodeSentRead(BaseModel):
    """Returned when an SMS code was sent (FR-003, FR-004).

    Attributes:
        phone: Number the code went to (E.164).
        expires_at: When the code stops working (5 minutes after sending).
        resend_available_at: Earliest time a new code can be requested.
        delivery_status: Always ``accepted`` here: the SMS provider took the
            message, which is not proof the phone received it. Poll the
            status endpoint for ``delivered`` or ``failed``.
    """

    phone: str
    expires_at: datetime
    resend_available_at: datetime
    delivery_status: Literal["accepted", "delivered", "failed"] = "accepted"


class PhoneCodeStatusRead(BaseModel):
    """Where the newest code stands (``GET .../status``).

    Attributes:
        delivery_status: ``accepted`` (handed to the carrier, no report yet),
            ``delivered`` or ``failed`` (the code did not arrive: offer a
            resend once ``resend_available_at`` has passed).
        expires_at: When the code stops working.
        resend_available_at: Earliest time a new code can be requested.
    """

    delivery_status: Literal["accepted", "delivered", "failed"]
    expires_at: datetime
    resend_available_at: datetime


class VerifyCodeRequest(BaseModel):
    """A 6-digit SMS code as entered by the customer."""

    model_config = ConfigDict(extra="forbid")

    code: Annotated[str, StringConstraints(strip_whitespace=True, pattern=r"^\d{6}$")]


class ChangePasswordRequest(BaseModel):
    """Change the signed-in account's password (docs/api/auth.md, "Change password").

    ``current_password`` checks only the maximum, as at sign-in: a too-short
    value simply does not match. ``new_password`` follows the password rules.
    The screen's "New password again" field is checked on the screen only.
    """

    model_config = ConfigDict(extra="forbid")

    current_password: Annotated[str, Field(min_length=1, max_length=PASSWORD_MAX_LENGTH)]
    new_password: Password


class PhoneChangeRequest(BaseModel):
    """Start a phone number change (FR-004).

    The current password is required because the phone is the sign-in
    identifier: a stolen session alone must not be able to move the account to
    another number.
    """

    model_config = ConfigDict(extra="forbid")

    phone: PhoneNumber
    password: Annotated[str, Field(min_length=1, max_length=PASSWORD_MAX_LENGTH)]
