"""Public website endpoints (docs/api/public-site.md): ``GET`` and ``POST /public/contact``.

``GET`` agreed 2026-10-26 in #8, built in #56; ``POST`` agreed 2026-11-02,
built in #339. No session cookie and no CSRF token: the website uses them
before anyone signs in.

``POST /public/contact`` is the website contact form. The message is stored as
a support request (``source`` ``website``, no user) and shows in the admin
queue; nothing is sent by email. Rules, all from the contract:

- **Honeypot:** text in ``website`` gets the same 201 as a real message, with a
  made-up reference, and nothing is stored or notified. The request still
  counts against the per-IP limit.
- **Rate limits** (NFR-002): per IP for every well-formed request, per phone
  for stored messages; see :mod:`app.modules.public.contact_form`.
- **Never linked to an account:** the phone is not looked up, and the answer
  never says whether it belongs to a customer.
- **No personal data in logs (NFR-003):** only the outcome is logged.

- **One central value (FR-055):** ``phone`` is the ``SUPPORT_PHONE`` setting,
  the same value the SMS templates use, and ``whatsapp`` is that number when
  ``SUPPORT_WHATSAPP_ENABLED`` is true, else ``null``. Never from the database
  or an admin screen.
- **Rate limit (NFR-002):** 120 requests per client IP per 10 minutes,
  decided by the technical lead in #56. Generous because many Nigerian mobile
  users share one public IP through carrier NAT, and browsers cache the
  answer for 5 minutes anyway (``Cache-Control: public, max-age=300``). The
  limiter is the auth module's in-memory
  :class:`~app.modules.auth.rate_limit.SlidingWindowLimiter`, with the same
  limitations (per process; the IP is the direct peer).
"""

import logging
from datetime import UTC, datetime
from http import HTTPStatus
from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db_session
from app.core.errors import APIError, ErrorResponse
from app.modules.auth.rate_limit import SlidingWindowLimiter
from app.modules.customers import requests as support_requests
from app.modules.public.contact_form import (
    ContactFormLimits,
    ContactFormReceipt,
    ContactFormRequest,
    get_contact_form_limits,
)

logger = logging.getLogger(__name__)

CONTACT_REQUESTS_PER_IP = 120
CONTACT_WINDOW_SECONDS = 10 * 60
CONTACT_CACHE_CONTROL = "public, max-age=300"

router = APIRouter(prefix="/public", tags=["public"])

_contact_limiter = SlidingWindowLimiter(
    limit=CONTACT_REQUESTS_PER_IP, window_seconds=CONTACT_WINDOW_SECONDS
)


def get_contact_limiter() -> SlidingWindowLimiter:
    """FastAPI dependency returning the process-wide contact limiter."""
    return _contact_limiter


ContactLimiter = Annotated[SlidingWindowLimiter, Depends(get_contact_limiter)]
FormLimits = Annotated[ContactFormLimits, Depends(get_contact_form_limits)]
DbSession = Annotated[AsyncSession, Depends(get_db_session)]


class PublicContact(BaseModel):
    """The support contact (``public-contact.json``).

    Attributes:
        phone: The support number in E.164 form; always present.
        whatsapp: The number for ``https://wa.me/`` links, or ``null`` while
            WhatsApp support is switched off.
    """

    phone: str
    whatsapp: str | None


@router.get(
    "/contact",
    responses={HTTPStatus.TOO_MANY_REQUESTS: {"model": ErrorResponse}},
)
async def get_contact(
    request: Request, response: Response, limiter: ContactLimiter
) -> PublicContact:
    """The support phone and WhatsApp number from backend settings (FR-055).

    Raises:
        APIError: 429 ``too_many_attempts`` with ``Retry-After``.
    """
    # The direct peer; see auth/rate_limit.py for running behind a reverse proxy.
    ip = request.client.host if request.client else "unknown"
    wait = limiter.retry_after(ip)
    if wait is not None:
        raise APIError(
            HTTPStatus.TOO_MANY_REQUESTS,
            "too_many_attempts",
            "Too many attempts. Please wait and try again.",
            details={"retry_after_seconds": wait},
            headers={"Retry-After": str(wait)},
        )
    limiter.hit(ip)
    settings = get_settings()
    response.headers["Cache-Control"] = CONTACT_CACHE_CONTROL
    return PublicContact(
        phone=settings.support_phone,
        whatsapp=settings.support_phone if settings.support_whatsapp_enabled else None,
    )


@router.post(
    "/contact",
    status_code=HTTPStatus.CREATED,
    responses={HTTPStatus.TOO_MANY_REQUESTS: {"model": ErrorResponse}},
)
async def send_contact_message(
    body: ContactFormRequest, request: Request, limits: FormLimits, db: DbSession
) -> ContactFormReceipt:
    """Store a visitor's message as a support request for the team (#339).

    Args:
        body: The form. Validated before this runs: a bad field is 422.
        request: The request, for the client IP.
        limits: The per-IP and per-phone limiters.
        db: Database session.

    Returns:
        The reference to quote when phoning, and the time received.

    Raises:
        APIError: 429 ``too_many_attempts`` with ``Retry-After``.
    """
    # The direct peer; see auth/rate_limit.py for running behind a reverse proxy.
    ip = request.client.host if request.client else "unknown"
    limits.record_ip(ip)
    if body.website:
        # A bot: answer exactly as for a real message, and keep nothing.
        logger.info("public contact outcome=honeypot")
        return ContactFormReceipt(
            reference=support_requests.new_reference(support_requests.SUPPORT_PREFIX),
            created_at=datetime.now(UTC),
        )
    limits.record_phone(body.phone)
    try:
        stored = await support_requests.create_website_support_request(
            db, name=body.name, phone=body.phone, message=body.message, type=body.topic
        )
    except Exception:
        # A failed write must not use up the visitor's allowance.
        limits.by_phone.undo(body.phone)
        raise
    logger.info("public contact outcome=stored")
    return ContactFormReceipt(reference=stored.reference, created_at=stored.created_at)
