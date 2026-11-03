"""Record when and which Terms and Privacy Notice a person accepted at sign-up.

Sign-up now requires the person to confirm they are 18 or older and accept the
Terms of Service and Privacy Notice (docs/api/auth.md, #332). ``users`` keeps the time
and the version accepted.

There is no backfill: existing accounts stay null, which means no acceptance was
recorded and is never read as acceptance. A check constraint keeps the two columns
set or cleared together. Columns only; no data is rewritten and the downgrade drops
them.

Revision ID: 0025
Revises: 0024
Create Date: 2026-11-03 12:00:00+00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0025"
down_revision: str | Sequence[str] | None = "0024"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users", sa.Column("terms_accepted_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column("users", sa.Column("terms_version", sa.String(length=10), nullable=True))
    op.create_check_constraint(
        op.f("ck_users_terms_acceptance_complete"),
        "users",
        "(terms_accepted_at IS NULL) = (terms_version IS NULL)",
    )


def downgrade() -> None:
    op.drop_constraint(op.f("ck_users_terms_acceptance_complete"), "users", type_="check")
    op.drop_column("users", "terms_version")
    op.drop_column("users", "terms_accepted_at")
