"""Add an optional delivery location to saved addresses and orders (#340).

docs/api/delivery-location.md (agreed 2026-11-03), "Storage": each of
``customer_addresses`` and ``orders`` gets a nullable PostGIS
``geography(POINT, 4326)`` and a nullable source saying how the point was set
(``device_location`` or ``map_pin``).

- ``customer_addresses.location`` and ``location_source``.
- ``orders.delivery_location`` and ``delivery_location_source``: the order's
  own copy (FR-024), so a saved address can change without touching it.
- Two CHECKs on each table: the point and its source are set together or not
  at all, and the source is one of the two values. Written by hand, because
  autogenerate does not see CHECK constraints.
- No spatial index: nothing searches by location yet.

Every column is nullable, so existing rows are untouched and satisfy the
checks. The downgrade drops the columns and the points in them; it restores the
schema, not that data.

Revision ID: 0025
Revises: 0024
Create Date: 2026-11-03 09:35:24.256999+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from geoalchemy2 import Geography

revision: str = "0025"
down_revision: str | Sequence[str] | None = "0024"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Frozen copy at this revision. Migrations must not import app code.
SOURCES = ("device_location", "map_pin")
#: (table, point column, source column, constraint-name prefix)
LOCATIONS = (
    ("customer_addresses", "location", "location_source", "location"),
    ("orders", "delivery_location", "delivery_location_source", "delivery_location"),
)


def upgrade() -> None:
    sources = ", ".join(f"'{value}'" for value in SOURCES)
    for table, point, source, prefix in LOCATIONS:
        op.add_geospatial_column(
            table,
            sa.Column(
                point,
                Geography(geometry_type="POINT", srid=4326, spatial_index=False),
                nullable=True,
            ),
        )
        op.add_column(table, sa.Column(source, sa.String(length=20), nullable=True))
        op.create_check_constraint(
            f"{prefix}_pair", table, f"({point} IS NULL) = ({source} IS NULL)"
        )
        op.create_check_constraint(f"{prefix}_source", table, f"{source} IN ({sources})")


def downgrade() -> None:
    for table, point, source, prefix in reversed(LOCATIONS):
        op.drop_constraint(f"{prefix}_source", table, type_="check")
        op.drop_constraint(f"{prefix}_pair", table, type_="check")
        op.drop_column(table, source)
        op.drop_geospatial_column(table, point)
