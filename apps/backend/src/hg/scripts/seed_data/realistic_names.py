"""Nombres hispanohablantes realistas para los seeds de demo (AOD-05).

Para la demo a Jóvenes por Costa Rica (JxCR): reemplaza emails feos generados
por seed (``admin@acme.test``, ``prospect0-e11af@acme.test``) por identidades
regionales realistas (mezcla Costa Rica / Argentina / México).

Cada entrada de usuario es ``(first_name, last_name, role, manager_email)``.
``manager_email`` es el email (ya normalizado) del manager, o ``None``.
El grafo de reporte se preserva por email para que ``manager_id`` quede
consistente tras el remapeo.
"""
from __future__ import annotations

import unicodedata

# ── Rosters de las orgs demo ────────────────────────────────────────────────

# Acme Corp: 1 admin + 4 collaborators. maria.fernandez es la cuenta para
# demostrar el panel RRHH; carlos.rodriguez reporta a ella.
ACME_USERS: list[tuple[str, str, str, str | None]] = [
    ("María", "Fernández", "admin", None),
    ("Carlos", "Rodríguez", "collaborator", "maria.fernandez@acme.test"),
    ("Ana", "Méndez", "collaborator", None),
    ("Diego", "Hernández", "collaborator", None),
    ("Sofía", "Castro", "collaborator", None),
]

# Globex Ltd: 1 admin + 1 manager + 2 collaborators (los collab reportan a la
# manager, y la manager al admin).
GLOBEX_USERS: list[tuple[str, str, str, str | None]] = [
    ("Roberto", "Soto", "admin", None),
    ("Lucía", "Vargas", "manager", "roberto.soto@globex.test"),
    ("Javier", "Morales", "collaborator", "lucia.vargas@globex.test"),
    ("Camila", "Jiménez", "collaborator", "lucia.vargas@globex.test"),
]

# Prospects para invitaciones de Acme: (first, last, status).
# status ∈ {"accepted", "expired", "pending"} — se traduce a fechas en el seed.
ACME_PROSPECTS: list[tuple[str, str, str]] = [
    ("Andrés", "Vega", "accepted"),
    ("Valeria", "Quirós", "expired"),
    ("Fernando", "Picado", "expired"),
    ("Mariana", "Salas", "pending"),
]


def email_from(first: str, last: str, domain: str) -> str:
    """``María``, ``Fernández`` → ``maria.fernandez``. Sin tildes ni ñ, minúsculas."""

    def _strip(s: str) -> str:
        nfd = unicodedata.normalize("NFD", s)
        return "".join(c for c in nfd if unicodedata.category(c) != "Mn").lower()

    return f"{_strip(first)}.{_strip(last)}@{domain}"
