"""The public contact form: ``POST /public/contact`` (docs/api/public-site.md, #339).

Request and response bodies and the process-wide rate limits. The endpoint
itself is in :mod:`app.modules.public.router`; the stored row is a support
request (:func:`app.modules.customers.requests.create_website_support_request`).

Rate limits (NFR-002), the auth module's in-memory sliding-window limiter,
so they reset on restart and are per worker, as for the auth limits (accepted
for the pilot's single worker; technical lead, 2026-11-02):

==========================  ===================  ===========
What                        Key                  Limit
==========================  ===================  ===========
Messages (any valid body)   client IP            10 / hour
Stored messages             normalized phone     3 / hour
==========================  ===================  ===========

The numbers are an engineering recommendation (the SRS gives none). The IP
limit is generous because many mobile users share one IP through carrier NAT.
"""

from dataclasses import dataclass, field
from datetime import datetime
from http import HTTPStatus
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.core.errors import APIError
from app.modules.auth.rate_limit import SlidingWindowLimiter
from app.modules.auth.schemas import PersonName, PhoneNumber
from app.modules.customers.models import (
    SUPPORT_MESSAGE_MAX_LENGTH,
    SUPPORT_MESSAGE_MIN_LENGTH,
    SupportRequestType,
)

MESSAGES_PER_IP = 10
MESSAGES_PER_PHONE = 3
WINDOW_SECONDS = 60 * 60

#: Longest honeypot text read. A bot that sends more is still a bot: the field
#: only needs to be non-empty, so the bound just keeps the body small.
HONEYPOT_MAX_LENGTH = 5000

ContactMessage = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=SUPPORT_MESSAGE_MIN_LENGTH,
        max_length=SUPPORT_MESSAGE_MAX_LENGTH,
    ),
]


class ContactFormRequest(BaseModel):
    """``POST /public/contact``. Unknown fields are rejected.

    Attributes:
        name: 1-100 characters after trimming.
        phone: A Nigerian number, normalized to E.164 (as at sign-up).
        message: 3-1000 characters after trimming.
        topic: One of the in-app support types; ``other`` when left out.
        website: The honeypot. Real visitors never see or fill it; any text
            in it marks the request as a bot.
    """

    model_config = ConfigDict(extra="forbid")

    name: PersonName
    phone: PhoneNumber
    message: ContactMessage
    topic: SupportRequestType = SupportRequestType.OTHER
    website: str | None = Field(default=None, max_length=HONEYPOT_MAX_LENGTH)


class ContactFormReceipt(BaseModel):
    """``201``: the reference to quote when the visitor phones, and when it arrived."""

    reference: str
    created_at: datetime


@dataclass
class ContactFormLimits:
    """The limiters guarding ``POST /public/contact`` (limits in the module docstring)."""

    by_ip: SlidingWindowLimiter = field(
        default_factory=lambda: SlidingWindowLimiter(
            limit=MESSAGES_PER_IP, window_seconds=WINDOW_SECONDS
        )
    )
    by_phone: SlidingWindowLimiter = field(
        default_factory=lambda: SlidingWindowLimiter(
            limit=MESSAGES_PER_PHONE, window_seconds=WINDOW_SECONDS
        )
    )

    @staticmethod
    def _too_many(wait: int) -> APIError:
        return APIError(
            HTTPStatus.TOO_MANY_REQUESTS,
            "too_many_attempts",
            "Too many attempts. Please wait and try again.",
            details={"retry_after_seconds": wait},
            headers={"Retry-After": str(wait)},
        )

    def record_ip(self, ip: str) -> None:
        """Count a request against its IP, refusing it once the IP is over its limit.

        Synchronous, so atomic on the event loop.

        Args:
            ip: The client IP.

        Raises:
            APIError: 429 ``too_many_attempts`` with ``Retry-After``.
        """
        wait = self.by_ip.retry_after(ip)
        if wait is not None:
            raise self._too_many(wait)
        self.by_ip.hit(ip)

    def record_phone(self, phone: str) -> None:
        """Count a stored message against its phone, refusing it once over the limit.

        Args:
            phone: The normalized phone number.

        Raises:
            APIError: 429 ``too_many_attempts`` with ``Retry-After``.
        """
        wait = self.by_phone.retry_after(phone)
        if wait is not None:
            raise self._too_many(wait)
        self.by_phone.hit(phone)

    def clear(self) -> None:
        """Reset both limiters (used by tests)."""
        self.by_ip.clear()
        self.by_phone.clear()


_contact_form_limits = ContactFormLimits()


def get_contact_form_limits() -> ContactFormLimits:
    """FastAPI dependency returning the process-wide contact form limiters."""
    return _contact_form_limits
