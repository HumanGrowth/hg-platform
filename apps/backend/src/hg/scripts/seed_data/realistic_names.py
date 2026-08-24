"""Nombres hispanohablantes realistas para los seeds de demo (AOD-05).

Estructura Company → Organizations → roster (ago-2026). Cada empresa tiene un
``admin`` que gestiona toda la empresa (todas sus orgs + dashboard), y cada org
tiene un ``manager`` con 2-8 colaboradores. El grafo de reporte:
- managers reportan al admin de la empresa,
- colaboradores reportan al manager de su org.

Cada entrada de roster es ``(first, last, role, manager_localpart | None)``.
``manager_localpart`` es el local-part del email del manager (ej. "carlos.rodriguez")
o ``None`` (managers → reportan al admin de la empresa).
"""
from __future__ import annotations

import unicodedata


def email_from(first: str, last: str, domain: str) -> str:
    """``María``, ``Fernández`` → ``maria.fernandez@domain``. Sin tildes ni ñ."""

    def _strip(s: str) -> str:
        nfd = unicodedata.normalize("NFD", s)
        return "".join(c for c in nfd if unicodedata.category(c) != "Mn").lower()

    return f"{_strip(first)}.{_strip(last)}@{domain}"


def local_part(first: str, last: str) -> str:
    return email_from(first, last, "x").split("@")[0]


# ── Empresas demo (Company → Orgs) ──────────────────────────────────────────

# Cada empresa: slug, nombre, dominio de email, password demo, pool de licencias,
# admin (gestiona toda la empresa) y sus orgs (cada una con manager + colabs).
DEMO_COMPANIES: list[dict] = [
    {
        "slug": "acme",
        "name": "Acme Corp",
        "domain": "acme.test",
        "password": "AcmeDemo#2026",
        "licenses_total": 60,
        # El admin de la empresa (rol unificado): gestiona todas las orgs.
        "admin": ("María", "Fernández"),
        "orgs": [
            {
                "slug": "acme-it",
                "name": "IT",
                "licenses": 25,
                "roster": [
                    ("Carlos", "Rodríguez", "manager", None),
                    ("Ana", "Méndez", "collaborator", "carlos.rodriguez"),
                    ("Diego", "Hernández", "collaborator", "carlos.rodriguez"),
                    ("Sofía", "Castro", "collaborator", "carlos.rodriguez"),
                    ("Andrés", "Vega", "collaborator", "carlos.rodriguez"),
                    ("Valeria", "Quirós", "collaborator", "carlos.rodriguez"),
                ],
            },
            {
                "slug": "acme-finanzas",
                "name": "Finanzas",
                "licenses": 15,
                "roster": [
                    ("Roberto", "Jiménez", "manager", None),
                    ("Lucía", "Vargas", "collaborator", "roberto.jimenez"),
                    ("Javier", "Morales", "collaborator", "roberto.jimenez"),
                    ("Camila", "Solís", "collaborator", "roberto.jimenez"),
                ],
            },
            {
                "slug": "acme-manufactura",
                "name": "Manufactura",
                "licenses": 20,
                "roster": [
                    ("Fernando", "Picado", "manager", None),
                    ("Mariana", "Salas", "collaborator", "fernando.picado"),
                    ("Gabriel", "Rojas", "collaborator", "fernando.picado"),
                    ("Daniela", "Ramírez", "collaborator", "fernando.picado"),
                    ("Pablo", "Guzmán", "collaborator", "fernando.picado"),
                    ("Natalia", "Herrera", "collaborator", "fernando.picado"),
                    ("Sebastián", "Núñez", "collaborator", "fernando.picado"),
                ],
            },
        ],
    },
    {
        "slug": "globex",
        "name": "Globex Ltd",
        "domain": "globex.test",
        "password": "GlobexDemo#2026",
        "licenses_total": 30,
        "admin": ("Patricia", "Álvarez"),
        "orgs": [
            {
                "slug": "globex-ventas",
                "name": "Ventas",
                "licenses": 12,
                "roster": [
                    ("Ricardo", "Fonseca", "manager", None),
                    ("Verónica", "Cordero", "collaborator", "ricardo.fonseca"),
                    ("Esteban", "Mora", "collaborator", "ricardo.fonseca"),
                    ("Adriana", "Soto", "collaborator", "ricardo.fonseca"),
                ],
            },
            {
                "slug": "globex-soporte",
                "name": "Soporte",
                "licenses": 8,
                "roster": [
                    ("Marcela", "Brenes", "manager", None),
                    ("Tomás", "Aguilar", "collaborator", "marcela.brenes"),
                    ("Isabel", "Chaves", "collaborator", "marcela.brenes"),
                ],
            },
        ],
    },
]

# Prospects para invitaciones de Acme: (first, last, status). status ∈
# {"accepted", "expired", "pending"} — se traduce a fechas en el seed. Van a la
# org IT de Acme (acme-it).
ACME_PROSPECTS: list[tuple[str, str, str]] = [
    ("Ignacio", "Blanco", "accepted"),
    ("Renata", "Campos", "expired"),
    ("Emiliano", "Durán", "pending"),
]
