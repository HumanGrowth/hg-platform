"""Tests for the YouTube URL/ID parser (TASK A-06)."""
from __future__ import annotations

import pytest

from hg.modules.learning_units.youtube import extract_youtube_video_id, youtube_thumbnail_url

VALID_ID = "dQw4w9WgXcQ"


class TestExtractYoutubeVideoId:
    def test_bare_id(self) -> None:
        assert extract_youtube_video_id(VALID_ID) == VALID_ID

    def test_watch_url(self) -> None:
        assert extract_youtube_video_id(f"https://www.youtube.com/watch?v={VALID_ID}") == VALID_ID

    def test_watch_url_no_www(self) -> None:
        assert extract_youtube_video_id(f"https://youtube.com/watch?v={VALID_ID}") == VALID_ID

    def test_watch_url_with_extra_query_params(self) -> None:
        assert extract_youtube_video_id(f"https://www.youtube.com/watch?v={VALID_ID}&t=42s&list=PL123") == VALID_ID

    def test_embed_url(self) -> None:
        assert extract_youtube_video_id(f"https://www.youtube.com/embed/{VALID_ID}") == VALID_ID

    def test_shorts_url(self) -> None:
        assert extract_youtube_video_id(f"https://www.youtube.com/shorts/{VALID_ID}") == VALID_ID

    def test_youtu_be_short_url(self) -> None:
        assert extract_youtube_video_id(f"https://youtu.be/{VALID_ID}") == VALID_ID

    def test_youtu_be_with_query_params(self) -> None:
        assert extract_youtube_video_id(f"https://youtu.be/{VALID_ID}?t=10") == VALID_ID

    def test_mobile_subdomain(self) -> None:
        assert extract_youtube_video_id(f"https://m.youtube.com/watch?v={VALID_ID}") == VALID_ID

    def test_strips_whitespace(self) -> None:
        assert extract_youtube_video_id(f"  {VALID_ID}  ") == VALID_ID

    @pytest.mark.parametrize(
        "bad_input",
        [
            "not-a-url-or-id",
            "https://vimeo.com/123456",
            "short",
            "way-too-long-to-be-an-id-12345",
            "https://www.youtube.com/watch?v=tooshort",
            "https://www.youtube.com/",
            "",
        ],
    )
    def test_invalid_inputs_raise(self, bad_input: str) -> None:
        with pytest.raises(ValueError, match="No es una URL/ID de YouTube válido"):
            extract_youtube_video_id(bad_input)


class TestYoutubeThumbnailUrl:
    def test_default_quality(self) -> None:
        assert youtube_thumbnail_url(VALID_ID) == f"https://i.ytimg.com/vi/{VALID_ID}/hqdefault.jpg"

    def test_custom_quality(self) -> None:
        assert youtube_thumbnail_url(VALID_ID, quality="maxresdefault") == (
            f"https://i.ytimg.com/vi/{VALID_ID}/maxresdefault.jpg"
        )
