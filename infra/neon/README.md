# Neon (Postgres managed)

- Project: `hg-platform`
- Branches: `main` (prod), `staging`, `dev`
- Extensions habilitadas: `uuid-ossp`, `pgcrypto`, `pg_trgm` (y `vector` para Fase 1.5)
- Backups: daily snapshot + PITR 7 días
- Connection string: ver dashboard (formato `postgresql+psycopg://...`)
