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
    ├── learning/       # Cursos, paths, progreso, assessments
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

## Convenciones
- Todas las queries filtran por `org_id` (multi-tenancy).
- Tablas con datos de usuario llevan `org_id` y RLS habilitado.
- Eventos en `activity_events` son **append-only**.
- Tests con `pytest-asyncio` y base de datos efímera por test.
