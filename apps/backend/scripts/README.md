# Backend scripts

## `migrate_videos_to_r2.py` — Drive → R2 + manifest (B1-09)

Recorre una carpeta de **nivel** del Drive (L1/L2/L3), encuentra los MP4 finales
por competencia (`P1..P5` → `C1..C5`) o foundation (`FND - AI/ETH/Specifics`),
transcodea a HLS multi-bitrate (480/720/1080) + thumbnail con `ffmpeg`, sube a
Cloudflare R2 y escribe un manifest JSON que consume `seed_catalog.py`.

### Requisitos (no vienen en el container de dev)
- `pip install google-api-python-client google-auth`
- `ffmpeg` + `ffprobe` en PATH
- `GOOGLE_APPLICATION_CREDENTIALS=/path/service_account.json` con acceso de
  lectura al Drive de HG (compartir las carpetas con el service account).
- Credenciales R2 en el env (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
  `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`). Sin ellas → `--dry-run`.

### Uso
```bash
# Producción (sube a R2):
python scripts/migrate_videos_to_r2.py \
  --drive-folder 131KYawT8lC8I2hqFrpHf3XeNqQBQX8HO --level L1 \
  --manifest-out scripts/manifest/L1.json

# Sin credenciales R2 → solo manifest (URLs públicas esperadas, sin subir):
python scripts/migrate_videos_to_r2.py ... --dry-run
# Copiar el MP4 tal cual sin transcodear a HLS:
python scripts/migrate_videos_to_r2.py ... --skip-hls
```
Folder IDs de los niveles "Done":
- L1: `131KYawT8lC8I2hqFrpHf3XeNqQBQX8HO`
- L2: `1lD2rBWx8umDmo6T72RnXqTZ-uQdp40GV`
- L3: `1rKAmuLRAbqewTcGzEXm6_FwaArAlxGI7`

**Idempotente:** si un slug ya está en el manifest de salida, se saltea. Re-correr
sólo agrega lo nuevo.

### Estado actual de los manifests (`scripts/manifest/`)
- `L1.json` — 3 cursos reales (competencias C1/C2). Generado vía la API de Drive;
  `duration_seconds=0` y URLs R2 como *placeholders* porque se corrió sin
  credenciales (dry-run). Re-correr con creds R2 + ffmpeg sube los videos y
  completa duraciones/URLs reales.
- `L2.json`, `L3.json` — vacíos: esas carpetas tienen guiones/curricula "Done"
  pero **aún no hay videos renderizados** (producción en curso). Re-correr el
  script cuando existan.

## `seed_catalog.py` — 6 CareerPaths + cursos desde manifests (B1-11)

Inserta/actualiza los 6 `CareerPath` (P1..P6) y popula `courses` desde los
manifests de `scripts/manifest/`. Todo el video del catálogo vive bajo **P1
Carrera**. Idempotente (upsert por `slug`).

```bash
make seed-catalog
# o:
docker compose exec backend uv run python -m hg.scripts.seed_catalog   # (si hay uv)
DATABASE_URL=postgresql+psycopg://hg:hg@localhost:5432/hg_dev \
  .venv/bin/python -m hg.scripts.seed_catalog                          # desde host venv
```
