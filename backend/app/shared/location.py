"""A delivery location: the optional map point of an address (docs/api/delivery-location.md, #340).

FR-020 lets a customer add a map pin to a delivery address. The pin is stored
as a PostGIS ``geography(POINT, 4326)`` next to a ``source`` that says how it
was set. This module holds what saved addresses and orders share:

- the request object, :class:`Location`, with its range and bounds checks;
- the response objects, :class:`LocationRead` (customer) and
  :class:`PointRead` (driver, without ``source``);
- helpers that build the stored point and the SQL that reads it back.

A location is personal data and is treated like the address it belongs to
(maps.md section 8). It is never logged.
"""

from enum import StrEnum
from typing import Any, Self

from geoalchemy2 import Geography, Geometry, WKTElement
from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic_core import PydanticCustomError
from sqlalchemy import CheckConstraint, String, cast, func
from sqlalchemy.orm import Mapped, column_property, mapped_column
from sqlalchemy.sql.elements import ColumnElement

from app.core.config import get_settings

#: Stored to 6 decimal places, about 0.1 m (contract, "Location object").
DECIMAL_PLACES = 6
SOURCE_MAX_LENGTH = 20
OUT_OF_BOUNDS_MESSAGE = "This location is outside the area we deliver in."


class LocationSource(StrEnum):
    """How the point was set.

    ``device_location``: the phone's position, not moved. ``map_pin``: placed
    or moved by hand. An address with no point is ``location: null``; there is
    no "typed" value (contract, decision 1).
    """

    DEVICE_LOCATION = "device_location"
    MAP_PIN = "map_pin"


class Location(BaseModel):
    """A location sent with an address or an order.

    ``source`` is required whenever a location is sent. Latitude and longitude
    must be real WGS 84 degrees and inside ``DELIVERY_LOCATION_BOUNDS``; a point
    outside the box fails on the location as a whole, so a screen has one
    place to show the error (contract, "Delivery bounds").
    """

    model_config = ConfigDict(extra="forbid")

    latitude: float = Field(ge=-90, le=90, allow_inf_nan=False)
    longitude: float = Field(ge=-180, le=180, allow_inf_nan=False)
    source: LocationSource

    @model_validator(mode="after")
    def _round_and_check_bounds(self) -> Self:
        if not get_settings().delivery_bounds.contains(self.latitude, self.longitude):
            # Not ValueError: pydantic would put "Value error, " in front, and the contract
            # (and the screens) use the message as it is.
            raise PydanticCustomError("value_error", OUT_OF_BOUNDS_MESSAGE)
        self.latitude = round(self.latitude, DECIMAL_PLACES)
        self.longitude = round(self.longitude, DECIMAL_PLACES)
        return self


class LocationRead(BaseModel):
    """A stored location, as the customer reads it back."""

    latitude: float
    longitude: float
    source: LocationSource


class PointRead(BaseModel):
    """A stored point as the assigned driver sees it, without ``source``."""

    latitude: float
    longitude: float


def to_point(location: Location) -> WKTElement:
    """The PostGIS point for a validated location (longitude first)."""
    return WKTElement(f"POINT({location.longitude!r} {location.latitude!r})", srid=4326)


def read_location(
    latitude: float | None, longitude: float | None, source: str | None
) -> LocationRead | None:
    """Build the response object from the stored columns, or None when there is no point."""
    if latitude is None or longitude is None or source is None:
        return None
    return LocationRead(latitude=latitude, longitude=longitude, source=LocationSource(source))


def read_point(latitude: float | None, longitude: float | None) -> PointRead | None:
    """Build the driver's response object, or None when there is no point."""
    if latitude is None or longitude is None:
        return None
    return PointRead(latitude=latitude, longitude=longitude)


def point_column() -> Mapped[Any]:
    """A nullable ``geography(POINT, 4326)`` column (WGS 84, CLAUDE.md).

    No spatial index: nothing searches by location yet (contract, "Storage").
    """
    return mapped_column(Geography(geometry_type="POINT", srid=4326, spatial_index=False))


def source_column() -> Mapped[str | None]:
    """The nullable ``source`` column that goes with a point."""
    return mapped_column(String(SOURCE_MAX_LENGTH))


def latitude_of(point: Any) -> ColumnElement[float]:
    """SQL that reads a point's latitude. A geography has no ST_Y, so it is cast to geometry."""
    return func.ST_Y(cast(point, Geometry))


def longitude_of(point: Any) -> ColumnElement[float]:
    """SQL that reads a point's longitude."""
    return func.ST_X(cast(point, Geometry))


def stored_properties(point: Any) -> tuple[Any, Any]:
    """Two read-only attributes, latitude and longitude, loaded with the row."""
    return column_property(latitude_of(point)), column_property(longitude_of(point))


def location_constraints(point: str, source: str, prefix: str) -> list[CheckConstraint]:
    """The CHECKs that keep a point and its source together.

    Args:
        point: The point column's name.
        source: The source column's name.
        prefix: Constraint-name prefix, unique in the table.

    Returns:
        The point-and-source pairing and the allowed source values.
    """
    values = ", ".join(f"'{member.value}'" for member in LocationSource)
    return [
        CheckConstraint(
            f"({point} IS NULL) = ({source} IS NULL)",
            name=f"{prefix}_pair",
        ),
        CheckConstraint(f"{source} IN ({values})", name=f"{prefix}_source"),
    ]
