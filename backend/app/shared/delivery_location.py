"""The delivery location object and its bounds (docs/api/delivery-location.md, #340 and #385).

A delivery address may carry a map point (FR-020: "map pin MAY be provided but
is not mandatory"). The point is sent with how it was set, and refused outside
the area MmiriOma delivers in. The bounds are a sanity check, not the service
area: whether MmiriOma delivers somewhere is the zone the customer picked
(FR-010), and the server never works out a zone from a point.

Road-distance pricing (``POST /quotes``, #385) is the first user of this
module; the saved-address and order columns of #340 reuse it.
"""

from enum import StrEnum
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, field_validator
from pydantic_core import PydanticCustomError

from app.core.config import get_settings

#: Decimal places kept: 6 is about 0.1 m (contract, "Location object").
COORDINATE_PLACES = 6

OUTSIDE_AREA_MESSAGE = "This location is outside the area we deliver in."


class LocationSource(StrEnum):
    """How a point was set. A typed address has no point, so it needs no third value."""

    DEVICE_LOCATION = "device_location"
    MAP_PIN = "map_pin"


class DeliveryLocation(BaseModel):
    """A delivery point as a client sends it.

    Attributes:
        latitude: WGS 84 decimal degrees, -90 to 90, kept to 6 places.
        longitude: WGS 84 decimal degrees, -180 to 180, kept to 6 places.
        source: Required with a point: ``device_location`` (the phone's
            position, not moved) or ``map_pin`` (placed or moved by hand).
    """

    model_config = ConfigDict(extra="forbid")

    latitude: float = Field(ge=-90, le=90, allow_inf_nan=False)
    longitude: float = Field(ge=-180, le=180, allow_inf_nan=False)
    source: LocationSource

    @field_validator("latitude", "longitude")
    @classmethod
    def _round(cls, value: float) -> float:
        return round(value, COORDINATE_PLACES)


def _inside_bounds(location: DeliveryLocation | None) -> DeliveryLocation | None:
    """Refuse a point outside ``DELIVERY_LOCATION_BOUNDS``.

    The error belongs to the whole location field, never to the inner
    ``latitude`` or ``longitude``, so a screen has one place to show it.
    """
    if location is None:
        return None
    south, west, north, east = get_settings().delivery_bounds
    if not (south <= location.latitude <= north and west <= location.longitude <= east):
        raise PydanticCustomError("value_error", OUTSIDE_AREA_MESSAGE)
    return location


#: A location field of a request body: optional, and inside the bounds when sent.
DeliveryLocationField = Annotated[DeliveryLocation | None, AfterValidator(_inside_bounds)]
