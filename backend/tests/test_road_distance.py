"""Road-distance pricing without a database (#385).

docs/api/order-details-and-price.md, "Amendment #385: road-distance pricing"
(agreed 2026-11-03): the delivery-cost formula and its rounding, the OSRM
adapter against a fake server (the longest road, one request, every way it can
fail), the delivery location a quote takes and its bounds, the settings, and
that no straight-line distance is computed anywhere in pricing (FR-022). The
quote flow against a real database is in test_road_distance_integration.py.
"""

import json
import re
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import httpx2
import pytest
from pydantic import ValidationError

from app.core.config import Settings, get_settings
from app.modules.pricing import osrm
from app.modules.pricing.osrm import FallbackReason, Point, RoadDistanceUnavailable
from app.modules.pricing.quotes import road_delivery_cost
from app.modules.pricing.schemas import QuoteCreate
from app.shared.delivery_location import OUTSIDE_AREA_MESSAGE

APP = Path(__file__).resolve().parents[1] / "app"
EXAMPLES = Path(__file__).resolve().parents[2] / "docs/api/examples"


# --- The formula --------------------------------------------------------------------


def test_the_delivery_cost_is_base_plus_distance_plus_extra_trips() -> None:
    # 100,000 + 1,234 m at 15,000 a km (18,510) + one extra trip at 80,000.
    cost = road_delivery_cost(
        base_fee=100_000, rate_per_km=15_000, additional_trip=80_000, trips=2, road_metres=1_234
    )
    assert cost == 100_000 + 18_510 + 80_000


def test_one_trip_pays_no_extra_trip() -> None:
    cost = road_delivery_cost(
        base_fee=100_000, rate_per_km=10_000, additional_trip=80_000, trips=1, road_metres=5_000
    )
    assert cost == 150_000


@pytest.mark.parametrize(
    ("rate", "metres", "charge"),
    [
        (5, 100, 1),  # 0.5 kobo rounds up (half-up)
        (5, 300, 2),  # 1.5 rounds up
        (5, 299, 1),  # 1.495 rounds down
        (10_001, 1_234, 12_341),  # 12,341.234 rounds down
        (10_000, 0, 0),  # no distance
        (0, 12_345, 0),  # no rate
    ],
)
def test_the_distance_charge_is_exact_decimal_rounded_half_up_to_kobo(
    rate: int, metres: int, charge: int
) -> None:
    cost = road_delivery_cost(
        base_fee=0, rate_per_km=rate, additional_trip=0, trips=1, road_metres=metres
    )
    assert cost == charge
    assert isinstance(cost, int)


def test_a_long_distance_does_not_lose_precision() -> None:
    cost = road_delivery_cost(
        base_fee=0, rate_per_km=999_999, additional_trip=0, trips=1, road_metres=123_456_789
    )
    assert cost == round(
        123_456_789 * 999_999 / 1000
    )  # exact in integers: 123,456,665,543,211 / 1000


# --- The OSRM adapter ---------------------------------------------------------------

SOURCE_A = Point(latitude=6.4361, longitude=7.5134)
SOURCE_B = Point(latitude=6.4800, longitude=7.4900)
HOME = Point(latitude=6.4447, longitude=7.5108)


