"""GET /me/badges — catálogo + estado de desbloqueo (Sprint Tarde · TASK 4)."""
from __future__ import annotations

from sqlalchemy import delete

from hg.db import SessionLocal
from hg.modules.badges.models import Badge, UserBadge


def _make_badge(code: str, *, name: str = "B", order_index: int = 0, hint: str = "") -> None:
    s = SessionLocal()
    try:
        s.add(
            Badge(
                code=code,
                name=name,
                icon_url="/icons/hex-star-128.png",
                description="desc",
                unlock_hint=hint,
                order_index=order_index,
            )
        )
        s.commit()
    finally:
        s.close()


def _unlock(org_id, user_id, code: str) -> None:
    s = SessionLocal()
    try:
        badge = s.query(Badge).filter(Badge.code == code).one()
        s.add(UserBadge(org_id=org_id, user_id=user_id, badge_id=badge.id))
        s.commit()
    finally:
        s.close()


def _cleanup(*codes: str) -> None:
    s = SessionLocal()
    s.execute(delete(Badge).where(Badge.code.in_(codes)))  # CASCADE borra user_badges
    s.commit()
    s.close()


def test_my_badges_reflects_unlock_state(client, factory, auth_headers) -> None:
    org = factory.make_org()
    user = factory.make_user(org=org)
    _make_badge("t-locked", name="Locked", order_index=2, hint="Hacé X")
    _make_badge("t-unlocked", name="Unlocked", order_index=1)
    _unlock(org.id, user.id, "t-unlocked")
    try:
        res = client.get("/api/v1/me/badges", headers=auth_headers(user))
        assert res.status_code == 200
        by_code = {b["code"]: b for b in res.json()}

        assert by_code["t-unlocked"]["unlocked"] is True
        assert by_code["t-unlocked"]["unlocked_at"] is not None
        assert by_code["t-locked"]["unlocked"] is False
        assert by_code["t-locked"]["unlocked_at"] is None
        assert by_code["t-locked"]["unlock_hint"] == "Hacé X"

        # order_index: t-unlocked (1) antes que t-locked (2).
        codes = [b["code"] for b in res.json() if b["code"].startswith("t-")]
        assert codes.index("t-unlocked") < codes.index("t-locked")
    finally:
        _cleanup("t-locked", "t-unlocked")


def test_my_badges_only_returns_my_unlocks(client, factory, auth_headers) -> None:
    org = factory.make_org()
    user_a = factory.make_user(org=org)
    user_b = factory.make_user(org=org)
    _make_badge("t-shared", name="Shared")
    _unlock(org.id, user_a.id, "t-shared")
    try:
        res = client.get("/api/v1/me/badges", headers=auth_headers(user_b))
        by_code = {b["code"]: b for b in res.json()}
        # user_b no lo desbloqueó, aunque user_a sí.
        assert by_code["t-shared"]["unlocked"] is False
    finally:
        _cleanup("t-shared")


def test_my_badges_requires_auth(client) -> None:
    assert client.get("/api/v1/me/badges").status_code in (401, 403)
