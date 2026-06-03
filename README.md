# Human Growth — Plataforma

Plataforma SaaS B2B2C de aprendizaje y desarrollo profesional holístico basada en las 6 dimensiones del crecimiento humano.

> **Status:** Bootstrap inicial (Bloque B1 del Kanban v1). Junio 2026.

---

## Stack

| Capa | Tecnología |
|---|---|
| Backend API | Python 3.12 + FastAPI + SQLAlchemy 2.0 + Alembic |
| DB | PostgreSQL 16 (con RLS y pgvector) |
| Caché / Colas | Redis 7 + Celery |
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui |
| Auth | Auth.js v5 (NextAuth) |
| Almacenamiento video | Cloudflare R2 + CDN |
| Hosting MVP | Railway (backend) + Vercel (frontend) + Neon (Postgres) |
| Observabilidad | Sentry + PostHog |
| Package mgmt | `uv` (Python) · `pnpm` (Node) |

Decisiones arquitecturales completas en `docs/ARCHITECTURE.md` y en `HG/Artifacts/HG_Technical_Planning_v1.docx`.

---

## Estructura del monorepo

```
hg-platform/
├── apps/
│   ├── backend/          FastAPI + Celery + Alembic (Python 3.12, uv)
│   └── frontend/         Next.js 14 + Tailwind + shadcn/ui (TypeScript, pnpm)
├── packages/
│   └── shared-types/     Tipos TypeScript compartidos (opcional, futuro)
├── infra/                Notas de deploy: Railway, Vercel, Neon
├── docs/                 Arquitectura, ADRs, runbooks
├── scripts/              Scripts de migración, seed, mantenimiento
├── .github/workflows/    CI/CD
├── docker-compose.yml    Stack local (Postgres + Redis + backend + frontend)
└── .env.example          Variables de entorno (copiar a .env)
```

---

## Quick start

### Prerequisitos
- Docker Desktop (con Compose v2)
- Python 3.12+ y `uv` (https://github.com/astral-sh/uv)
- Node 20+ y `pnpm` (https://pnpm.io)
- Make (opcional, atajos en `Makefile`)

### Levantar todo con Docker (recomendado)
```bash
cp .env.example .env
docker compose up --build
```

Servicios disponibles:
- Backend API: http://localhost:8000 (docs en `/docs`)
- Frontend: http://localhost:3000
- Postgres: localhost:5432 (`hg / hg / hg_dev`)
- Redis: localhost:6379

### Desarrollo local sin Docker

**Backend:**
```bash
cd apps/backend
uv sync
uv run uvicorn hg.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd apps/frontend
pnpm install
pnpm dev
```

---

## Comandos comunes

| Comando | Qué hace |
|---|---|
| `docker compose up --build` | Levanta el stack completo |
| `docker compose exec backend uv run alembic upgrade head` | Aplica migraciones |
| `docker compose exec backend uv run alembic revision --autogenerate -m "msg"` | Genera migración |
| `docker compose exec backend uv run pytest` | Corre tests backend |
| `cd apps/frontend && pnpm test` | Tests frontend |
| `cd apps/frontend && pnpm lint` | Lint frontend |

---

## Convenciones

- **Branching:** `main` (protegida) · `dev` (integración) · `feat/<bloque>-<id>-<slug>`
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`)
- **PRs:** referenciar el ID del Kanban (ej. `B1-03`) en el título
- **Migraciones:** una por PR, revisable, nunca editar revisiones ya mergeadas

---

## Roadmap inmediato

Ver `HG/Artifacts/HG_Kanban_v1.md` y `HG/Artifacts/HG_Backlog_Priorizado_v1.md`.

**Bloque B1 — Fundación técnica (Jun 2–13):**
- [x] Scaffolding del monorepo
- [ ] DEV-03 · Esquema PostgreSQL + Alembic
- [ ] DEV-04 · Row Level Security multi-tenancy
- [ ] DEV-06 · Auth (registro, login, JWT)
- [ ] DEV-07 · RBAC con scope `org_id`
- [ ] DEV-08 · CI/CD GitHub Actions
- [ ] DEV-09 · Migración 111 videos a Cloudflare R2

---

## Licencia
Confidencial · Uso interno de Human Growth · © 2026