@pytest.fixture
def osrm_on(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    monkeypatch.setenv("OSRM_BASE_URL", "http://osrm.test/")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def transport(
    handler: Any,
) -> httpx2.MockTransport:
    return httpx2.MockTransport(handler)


def table(*distances: float | None) -> dict[str, Any]:
    return {"code": "Ok", "distances": [[d] for d in distances]}


@pytest.mark.anyio
async def test_the_longest_road_wins_and_one_request_asks_for_every_source(osrm_on: None) -> None:
    seen: list[httpx2.Request] = []

    def handler(request: httpx2.Request) -> httpx2.Response:
        seen.append(request)
        return httpx2.Response(200, json=table(1234.4, 5678.6))

    longest = await osrm.longest_road_distance(
        [SOURCE_A, SOURCE_B], HOME, transport=transport(handler)
    )
    assert (longest.metres, longest.source_index) == (5679, 1)  # whole metres, nearest
    [request] = seen
    assert request.url.path == (
        "/table/v1/driving/7.513400,6.436100;7.490000,6.480000;7.510800,6.444700"
    )
    assert dict(request.url.params) == {
        "sources": "0;1",
        "destinations": "2",
        "annotations": "distance",
    }


@pytest.mark.anyio
async def test_only_coordinates_are_sent(osrm_on: None) -> None:
    seen: list[httpx2.Request] = []

    def handler(request: httpx2.Request) -> httpx2.Response:
        seen.append(request)
        return httpx2.Response(200, json=table(900))

    await osrm.longest_road_distance([SOURCE_A], HOME, transport=transport(handler))
    [request] = seen
    assert request.method == "GET"
    assert not request.content
    assert set(request.headers) <= {"host", "accept", "accept-encoding", "connection", "user-agent"}
    assert re.fullmatch(r"/table/v1/driving/[\d.,;]+", request.url.path)


@pytest.mark.anyio
async def test_a_zero_distance_is_a_distance(osrm_on: None) -> None:
    longest = await osrm.longest_road_distance(
        [SOURCE_A], HOME, transport=transport(lambda _: httpx2.Response(200, json=table(0)))
    )
    assert longest.metres == 0


@pytest.mark.anyio
async def test_osrm_off_means_unavailable_and_makes_no_request(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("OSRM_BASE_URL", "")
    get_settings.cache_clear()
    called = False

    def handler(_: httpx2.Request) -> httpx2.Response:
        nonlocal called
        called = True
        return httpx2.Response(200, json=table(1))

    with pytest.raises(RoadDistanceUnavailable) as raised:
        await osrm.longest_road_distance([SOURCE_A], HOME, transport=transport(handler))
    assert raised.value.reason is FallbackReason.OSRM_UNAVAILABLE
    assert not called
    get_settings.cache_clear()


def _raises(exc: Exception) -> Any:
    def handler(_: httpx2.Request) -> httpx2.Response:
        raise exc

    return handler


@pytest.mark.parametrize(
    ("handler", "reason"),
    [
        (_raises(httpx2.ReadTimeout("slow")), FallbackReason.TIMEOUT),
        (_raises(httpx2.ConnectTimeout("slow")), FallbackReason.TIMEOUT),
        (_raises(httpx2.ConnectError("refused")), FallbackReason.OSRM_UNAVAILABLE),
        (lambda _: httpx2.Response(500, text="boom"), FallbackReason.OSRM_UNAVAILABLE),
        (lambda _: httpx2.Response(200, text="not json"), FallbackReason.OSRM_UNAVAILABLE),
        (lambda _: httpx2.Response(200, json={"code": "Ok"}), FallbackReason.OSRM_UNAVAILABLE),
        (
            lambda _: httpx2.Response(200, json={"code": "Ok", "distances": [[1], [2]]}),
            FallbackReason.OSRM_UNAVAILABLE,  # one source asked, two answered
        ),
        (
            lambda _: httpx2.Response(200, json={"code": "NoTable"}),
            FallbackReason.NO_ROUTE,
        ),
        (lambda _: httpx2.Response(200, json=table(None)), FallbackReason.NO_ROUTE),
        (lambda _: httpx2.Response(200, json=table(-5)), FallbackReason.NO_ROUTE),
        (lambda _: httpx2.Response(200, json=table("far")), FallbackReason.NO_ROUTE),  # type: ignore[arg-type]
    ],
)
@pytest.mark.anyio
async def test_every_way_osrm_can_fail_is_unavailable_with_its_reason(
    osrm_on: None, handler: Any, reason: FallbackReason
) -> None:
    with pytest.raises(RoadDistanceUnavailable) as raised:
        await osrm.longest_road_distance([SOURCE_A], HOME, transport=transport(handler))
    assert raised.value.reason is reason


@pytest.mark.anyio
async def test_one_source_without_a_route_makes_the_whole_answer_unavailable(
    osrm_on: None,
) -> None:
    # The price must cover whichever source staff pick, so one unreachable source is no answer.
    with pytest.raises(RoadDistanceUnavailable) as raised:
        await osrm.longest_road_distance(
            [SOURCE_A, SOURCE_B],
            HOME,
            transport=transport(lambda _: httpx2.Response(200, json=table(1000, None))),
        )
    assert raised.value.reason is FallbackReason.NO_ROUTE


# --- The delivery location on a quote -----------------------------------------------

REQUEST = json.loads((EXAMPLES / "quote-create-request.json").read_text())


def quote_body(**changes: Any) -> dict[str, Any]:
    return {**REQUEST, **changes}


def location(**changes: Any) -> dict[str, Any]:
    return {"latitude": 6.452713, "longitude": 7.510348, "source": "map_pin", **changes}


def test_a_quote_takes_an_optional_delivery_location() -> None:
    assert QuoteCreate.model_validate(quote_body()).delivery_location is None
    assert QuoteCreate.model_validate(quote_body(delivery_location=None)).delivery_location is None
    parsed = QuoteCreate.model_validate(quote_body(delivery_location=location()))
    assert parsed.delivery_location is not None
    assert (parsed.delivery_location.latitude, parsed.delivery_location.source.value) == (
        6.452713,
        "map_pin",
    )


def test_a_location_is_kept_to_six_places() -> None:
    parsed = QuoteCreate.model_validate(
        quote_body(delivery_location=location(latitude=6.4527134999, longitude=7.5103484999))
    )
    assert parsed.delivery_location is not None
    assert (parsed.delivery_location.latitude, parsed.delivery_location.longitude) == (
        6.452713,
        7.510348,
    )


@pytest.mark.parametrize(
    "bad",
    [
        location(source="typed"),
        location(source="gps"),
        {"latitude": 6.45, "longitude": 7.51},  # source is required with a point
        location(latitude=91),
        location(longitude=-181),
        location(latitude=float("nan")),
        {**location(), "accuracy": 5},  # no accuracy figure is stored
        {"latitude": 6.45},
        "6.45,7.51",
    ],
)
def test_a_bad_location_is_refused(bad: Any) -> None:
    with pytest.raises(ValidationError):
        QuoteCreate.model_validate(quote_body(delivery_location=bad))


@pytest.mark.parametrize(
    ("latitude", "longitude"),
    [(51.5, -0.1), (6.45, 3.4), (4.0, 7.5), (8.0, 7.5), (6.45, 9.0)],  # London, Lagos, ...
)
def test_a_point_outside_the_delivery_bounds_is_refused_on_the_whole_field(
    latitude: float, longitude: float
) -> None:
    with pytest.raises(ValidationError) as raised:
        QuoteCreate.model_validate(
            quote_body(delivery_location=location(latitude=latitude, longitude=longitude))
        )
    [error] = raised.value.errors()
    assert error["loc"] == ("delivery_location",)  # never the inner latitude or longitude
    assert OUTSIDE_AREA_MESSAGE in error["msg"]


@pytest.mark.parametrize(
    ("latitude", "longitude"),
    [(5.9, 7.1), (7.0, 8.0), (6.4447, 7.5108)],  # corners and Enugu
)
def test_the_bounds_include_their_edges_and_enugu(latitude: float, longitude: float) -> None:
    parsed = QuoteCreate.model_validate(
        quote_body(delivery_location=location(latitude=latitude, longitude=longitude))
    )
    assert parsed.delivery_location is not None


def test_the_bounds_are_a_setting(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DELIVERY_LOCATION_BOUNDS", "6.0,7.0,6.5,7.6")
    get_settings.cache_clear()
    try:
        with pytest.raises(ValidationError):
            QuoteCreate.model_validate(quote_body(delivery_location=location(latitude=6.9)))
        QuoteCreate.model_validate(quote_body(delivery_location=location(latitude=6.4)))
    finally:
        get_settings.cache_clear()


# --- Settings -----------------------------------------------------------------------


def settings(**values: str) -> Settings:
    # _env_file=None isolates the test from any developer .env file.
    return Settings(  # type: ignore[call-arg]
        _env_file=None, database_url="postgresql+asyncpg://u:p@localhost:5432/db", **values
    )


def test_osrm_is_off_by_default_with_a_two_second_timeout() -> None:
    assert settings().osrm_base_url == ""
    assert settings().osrm_timeout_seconds == 2.0


def test_the_osrm_address_is_cleaned_and_must_be_http() -> None:
    assert settings(osrm_base_url=" http://osrm:5000/ ").osrm_base_url == "http://osrm:5000"
    for bad in ("osrm:5000", "ftp://osrm", "http://"):
        with pytest.raises(ValidationError):
            settings(osrm_base_url=bad)


@pytest.mark.parametrize("bad", ["0", "-1", "11"])
def test_the_osrm_timeout_is_a_short_positive_time(bad: str) -> None:
    with pytest.raises(ValidationError):
        settings(osrm_timeout_seconds=bad)


@pytest.mark.parametrize(
    "bad", ["1,2,3", "a,b,c,d", "7.0,7.1,6.0,8.0", "5.9,8.0,7.0,7.1", "-91,0,0,1"]
)
def test_the_bounds_setting_must_be_a_box(bad: str) -> None:
    with pytest.raises(ValidationError):
        settings(delivery_location_bounds=bad)


# --- FR-022: never a straight-line distance -----------------------------------------

STRAIGHT_LINE = re.compile(
    r"haversine|great_circle|greatcircle|geodesic|vincenty|ST_Distance|ST_DWithin|"
    r"ST_Length|math\.radians|\bradians\(|\bsqrt\(|hypot\(|\bcdist\b",
    re.IGNORECASE,
)


@pytest.mark.parametrize("module", ["pricing", "sources"])
def test_no_pricing_code_computes_a_distance_from_coordinates(module: str) -> None:
    offenders = [
        f"{path.relative_to(APP)}:{number}: {line.strip()}"
        for path in (APP / "modules" / module).glob("*.py")
        for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1)
        if STRAIGHT_LINE.search(line) and not line.lstrip().startswith(("#", '"""', "*"))
    ]
    assert offenders == []


def test_the_only_distance_the_quote_uses_comes_from_the_osrm_module() -> None:
    quotes_source = (APP / "modules/pricing/quotes.py").read_text(encoding="utf-8")
    assert "osrm.longest_road_distance(" in quotes_source
    assert "latitude -" not in quotes_source and "longitude -" not in quotes_source
