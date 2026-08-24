#!/usr/bin/env bash
# Corre migración + seeds de demo usando el venv del host (NO docker/uv, que
# no están en el contenedor). Self-contained: setea el venv y un DATABASE_URL
# por defecto a localhost:5432 (el mismo Postgres del stack, publicado al host).
#
# Uso:
#   scripts/seed_demo.sh                      # DB local (localhost:5432)
#   DATABASE_URL="postgresql+psycopg://..." scripts/seed_demo.sh   # otra DB (ej. Neon)
#
# Requiere el venv en apps/backend/.venv (ver scripts/README.md).
set -euo pipefail

# Raíz de apps/backend (este script vive en apps/backend/scripts/).
BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BACKEND_DIR"

PY="$BACKEND_DIR/.venv/bin/python"
ALEMBIC="$BACKEND_DIR/.venv/bin/alembic"

if [[ ! -x "$PY" ]]; then
  echo "ERROR: no existe el venv en $BACKEND_DIR/.venv — creá el venv primero." >&2
  exit 1
fi

# Default: el host `postgres` del config solo resuelve dentro de la red de Docker;
# desde el host se usa el puerto publicado en localhost.
export DATABASE_URL="${DATABASE_URL:-postgresql+psycopg://hg:hg@localhost:5432/hg_dev}"
echo "→ DATABASE_URL host: $(echo "$DATABASE_URL" | sed -E 's#://[^@]*@#://****@#')"

echo "==== 1/3 · alembic upgrade head ===="
"$ALEMBIC" upgrade head

echo "==== 2/3 · seed_learning_units (units + bloques, necesario para actividad) ===="
"$PY" -m hg.scripts.seed_learning_units

echo "==== 3/3 · seed (empresas → orgs + actividad) ===="
"$PY" -m hg.scripts.seed

echo "✓ Listo. Login demo: maria.fernandez@acme.test / AcmeDemo#2026 (ver scripts/seed_data/README.md)"
