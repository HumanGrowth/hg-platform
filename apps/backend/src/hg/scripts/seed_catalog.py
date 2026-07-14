"""Seed del catálogo PMM: 6 CareerPaths (P1..P6) + cursos desde los manifests.

Todo el video producido vive bajo **P1 Carrera** (el catálogo del Drive es PMM
v3, que operativiza P1). Idempotente: upsert de CareerPath por ``code`` y de
Event por ``slug``. Re-ejecutable con ``make seed-catalog``.

Corre como ``hg`` (superusuario en dev → BYPASSRLS). El catálogo no tiene RLS.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from hg.db import SessionLocal
from hg.modules.learning.models import (
    CareerLevel,
    CareerPath,
    CompetencyCode,
    Event,
    EventTrack,
)

log = logging.getLogger("hg.seed_catalog")

PATHS = [
    {"code": "P1", "name": "Carrera e impacto", "order_index": 1,
     "description": "Crecimiento profesional: competencias, niveles y ruta de carrera."},
    {"code": "P2", "name": "Propósito y significado", "order_index": 2,
     "description": "Conectar el trabajo con un sentido propio y duradero."},
    {"code": "P3", "name": "Relaciones y conexión", "order_index": 3,
     "description": "Vínculos, comunicación y pertenencia en el trabajo y fuera de él."},
    {"code": "P4", "name": "Salud y bienestar", "order_index": 4,
     "description": "Energía, hábitos y sostenibilidad del desempeño."},
    {"code": "P5", "name": "Paz interior y claridad", "order_index": 5,
     "description": "Calma, foco y decisiones con menos ruido mental."},
    {"code": "P6", "name": "Estabilidad emocional y material", "order_index": 6,
     "description": "Resiliencia emocional y bases materiales/financieras."},
]

MANIFEST_DIR = Path(__file__).resolve().parents[3] / "scripts" / "manifest"


def _upsert_path(db: Session, data: dict[str, Any]) -> CareerPath:
    path = db.execute(select(CareerPath).where(CareerPath.code == data["code"])).scalar_one_or_none()
    if path:
        path.name = data["name"]
        path.description = data["description"]
        path.order_index = data["order_index"]
        return path
    path = CareerPath(**data)
    db.add(path)
    db.flush()
    return path


def _load_manifests() -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for level in ("L1", "L2", "L3"):
        f = MANIFEST_DIR / f"{level}.json"
        if f.exists():
            entries.extend(json.loads(f.read_text()))
    # Orden global determinista: (nivel, competencia, order_index del manifest).
    entries.sort(key=lambda e: (e["career_level"], e["competency_code"] or "", e["order_index"]))
    return entries


def _upsert_course(db: Session, *, path_id, entry: dict[str, Any], order_index: int) -> bool:
    competency = CompetencyCode(entry["competency_code"]) if entry["competency_code"] else None
    values: dict[str, Any] = {
        "career_path_id": path_id,
        "title": entry["title"],
        "description": entry.get("description"),
        "video_url": entry.get("video_url"),
        "hls_master_url": entry.get("hls_master_url"),
        "thumbnail_url": entry.get("thumbnail_url"),
        "duration_seconds": entry.get("duration_seconds", 0),
        "order_index": order_index,
        "is_active": entry.get("is_active", True),
        "career_level": CareerLevel(entry["career_level"]),
        "competency_code": competency,
        "track": EventTrack(entry["track"]),
    }
    existing = db.execute(select(Event).where(Event.slug == entry["slug"])).scalar_one_or_none()
    if existing:
        for k, v in values.items():
            setattr(existing, k, v)
        return False
    db.add(Event(slug=entry["slug"], **values))
    return True


def run() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    db = SessionLocal()
    try:
        paths = {p["code"]: _upsert_path(db, p) for p in PATHS}
        p1_id = paths["P1"].id

        entries = _load_manifests()
        created = updated = 0
        for i, entry in enumerate(entries, start=1):
            is_new = _upsert_course(db, path_id=p1_id, entry=entry, order_index=i)
            created += int(is_new)
            updated += int(not is_new)
        db.commit()
        log.info(
            "seed_catalog done: paths=%d courses_created=%d courses_updated=%d",
            len(paths), created, updated,
        )
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
