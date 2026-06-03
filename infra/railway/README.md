# Railway

Dos servicios:
- `hg-backend` — build con `apps/backend/Dockerfile`, comando: `uvicorn hg.main:app --host 0.0.0.0 --port $PORT`
- `hg-worker` — mismo Dockerfile, comando: `celery -A hg.celery_app worker --loglevel=info`

Variables (configurar en Railway, **no commit**): ver `.env.example`.

Health check: `GET /health` → 200.
