"""EmailService + templates + triggers (Release TASK 3). Resend siempre mockeado."""
from __future__ import annotations

import pytest

from hg.config import get_settings
from hg.modules.notifications.email_service import email_service


@pytest.fixture
def emails_on(monkeypatch):
    s = get_settings()
    monkeypatch.setattr(s, "emails_enabled", True)
    monkeypatch.setattr(s, "resend_api_key", "re_test_key")
    monkeypatch.setattr("time.sleep", lambda *_: None)
    return s


def test_send_skipped_when_flag_off(monkeypatch) -> None:
    s = get_settings()
    monkeypatch.setattr(s, "emails_enabled", False)
    calls = []
    monkeypatch.setattr("resend.Emails.send", lambda params: calls.append(params))
    status = email_service.send(
        to="a@b.io", subject="x", template="invitation", context={"nombre": "Andy", "link": "https://x"}
    )
    assert status == "skipped"
    assert calls == []  # NO se llamó a Resend


def test_send_calls_resend_when_enabled(emails_on, monkeypatch) -> None:
    captured = {}
    monkeypatch.setattr("resend.Emails.send", lambda params: captured.update(params) or {"id": "abc123"})
    status = email_service.send(
        to="andy@humangrowth.io", subject="Hola",
        template="invitation", context={"nombre": "Andy", "link": "https://app.humangrowth.io/x"},
    )
    assert status == "sent"
    assert captured["to"] == ["andy@humangrowth.io"]
    assert captured["subject"] == "Hola"
    assert "Andy" in captured["html"] and "humangrowth.io/x" in captured["html"]
    assert captured["reply_to"] == "admin@humangrowth.io"


def test_send_never_raises_and_returns_failed(emails_on, monkeypatch) -> None:
    def boom(_params):
        raise RuntimeError("resend down")

    monkeypatch.setattr("resend.Emails.send", boom)
    status = email_service.send(
        to="a@b.io", subject="x", template="welcome", context={"nombre": "Ana", "cta_url": "https://x"}
    )
    assert status == "failed"


def test_all_templates_render() -> None:
    inv = email_service.render("invitation", {"nombre": "Andy", "link": "https://app.humangrowth.io/accept"})
    assert "Andy" in inv and "app.humangrowth.io/accept" in inv
    wel = email_service.render("welcome", {"nombre": "Ana", "cta_url": "https://app.humangrowth.io/modulos"})
    assert "Ana" in wel and "modulos" in wel
    con = email_service.render(
        "contact_inquiry",
        {"name": "Lead", "email": "l@x.io", "company": "Acme", "role": "CTO", "message": "hola", "source": "web"},
    )
    assert "Lead" in con and "Acme" in con and "hola" in con
