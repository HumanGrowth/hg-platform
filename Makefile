# Human Growth — comandos comunes
.PHONY: help up down logs ps build rebuild backend-shell frontend-shell db-shell \
        migrate migrate-local seed-demo makemigration test-backend test-frontend \
        lint-backend lint-frontend seed clean

help: ## Mostrar esta ayuda
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

up: ## Levantar todo el stack
	docker compose up --build

down: ## Detener el stack
	docker compose down

logs: ## Ver logs (todos los servicios)
	docker compose logs -f

ps: ## Estado de servicios
	docker compose ps

build: ## Build de imágenes
	docker compose build

rebuild: ## Rebuild forzado
	docker compose build --no-cache

backend-shell: ## Shell en backend
	docker compose exec backend bash

frontend-shell: ## Shell en frontend
	docker compose exec frontend sh

db-shell: ## psql en postgres
	docker compose exec postgres psql -U hg -d hg_dev

migrate: ## Aplicar migraciones
	docker compose exec backend uv run alembic upgrade head

migrate-local: ## Migraciones vía venv del host (localhost:5432, sin docker/uv)
	cd apps/backend && DATABASE_URL="$${DATABASE_URL:-postgresql+psycopg://hg:hg@localhost:5432/hg_dev}" .venv/bin/alembic upgrade head

seed-demo: ## Migración + seeds de demo vía venv del host (self-contained)
	apps/backend/scripts/seed_demo.sh

makemigration: ## Crear migración (uso: make makemigration m="add users table")
	docker compose exec backend uv run alembic revision --autogenerate -m "$(m)"

test-backend: ## Tests backend
	docker compose exec backend uv run pytest

test-frontend: ## Tests frontend
	cd apps/frontend && pnpm test

lint-backend: ## Lint backend (ruff + mypy)
	docker compose exec backend uv run ruff check src tests
	docker compose exec backend uv run mypy src

lint-frontend: ## Lint frontend
	cd apps/frontend && pnpm lint

seed: ## Seed datos de demo
	docker compose exec backend python -m hg.scripts.seed

seed-catalog: ## Seed del catálogo PMM (6 paths + cursos desde manifests)
	docker compose exec backend python -m hg.scripts.seed_catalog

clean: ## Limpiar volúmenes y artefactos
	docker compose down -v
	rm -rf apps/frontend/.next apps/frontend/node_modules
	find apps/backend -type d -name __pycache__ -exec rm -rf {} +
