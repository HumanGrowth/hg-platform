"""Una sola definición de "curso completado" en dashboard RRHH, CSV y vista del usuario.

Legacy (unit reemplazada) y reemplazo son el mismo módulo — cambia solo el video —,
así que completar ambos cuenta UNA vez, una asignación sobre la legacy cuenta contra
su reemplazo y un intento abierto sobre la legacy no es "en progreso"."""
from __future__ import annotations

import csv
import io
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete

from hg.modules.identity.models import UserRole
from hg.modules.learning_units.models import (
    LearningUnit,
    LearningUnitAttempt,
    ModuleAssignment,
)


def _unit(s, slug: str, *, superseded_by: uuid.UUID | None = None) -> LearningUnit:
    u = LearningUnit(
        slug=f"{slug}-{uuid.uuid4().hex[:6]}", title=slug, dimension_code="CP", level_code="L1",
        pillar_code="P1", published_at=datetime.now(UTC), superseded_by_unit_id=superseded_by,
    )
    s.add(u)
    s.flush()
    return u


def test_legacy_and_replacement_count_once_everywhere(client, factory, auth_headers) -> None:
    s = factory.session
    org = factory.make_org()
    admin = factory.make_user(org=org, role=UserRole.admin)
    collab = factory.make_user(org=org, role=UserRole.collaborator)
    now = datetime.now(UTC)

    new_a = _unit(s, "new-a")
    legacy_a = _unit(s, "legacy-a", superseded_by=new_a.id)
    new_b = _unit(s, "new-b")
    legacy_b = _unit(s, "legacy-b", superseded_by=new_b.id)
    unit_ids = [new_a.id, legacy_a.id, new_b.id, legacy_b.id]
    try:
        # A: completó la legacy Y el reemplazo (se contaba dos veces).
        for u in (legacy_a, new_a):
            s.add(LearningUnitAttempt(
                user_id=collab.id, unit_id=u.id, org_id=org.id,
                started_at=now - timedelta(days=2), completed_at=now - timedelta(days=1),
            ))
        # B: dejó la legacy a medias (no es "en progreso": ya no está en la ruta).
        s.add(LearningUnitAttempt(
            user_id=collab.id, unit_id=legacy_b.id, org_id=org.id, started_at=now - timedelta(days=1),
        ))
        # Asignaciones sobre las LEGACY (como en prod): cuentan contra su reemplazo.
        for u in (legacy_a, legacy_b):
            s.add(ModuleAssignment(org_id=org.id, user_id=collab.id, learning_unit_id=u.id))
        s.commit()

        h = auth_headers(admin)
        metrics = client.get("/api/v1/admin/org/metrics", headers=h).json()
        assert metrics["total_courses_completed"] == 1
        assert metrics["assigned_total"] == 2
        assert metrics["assigned_completed"] == 1  # A cumplida vía su reemplazo; B pendiente

        accounts = client.get("/api/v1/admin/org/insights", headers=h).json()["accounts"]
        row = next(a for a in accounts if a["user_id"] == str(collab.id))
        assert (row["modules_completed"], row["modules_assigned"]) == (1, 2)

        rows = list(csv.DictReader(io.StringIO(client.get(
            "/api/v1/admin/org/users/export.csv", headers=h
        ).text)))
        mine = next(r for r in rows if r["email"] == collab.email)
        assert mine["courses_completed"] == "1"
        assert mine["courses_in_progress"] == "0"
        assert "role" in mine  # el CSV conserva la columna role (todos los roles)

        # Vista del usuario/manager: mismo número que el dashboard y el CSV.
        detail = client.get(f"/api/v1/manager/users/{collab.id}/detail", headers=h)
        assert detail.status_code == 200, detail.text
        body = detail.json()
        assert body["courses_completed"] == 1
        assert [c["course_slug"] for c in body["courses_completed_list"]] == [new_a.slug]
        assert body["courses_in_progress_list"] == []
    finally:
        s.rollback()
        s.execute(delete(LearningUnit).where(LearningUnit.id.in_(unit_ids)))
        s.commit()
