-- Extensiones de Postgres requeridas por HG.
-- Se ejecuta automáticamente al crear el contenedor en primera instancia.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- pgvector para embeddings (Fase 1.5)
-- CREATE EXTENSION IF NOT EXISTS vector;
