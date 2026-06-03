"""Smoke test del endpoint /health."""
from __future__ import annotations

from fastapi.testclient import TestClient


def test_health_ok(client: TestClient) -> None:
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert "version" in body


def test_api_v1_root(client: TestClient) -> None:
    res = client.get("/api/v1/")
    assert res.status_code == 200
    assert res.json() == {"api": "hg", "version": "v1"}
