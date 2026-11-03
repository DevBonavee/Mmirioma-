"""Road-distance pricing: a source location and how a quote's delivery cost was found (#385).

docs/api/order-details-and-price.md, "Amendment #385: road-distance pricing"
(agreed 2026-11-03).

- ``water_sources.location``: an optional WGS 84 point an administrator sets.
  Existing sources have none, and a quote that could use one without a point
  uses the zone's fee, so nothing changes until locations are entered.
- ``quotes``: ``delivery_basis`` (``zone_fee`` or ``road_distance``, default
  ``zone_fee`` so every existing quote is a zone-fee quote), the road distance
  and the source it belongs to, the fallback reason, the three rates applied
  (FR-024), and the customer's pin the quote was priced for
  (``delivery_location`` and ``delivery_location_source``, personal data).
- CHECKs keep the two ways of finding a delivery cost apart and the location and
  its source set together. The pin is not part of the shape: it is personal
  data that the privacy rules clear later, while the price, the distance and the
  rates stay. The
  enum CHECKs are written by hand (autogenerate emits them twice, LOG.md,
  2026-10-14).

Columns only; no data is rewritten and the downgrade drops them.

Revision ID: 0027
Revises: 0026
Create Date: 2026-11-03 18:00:00+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from geoalchemy2 import Geography

revision: str = "0027"
down_revision: str | Sequence[str] | None = "0026"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Frozen copies at this revision. Migrations must not import app code.
BASES = ("zone_fee", "road_distance")
REASONS = ("no_source_location", "osrm_unavailable", "no_route", "timeout")
SHAPE = (
    "(delivery_basis = 'road_distance' AND road_distance_metres >= 0"
    " AND distance_source_id IS NOT NULL AND base_delivery_fee_minor_units >= 0"
    " AND distance_rate_minor_units_per_km >= 0 AND additional_trip_minor_units >= 0"
    " AND distance_fallback_reason IS NULL)"
    " OR (delivery_basis = 'zone_fee' AND road_distance_metres IS NULL"
    " AND distance_source_id IS NULL AND base_delivery_fee_minor_units IS NULL"
    " AND distance_rate_minor_units_per_km IS NULL AND additional_trip_minor_units IS NULL)"
)


def _point() -> Geography:
    return Geography(geometry_type="POINT", srid=4326, spatial_index=False)


def _in(column: str, values: tuple[str, ...]) -> str:
    return f"{column} IN ({', '.join(f"'{value}'" for value in values)})"


def upgrade() -> None:
    op.add_column("water_sources", sa.Column("location", _point(), nullable=True))
    op.add_column(
        "quotes",
        sa.Column(
            "delivery_basis", sa.String(length=13), server_default="zone_fee", nullable=False
        ),
    )
    op.add_column("quotes", sa.Column("road_distance_metres", sa.BigInteger(), nullable=True))
    op.add_column("quotes", sa.Column("distance_source_id", sa.Uuid(), nullable=True))
    op.add_column(
        "quotes", sa.Column("distance_fallback_reason", sa.String(length=20), nullable=True)
    )
    op.add_column(
        "quotes", sa.Column("base_delivery_fee_minor_units", sa.BigInteger(), nullable=True)
    )
    op.add_column(
        "quotes", sa.Column("distance_rate_minor_units_per_km", sa.BigInteger(), nullable=True)
    )
    op.add_column(
        "quotes", sa.Column("additional_trip_minor_units", sa.BigInteger(), nullable=True)
    )
    op.add_column("quotes", sa.Column("delivery_location", _point(), nullable=True))
    op.add_column(
        "quotes", sa.Column("delivery_location_source", sa.String(length=16), nullable=True)
    )
    op.create_foreign_key(
        op.f("fk_quotes_distance_source_id_water_sources"),
        "quotes",
        "water_sources",
        ["distance_source_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index(op.f("ix_quotes_distance_source_id"), "quotes", ["distance_source_id"])
    op.create_check_constraint(
        op.f("ck_quotes_quote_delivery_basis"), "quotes", _in("delivery_basis", BASES)
    )
    op.create_check_constraint(
        op.f("ck_quotes_quote_distance_fallback_reason"),
        "quotes",
        _in("distance_fallback_reason", REASONS),
    )
    op.create_check_constraint(op.f("ck_quotes_delivery_basis_shape"), "quotes", SHAPE)
    op.create_check_constraint(
        op.f("ck_quotes_delivery_location_complete"),
        "quotes",
        "(delivery_location IS NULL) = (delivery_location_source IS NULL)",
    )


def downgrade() -> None:
    for name in (
        "ck_quotes_delivery_location_complete",
        "ck_quotes_delivery_basis_shape",
        "ck_quotes_quote_distance_fallback_reason",
        "ck_quotes_quote_delivery_basis",
    ):
        op.drop_constraint(op.f(name), "quotes", type_="check")
    op.drop_index(op.f("ix_quotes_distance_source_id"), table_name="quotes")
    op.drop_constraint(
        op.f("fk_quotes_distance_source_id_water_sources"), "quotes", type_="foreignkey"
    )
    for column in (
        "delivery_location_source",
        "delivery_location",
        "additional_trip_minor_units",
        "distance_rate_minor_units_per_km",
        "base_delivery_fee_minor_units",
        "distance_fallback_reason",
        "distance_source_id",
        "road_distance_metres",
        "delivery_basis",
    ):
        op.drop_column("quotes", column)
    op.drop_column("water_sources", "location")
