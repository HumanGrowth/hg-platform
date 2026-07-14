"""video_blocks: youtube_video_id → video_url (LU refinements A-01).

YouTube embed is out for Learning Units — replaced by a plain `<video src>`
pointing at an R2-hosted MP4 (same pattern the legacy `events` catalog
already uses via `event_streams`/`hls_master_url`). This migration is
data-preserving for any existing rows: every `youtube_video_id` becomes a
`https://www.youtube.com/embed/{id}` URL so the column swap doesn't orphan
content — those rows get replaced by real R2 URLs in a follow-up seed run
(TASK lu-refine-A-04), not silently dropped here.

Downgrade is best-effort: only URLs matching the YouTube embed pattern can
be converted back to an 11-char `youtube_video_id`; anything else (a real
R2 MP4 URL created after this migration ran) becomes NULL on downgrade —
unavoidable, since an arbitrary URL has no YouTube ID to extract.
"""
from __future__ import annotations

from typing import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b7f3a1c9d4e2"
down_revision: str | None = "04c4e56f592e"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("video_blocks", sa.Column("video_url", sa.Text(), nullable=True))

    op.execute("""
        UPDATE video_blocks
        SET video_url = CONCAT('https://www.youtube.com/embed/', youtube_video_id)
        WHERE video_url IS NULL AND youtube_video_id IS NOT NULL
    """)

    op.alter_column("video_blocks", "video_url", nullable=False)
    op.drop_column("video_blocks", "youtube_video_id")


def downgrade() -> None:
    op.add_column("video_blocks", sa.Column("youtube_video_id", sa.String(length=11), nullable=True))

    op.execute("""
        UPDATE video_blocks
        SET youtube_video_id = SPLIT_PART(video_url, '/embed/', 2)
        WHERE video_url LIKE 'https://www.youtube.com/embed/%'
          AND length(SPLIT_PART(video_url, '/embed/', 2)) = 11
    """)

    op.drop_column("video_blocks", "video_url")
