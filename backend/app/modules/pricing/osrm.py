"""OSRM adapter: the road distance from water sources to a delivery point (FR-022, #385).

Contract: docs/api/order-details-and-price.md, "Amendment #385: road-distance
pricing". FR-022 prices the distance charge on the **actual road distance**
between the source and the delivery location, from OSRM, and says
**straight-line distance shall not be used**. This module is the only place a
distance is obtained, and it never computes one from coordinates itself: when
OSRM cannot answer it raises :class:`RoadDistanceUnavailable` and the caller
falls back to the zone's fee ("No fabricated route estimates").

One request per quote: OSRM's ``table`` service answers every source to the
one delivery point at once. A slow server counts as down (``OSRM_TIMEOUT_SECONDS``).
Only coordinates are sent: no name, phone, address or order data. Nothing is
cached.
"""

from collections.abc import Sequence
from dataclasses import dataclass
from enum import StrEnum
from typing import Any

import httpx2

from app.core.config import get_settings


class FallbackReason(StrEnum):
    """Why a quote did not use road distance although a location was sent (FR-024)."""

    NO_SOURCE_LOCATION = "no_source_location"
    OSRM_UNAVAILABLE = "osrm_unavailable"
    NO_ROUTE = "no_route"
    TIMEOUT = "timeout"


class RoadDistanceUnavailable(Exception):
    """OSRM gave no usable road distance; the quote uses the zone fee instead.

    Attributes:
        reason: Which case, recorded on the quote.
    """

    def __init__(self, reason: FallbackReason) -> None:
        super().__init__(reason.value)
        self.reason = reason


@dataclass(frozen=True)
class Point:
    """A WGS 84 point."""

    latitude: float
    longitude: float

    def lonlat(self) -> str:
        """The point as OSRM writes it: longitude first, 6 decimals."""
        return f"{self.longitude:.6f},{self.latitude:.6f}"


@dataclass(frozen=True)
class LongestRoad:
    """The longest road distance among the sources.

    Attributes:
        metres: Whole metres (OSRM's figure, rounded to the nearest metre).
        source_index: Index, in the list given, of the source it belongs to.
        max_snap_metres: The largest snap distance OSRM reported over the sources
            and the delivery point, or None when it reported none. OSRM answers
            "Ok" for any point on Earth, moving it to the nearest road in whatever
            data it holds (an Enugu point against another country's data came back
            Ok, 4,128 km away; docs/deployment/hostinger.md section 16), so a large
            value means the figure is not a road distance for the place that was
            asked about. **Carried to the caller and not acted on yet**: the contract
            has no threshold (its version 1 left it out), and road-distance pricing
            must not be switched on before one is agreed (technical lead, #398).
    """

    metres: int
    source_index: int
    max_snap_metres: float | None = None


async def longest_road_distance(
    sources: Sequence[Point],
    destination: Point,
    *,
    transport: httpx2.AsyncBaseTransport | None = None,
) -> LongestRoad:
    """Ask OSRM for the road distance from each source to the destination; return the longest.

    The longest, because the quote does not know which eligible source staff
    will pick, and the price must cover whichever it is (the water price takes
    the dearest source the same way).

    Args:
        sources: One or more source points.
        destination: The delivery point.
        transport: Optional httpx2 transport, for tests.

    Returns:
        The longest distance and the index of its source.

    Raises:
        RoadDistanceUnavailable: OSRM is off, did not answer in time, answered
            with an error or something unreadable, or had no route to a source.
    """
    settings = get_settings()
    base = settings.osrm_base_url
    if not base or not sources:
        raise RoadDistanceUnavailable(FallbackReason.OSRM_UNAVAILABLE)
    coordinates = ";".join([*(point.lonlat() for point in sources), destination.lonlat()])
    last = len(sources)
    url = f"{base}/table/v1/driving/{coordinates}"
    params = {
        "sources": ";".join(str(i) for i in range(last)),
        "destinations": str(last),
        "annotations": "distance",
    }
    try:
        async with httpx2.AsyncClient(
            timeout=settings.osrm_timeout_seconds, transport=transport
        ) as client:
            response = await client.get(url, params=params)
    except httpx2.TimeoutException as exc:
        raise RoadDistanceUnavailable(FallbackReason.TIMEOUT) from exc
    except httpx2.HTTPError as exc:
        raise RoadDistanceUnavailable(FallbackReason.OSRM_UNAVAILABLE) from exc
    if response.status_code != 200:
        raise RoadDistanceUnavailable(FallbackReason.OSRM_UNAVAILABLE)
    try:
        body = response.json()
        if body["code"] != "Ok":
            raise RoadDistanceUnavailable(FallbackReason.NO_ROUTE)
        rows = body["distances"]
        distances = [row[0] for row in rows]
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        raise RoadDistanceUnavailable(FallbackReason.OSRM_UNAVAILABLE) from exc
    if len(distances) != last:
        raise RoadDistanceUnavailable(FallbackReason.OSRM_UNAVAILABLE)
    # A null distance is OSRM saying there is no route to that source.
    if any(not isinstance(d, int | float) or isinstance(d, bool) or d < 0 for d in distances):
        raise RoadDistanceUnavailable(FallbackReason.NO_ROUTE)
    index = max(range(last), key=lambda i: distances[i])
    return LongestRoad(
        metres=round(distances[index]),
        source_index=index,
        max_snap_metres=_largest_snap(body),
    )


def _largest_snap(body: dict[str, Any]) -> float | None:
    """The largest ``distance`` OSRM reports on the snapped sources and destinations.

    ``None`` when the answer carries none or something unreadable: a missing figure
    is not a reason to refuse a quote (the caller decides what a threshold means).
    """
    snaps: list[float] = []
    for key in ("sources", "destinations"):
        waypoints = body.get(key)
        if not isinstance(waypoints, list):
            continue
        for waypoint in waypoints:
            distance = waypoint.get("distance") if isinstance(waypoint, dict) else None
            if (
                isinstance(distance, int | float)
                and not isinstance(distance, bool)
                and distance >= 0
            ):
                snaps.append(float(distance))
    return max(snaps) if snaps else None
