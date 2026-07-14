# HG Backend — FastAPI

API REST de Human Growth. Monolito modular en Python 3.12 con módulos de dominio claramente separados (`identity`, `people`, `learning`, `ai`, `notifications`, `analytics`, `admin`).

## Stack
- FastAPI 0.115 + Pydantic v2
- SQLAlchemy 2.0 + Alembic
- PostgreSQL 16 (psycopg3 + asyncpg)
- Redis 7 + Celery 5.4
- Sentry + structlog
- Resend (email) · boto3 (R2)

## Setup local
```bash
uv sync                                    # instala deps + crea .venv
uv run uvicorn hg.main:app --reload        # API en :8000
uv run alembic upgrade head                # aplica migraciones
uv run pytest                              # tests
uv run ruff check src tests                # lint
```

## Estructura
```
src/hg/
├── main.py             # FastAPI app + lifecycle
├── config.py           # Settings (pydantic-settings, lee .env)
├── db.py               # SQLAlchemy engine + session factory
├── celery_app.py       # Celery broker + tasks discovery
├── api/v1/             # Routers versionados (montados en main)
├── core/               # Logging, errors, security, deps comunes
└── modules/            # Dominios (uno por carpeta)
    ├── identity/       # Auth, sesiones, RLS, roles
    ├── people/         # Perfiles, jerarquía, manager view
    ├── learning/       # Events (paths, catálogo, progreso — ex "courses")
    ├── learning_units/ # Módulos: micro-lecciones + quiz + retrieval (v2)
    ├── ai/             # Chatbot, RAG, recomendaciones (Fase 1.5)
    ├── notifications/  # Email, alertas, workers Celery
    ├── analytics/      # Eventos append-only, métricas
    └── admin/          # Panel HG interno, feature flags
```

Cada módulo sigue:
```
modules/<name>/
├── __init__.py
├── models.py     # SQLAlchemy models
├── schemas.py    # Pydantic schemas (in/out)
├── service.py    # Lógica de negocio
├── repository.py # Acceso a datos
├── router.py     # Endpoints FastAPI
└── tasks.py      # (opcional) tareas Celery
```

## Learning Units (Módulos)

Sistema de contenido modular ("Learning Units v2") que convive con el catálogo
de `events` heredado — ver `docs/prompts/claude-code_learning_units_v2_fase1.md`
para el diseño completo. Contenido global (sin RLS por org); solo el progreso
del usuario (`learning_unit_attempts` y tablas hijas) es privado por org.

**Consumer** (`/api/v1/modulos/*`, cualquier usuario autenticado):
- `GET /modulos/feed` — hero + próximas units recomendadas
- `GET /modulos/{slug}` — detalle con los 4 tipos de bloque (video/text/quiz/reflection)
- `POST /modulos/{slug}/attempts/start` — idempotente (crea o resetea si ya estaba completed)
- `GET /modulos/{slug}/attempt` — progreso actual
- `POST /modulos/{slug}/blocks/{block_id}/complete` — bloques video/text
- `POST /modulos/{slug}/blocks/{block_id}/quiz/submit` — grading server-side, 6 tipos de pregunta
- `POST /modulos/{slug}/blocks/{block_id}/reflection/submit`

**Admin CMS** (`/api/v1/admin/*`, solo `superadmin`): CRUD de units/bloques,
publish con validación (video + evidencia con DOI + solución + retrieval
required), reorder de bloques. Sin UI propia todavía (Fase 2) — se usa vía
API directa; ver `docs/learning-units/create-unit-via-api.md` para el flujo
completo y `docs/api/learning_units.bruno/` para una colección Bruno lista
para correr contra el backend local.

Seed de contenido placeholder: `uv run python -m hg.scripts.seed_learning_units`
(idempotente — corre 2x sin duplicar).

## Convenciones
- Todas las queries filtran por `org_id` (multi-tenancy).
- Tablas con datos de usuario llevan `org_id` y RLS habilitado.
- Eventos en `activity_events` son **append-only**.
- Tests con `pytest-asyncio` y base de datos efímera por test.
