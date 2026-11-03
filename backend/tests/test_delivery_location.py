"""The delivery location object and its bounds, without a database (#340).

docs/api/delivery-location.md: the object, its range and bounds checks, the
setting that holds the box, and the driver's reduced view. How the point is
stored and cleared is in ``test_delivery_location_integration.py``.
"""

import math
from typing import Any

import pytest
from pydantic import ValidationError

from app.core.config import DEFAULT_DELIVERY_LOCATION_BOUNDS, Settings, get_settings
from app.shared.location import (
    OUT_OF_BOUNDS_MESSAGE,
    Location,
    LocationSource,
    read_location,
    read_point,
)

ENUGU = {"latitude": 6.452713, "longitude": 7.510348, "source": "map_pin"}


def test_a_point_in_enugu_is_accepted_and_keeps_its_source() -> None:
    location = Location.model_validate(ENUGU)
    assert (location.latitude, location.longitude) == (6.452713, 7.510348)
    assert location.source is LocationSource.MAP_PIN


def test_more_than_six_decimal_places_are_rounded() -> None:
    location = Location.model_validate({**ENUGU, "latitude": 6.4527134999, "longitude": 7.51034851})
    assert (location.latitude, location.longitude) == (6.452713, 7.510349)


@pytest.mark.parametrize("source", ["device_location", "map_pin"])
def test_both_sources_are_accepted(source: str) -> None:
    assert Location.model_validate({**ENUGU, "source": source}).source.value == source


@pytest.mark.parametrize("source", ["typed", "gps", "", None])
def test_any_other_source_is_refused(source: str | None) -> None:
    with pytest.raises(ValidationError) as caught:
        Location.model_validate({**ENUGU, "source": source})
    assert caught.value.errors()[0]["loc"] == ("source",)


def test_source_is_required_whenever_a_location_is_sent() -> None:
    body = {"latitude": 6.45, "longitude": 7.51}
    with pytest.raises(ValidationError) as caught:
        Location.model_validate(body)
    assert caught.value.errors()[0]["loc"] == ("source",)


@pytest.mark.parametrize(
    ("latitude", "longitude"),
    [(91, 7.5), (-91, 7.5), (6.4, 181), (6.4, -181), (math.nan, 7.5), (6.4, math.inf)],
)
def test_degrees_outside_the_earth_are_refused(latitude: float, longitude: float) -> None:
    with pytest.raises(ValidationError):
        Location.model_validate({**ENUGU, "latitude": latitude, "longitude": longitude})


@pytest.mark.parametrize(
    ("latitude", "longitude"),
    [
        (6.4584, 3.3792),  # Lagos
        (9.0765, 7.3986),  # Abuja
        (0.0, 0.0),
        (51.5074, -0.1278),  # London
    ],
)
def test_a_point_outside_the_delivery_bounds_fails_on_the_location_as_a_whole(
    latitude: float, longitude: float
) -> None:
    with pytest.raises(ValidationError) as caught:
        Location.model_validate({**ENUGU, "latitude": latitude, "longitude": longitude})
    (error,) = caught.value.errors()
    # Never the inner field, so a screen has one place to show it (contract).
    assert error["loc"] == ()
    assert error["msg"] == f"Value error, {OUT_OF_BOUNDS_MESSAGE}"


def test_unknown_fields_are_refused() -> None:
    with pytest.raises(ValidationError):
        Location.model_validate({**ENUGU, "accuracy": 12})


def test_the_default_box_holds_the_city_and_the_state_edges_but_not_other_cities() -> None:
    bounds = Settings().delivery_bounds
    assert bounds.contains(6.4584, 7.4951)  # Enugu city
    assert bounds.contains(6.0, 7.0)  # an outlying town is never refused by a tight box
    assert not bounds.contains(6.5244, 3.3792)  # Lagos
    assert DEFAULT_DELIVERY_LOCATION_BOUNDS == "5.9,6.8,7.2,7.9"


def test_the_box_can_be_changed_by_the_setting(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DELIVERY_LOCATION_BOUNDS", "6.3,7.3,6.6,7.7")
    get_settings.cache_clear()
    try:
        Location.model_validate(ENUGU)
        with pytest.raises(ValidationError):
            Location.model_validate({**ENUGU, "latitude": 6.9})
    finally:
        monkeypatch.delenv("DELIVERY_LOCATION_BOUNDS")
        get_settings.cache_clear()


@pytest.mark.parametrize(
    "value",
    [
        "5.9,6.8,7.2",  # three numbers
        "a,b,c,d",
        "7.2,6.8,5.9,7.9",  # south above north
        "5.9,7.9,7.2,6.8",  # west above east
        "-10,6.8,7.2,7.9",  # south of Nigeria
        "5.9,6.8,40,7.9",  # north of Nigeria
        "",
    ],
)
def test_a_bad_bounds_setting_stops_the_app_at_startup(value: str) -> None:
    with pytest.raises(ValidationError, match="DELIVERY_LOCATION_BOUNDS"):
        Settings(delivery_location_bounds=value)


def test_reading_a_stored_location_needs_all_three_columns() -> None:
    assert read_location(None, None, None) is None
    assert read_location(6.45, 7.51, None) is None
    assert read_location(6.45, 7.51, "map_pin") is not None


def test_the_driver_sees_the_point_without_its_source() -> None:
    point: Any = read_point(6.45, 7.51)
    assert point.model_dump() == {"latitude": 6.45, "longitude": 7.51}
    assert read_point(None, None) is None
