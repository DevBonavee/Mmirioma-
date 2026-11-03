"""Privacy steps on quotes (NFR-003, NFR-005, #385).

Called by ``app.modules.privacy`` for ``docs/process/privacy-retention.md``.
Functions add to the caller's transaction and never commit.

A quote priced with road distance keeps the customer's map pin
(``quotes.delivery_location``), which is personal data: it says where a person
lives. Only the pin and its source are removed; the price, the distance and the
rates stay, because they are accounting and FR-024 records and identify no one
without the pin. Rules (technical lead, 2026-11-03, #385):

- **Anonymizing a customer** clears the pin on all of their quotes.
- **An order's quote** keeps its pin as long as the order keeps its own copy of
  the location, and loses it when the order is anonymized (3 years after it is
  finished, or when its customer is).
- **A quote that never became an order** keeps its pin for 90 days after its
  price expired, then loses it.
"""

import uuid
from collections.abc import Collection
from datetime import datetime
from typing import Any, cast

from sqlalchemy import CursorResult, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.orders.models import Order
from app.modules.pricing.models import Quote


def _rowcount(result: Any) -> int:
    return cast(CursorResult[Any], result).rowcount


async def clear_customer_quote_locations(
    session: AsyncSession, *, customer_ids: Collection[uuid.UUID]
) -> int:
    """Clear the pin on every quote these customers asked for. Does not commit.

    Args:
        session: Database session (the caller's transaction).
        customer_ids: The customers being anonymized.

    Returns:
        How many quotes had a pin.
    """
    if not customer_ids:
        return 0
    return _rowcount(
        await session.execute(
            update(Quote)
            .where(Quote.customer_id.in_(customer_ids), Quote.delivery_location.is_not(None))
            .values(delivery_location=None, delivery_location_source=None)
        )
    )


async def clear_order_quote_locations(
    session: AsyncSession, *, order_ids: Collection[uuid.UUID]
) -> int:
    """Clear the pin on the quotes these orders were placed with. Does not commit.

    Called when the orders are anonymized, so the quote does not keep a pin the
    order has given up.

    Args:
        session: Database session (the caller's transaction).
        order_ids: The orders being anonymized.

    Returns:
        How many quotes had a pin.
    """
    if not order_ids:
        return 0
    placed = select(Order.quote_id).where(Order.id.in_(order_ids), Order.quote_id.is_not(None))
    return _rowcount(
        await session.execute(
            update(Quote)
            .where(Quote.id.in_(placed), Quote.delivery_location.is_not(None))
            .values(delivery_location=None, delivery_location_source=None)
        )
    )


async def clear_expired_unplaced_quote_locations(
    session: AsyncSession, *, expired_before: datetime
) -> int:
    """Clear the pin on quotes no order was placed with, once their price expired. Does not commit.

    Args:
        session: Database session (the caller's transaction).
        expired_before: Quotes whose price expired before this are due (the
            review passes now minus 90 days).

    Returns:
        How many quotes had a pin.
    """
    placed = select(Order.quote_id).where(Order.quote_id.is_not(None))
    return _rowcount(
        await session.execute(
            update(Quote)
            .where(
                Quote.price_valid_until < expired_before,
                Quote.delivery_location.is_not(None),
                Quote.id.not_in(placed),
            )
            .values(delivery_location=None, delivery_location_source=None)
        )
    )
