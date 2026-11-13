"""``/version`` expone la versión y el SHA desplegados (observabilidad, ADR-0015)."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from hg.config import get_settings


def test_version_without_sha(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(get_settings(), "git_sha", "")
    body = client.get("/version").json()
    assert body["git_sha"] is None and body["version"]


def test_version_with_sha(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(get_settings(), "git_sha", "abc1234")
    assert client.get("/version").json()["git_sha"] == "abc1234"
