"""Detección de HTML sospechoso en el body de un text_block (TASK polish-08).

Defense-in-depth / content-review: el frontend renderiza el body como markdown
(sin HTML raw, XSS-safe), pero si un coach pega HTML por error conviene loguear
un warning. No bloquea el contenido."""
from __future__ import annotations

import logging

import pytest

from hg.modules.learning_units.admin_router import _warn_suspicious_html


@pytest.mark.parametrize(
    "body",
    [
        "<script>alert('x')</script>",
        "Texto y <iframe src=evil></iframe>",
        "<img src=x onerror=alert(1)>",
        'Un <a href="javascript:alert(1)">link</a>',
        "<style>body{display:none}</style>",
        "Botón <button onclick=hack()>x</button>",
    ],
)
def test_warns_on_suspicious_html(body: str, caplog: pytest.LogCaptureFixture) -> None:
    with caplog.at_level(logging.WARNING, logger="hg.learning_units.admin"):
        _warn_suspicious_html(body, "test")
    assert any("HTML sospechoso" in r.message for r in caplog.records)


@pytest.mark.parametrize(
    "body",
    [
        "Texto plano sin nada raro.",
        "Markdown con **negrita**, *cursiva* y ==resaltado==.",
        "Una lista:\n- uno\n- dos\n\n> una cita",
        "Un link markdown [fuente](https://example.com/x) y `code`.",
        "Comparación a < b y 3 > 2 en una frase.",  # < / > sueltos, no tags
    ],
)
def test_no_warning_on_clean_markdown(body: str, caplog: pytest.LogCaptureFixture) -> None:
    with caplog.at_level(logging.WARNING, logger="hg.learning_units.admin"):
        _warn_suspicious_html(body, "test")
    assert not caplog.records
