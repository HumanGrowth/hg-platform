"""EmailService — envío transaccional vía Resend + templates Jinja2 (Release TASK 3).

- Feature flag ``emails_enabled``: si es false (dev/CI por defecto), NO envía —
  loguea ``email.skipped_flag_off`` y devuelve status "skipped". Envío real sólo
  cuando ``EMAILS_ENABLED=true`` (prod).
- ``send()`` NUNCA levanta excepción: un fallo de email jamás debe romper el flujo
  de negocio (invitación, registro, contact). Devuelve el status y loguea.
- Templates ``.html`` en ``templates/`` renderizados con Jinja2 (autoescape on).
"""
from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Any, Literal

import resend
from jinja2 import Environment, FileSystemLoader, select_autoescape

from hg.config import get_settings

log = logging.getLogger("hg.email")

_TEMPLATES_DIR = Path(__file__).parent / "templates"
_env = Environment(
    loader=FileSystemLoader(str(_TEMPLATES_DIR)),
    autoescape=select_autoescape(["html", "xml"]),
)

SendStatus = Literal["sent", "skipped", "failed"]
_MAX_ATTEMPTS = 3


class EmailService:
    def render(self, template: str, context: dict[str, Any]) -> str:
        """Renderiza ``templates/{template}.html`` con el contexto dado."""
        return _env.get_template(f"{template}.html").render(**context)

    def send(
        self,
        *,
        to: str,
        subject: str,
        template: str,
        context: dict[str, Any],
    ) -> SendStatus:
        settings = get_settings()

        if not settings.emails_enabled:
            log.info("email.skipped_flag_off", extra={"to": to, "template": template})
            return "skipped"
        if not settings.resend_api_key:
            log.warning("email.skipped_no_key", extra={"to": to, "template": template})
            return "skipped"

        try:
            html = self.render(template, context)
        except Exception as exc:
            log.error("email.render_failed", extra={"template": template, "error": str(exc)})
            return "failed"

        resend.api_key = settings.resend_api_key
        params: dict[str, Any] = {
            "from": settings.email_from,
            "to": [to],
            "subject": subject,
            "html": html,
            "reply_to": settings.email_reply_to,
        }
        for attempt in range(1, _MAX_ATTEMPTS + 1):
            try:
                result = resend.Emails.send(params)  # type: ignore[arg-type]
                msg_id = result.get("id") if isinstance(result, dict) else None
                log.info(
                    "email.sent",
                    extra={"to": to, "template": template, "resend_message_id": msg_id},
                )
                return "sent"
            except Exception as exc:
                if attempt >= _MAX_ATTEMPTS:
                    log.error(
                        "email.failed",
                        extra={"to": to, "template": template, "error": str(exc)},
                    )
                    return "failed"
                time.sleep(0.5 * attempt)  # backoff lineal simple
        return "failed"


email_service = EmailService()
