"""POST /admin/upload/image — validaciones + gate (cierre-beta TASK 4)."""
from __future__ import annotations

from fastapi.testclient import TestClient

from hg.modules.identity.models import UserRole

# PNG 1x1 válido (firma + IHDR + IDAT + IEND).
_PNG_1x1 = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cb\x00\x01"
    b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)

# PNG con IHDR declarando 4000x4000 (solo header, no hace falta imagen completa).
_PNG_HUGE = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    + (4000).to_bytes(4, "big") + (4000).to_bytes(4, "big")
    + b"\x08\x06\x00\x00\x00" + b"\x00" * 16
)


def _sa(factory, auth_headers):
    return auth_headers(factory.make_user(org=factory.make_org(), role=UserRole.superadmin))


def test_upload_valid_png_returns_url(client: TestClient, factory, auth_headers) -> None:
    res = client.post(
        "/api/v1/admin/upload/image",
        headers=_sa(factory, auth_headers),
        files={"file": ("hero.png", _PNG_1x1, "image/png")},
    )
    assert res.status_code == 200, res.text
    assert res.json()["url"].endswith(".png")


def test_upload_rejects_non_image_415(client: TestClient, factory, auth_headers) -> None:
    res = client.post(
        "/api/v1/admin/upload/image",
        headers=_sa(factory, auth_headers),
        files={"file": ("evil.png", b"not really an image", "image/png")},
    )
    assert res.status_code == 415


def test_upload_rejects_too_large_413(client: TestClient, factory, auth_headers) -> None:
    big = b"\x00" * (5 * 1024 * 1024 + 10)
    res = client.post(
        "/api/v1/admin/upload/image",
        headers=_sa(factory, auth_headers),
        files={"file": ("big.png", big, "image/png")},
    )
    assert res.status_code == 413


def test_upload_rejects_oversized_dimensions_422(client: TestClient, factory, auth_headers) -> None:
    res = client.post(
        "/api/v1/admin/upload/image",
        headers=_sa(factory, auth_headers),
        files={"file": ("huge.png", _PNG_HUGE, "image/png")},
    )
    assert res.status_code == 422


def test_upload_requires_superadmin(client: TestClient, factory, auth_headers) -> None:
    collab = auth_headers(factory.make_user(org=factory.make_org(), role=UserRole.collaborator))
    res = client.post(
        "/api/v1/admin/upload/image", headers=collab,
        files={"file": ("hero.png", _PNG_1x1, "image/png")},
    )
    assert res.status_code == 403
    anon = client.post("/api/v1/admin/upload/image", files={"file": ("h.png", _PNG_1x1, "image/png")})
    assert anon.status_code in (401, 403)
