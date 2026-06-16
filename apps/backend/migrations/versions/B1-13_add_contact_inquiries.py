"""B1-13 add contact inquiries

Tabla de leads del sitio público (contact form). Sin org_id ni RLS: son leads,
no usuarios de un tenant. Sólo el superadmin la lee vía endpoint admin.

Revision ID: a1c7e2f4b8d0
Revises: 675a9148a27d
Create Date: 2026-06-15 18:30:00.000000

"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a1c7e2f4b8d0'
down_revision: str | None = '675a9148a27d'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'contact_inquiries',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=254), nullable=False),
        sa.Column('company', sa.String(length=255), nullable=True),
        sa.Column('role', sa.String(length=50), nullable=True),
        sa.Column('message', sa.String(length=2000), nullable=True),
        sa.Column('source', sa.String(length=50), nullable=True),
        sa.Column('contacted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_contact_inquiries_email'), 'contact_inquiries', ['email'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_contact_inquiries_email'), table_name='contact_inquiries')
    op.drop_table('contact_inquiries')
