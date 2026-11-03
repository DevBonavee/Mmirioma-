"""Let a website visitor's message be a support request (#339).

docs/api/public-site.md, "POST /public/contact" (agreed 2026-11-02): the
public contact form stores its message in ``support_requests``, which until
now needed a signed-in customer.

- ``user_id`` and ``idempotency_key`` become nullable: a visitor has no
  account and the public form has no idempotency key.
- New ``source`` (``app`` or ``website``, one named CHECK, default ``app`` so
  every existing row is an app request), ``contact_name`` (100) and
  ``contact_phone`` (16).
- New CHECK ``source_shape``: an ``app`` row has a user and a key and no
  contact fields; a ``website`` row has both contact fields and neither of
  the other two.

Existing rows are untouched and satisfy the new check (they all have a user
and a key). The downgrade deletes the ``website`` rows first, because they
cannot exist once ``user_id`` is required again; it restores the schema, not
that data. The enum CHECK is written by hand (autogenerate emits it twice,
LOG.md, 2026-10-14).

Revision ID: 0024
Revises: 0023
Create Date: 2026-11-02 18:00:00+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0024"
down_revision: str | Sequence[str] | None = "0023"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Frozen copy at this revision. Migrations must not import app code.
SOURCES = ("app", "website")
SHAPE = (
    "(source = 'app' AND user_id IS NOT NULL AND idempotency_key IS NOT NULL"
    " AND contact_name IS NULL AND contact_phone IS NULL)"
    " OR (source = 'website' AND user_id IS NULL AND idempotency_key IS NULL"
    " AND contact_name IS NOT NULL AND contact_phone IS NOT NULL)"
)


def upgrade() -> None:
    op.add_column(
        "support_requests",
        sa.Column("source", sa.String(length=10), server_default="app", nullable=False),
    )
    op.add_column(
        "support_requests", sa.Column("contact_name", sa.String(length=100), nullable=True)
    )
    op.add_column(
        "support_requests", sa.Column("contact_phone", sa.String(length=16), nullable=True)
    )
    op.alter_column("support_requests", "user_id", existing_type=sa.Uuid(), nullable=True)
    op.alter_column("support_requests", "idempotency_key", existing_type=sa.Uuid(), nullable=True)
    sources = ", ".join(f"'{value}'" for value in SOURCES)
    op.create_check_constraint(
        op.f("ck_support_requests_support_request_source"),
        "support_requests",
        f"source IN ({sources})",
    )
    op.create_check_constraint(op.f("ck_support_requests_source_shape"), "support_requests", SHAPE)


def downgrade() -> None:
    op.drop_constraint(op.f("ck_support_requests_source_shape"), "support_requests", type_="check")
    op.drop_constraint(
        op.f("ck_support_requests_support_request_source"), "support_requests", type_="check"
    )
    # A website request has no user, so it cannot stay once user_id is required.
    op.execute("DELETE FROM support_requests WHERE source = 'website'")
    op.alter_column("support_requests", "idempotency_key", existing_type=sa.Uuid(), nullable=False)
    op.alter_column("support_requests", "user_id", existing_type=sa.Uuid(), nullable=False)
    op.drop_column("support_requests", "contact_phone")
    op.drop_column("support_requests", "contact_name")
    op.drop_column("support_requests", "source")
