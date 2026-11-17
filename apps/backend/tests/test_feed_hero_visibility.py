"""LC-07 (fix): el hero del feed respeta la visibilidad de contenido de la empresa."""
from __future__ import annotations

from tests import test_content_access_consistency as _base

API = _base.API
env = _base.env  # reutiliza el fixture (pytest lo registra por nombre en este módulo)


def test_feed_hero_hides_unit_whose_dimension_was_revoked_after_starting(client, factory, env, auth_headers) -> None:
    """Hueco de auditoría (LC-07): intento abierto + dimensión deshabilitada después."""
    from datetime import UTC, datetime

    from sqlalchemy import update

    from hg.modules.identity.models import Company
    from hg.modules.learning_units.models import LearningUnitAttempt

    company, user = env.build()
    unit = env.unit(dimension_code="PR")
    factory.session.add(
        LearningUnitAttempt(user_id=user.id, unit_id=unit.id, org_id=user.org_id, started_at=datetime.now(UTC))
    )
    factory.session.commit()
    h = auth_headers(user)

    before = client.get(f"{API}/modulos/feed", headers=h).json()
    assert before["hero"] is not None and before["hero"]["slug"] == unit.slug  # control: sí aparecía

    factory.session.execute(update(Company).where(Company.id == company.id).values(enabled_dimensions=["CP"]))
    factory.session.commit()

    assert client.get(f"{API}/modulos/{unit.slug}", headers=h).status_code == 404
    after = client.get(f"{API}/modulos/feed", headers=h).json()
    assert after["hero"] is None
    assert unit.slug not in str(after)
