# Bulk import de Learning Units desde Google Drive

Jorge Araya publica units en un folder de Google Drive. Cada sub-folder
(`CP-L1-P{n}-{seq}`) trae 1-2 videos MP4 y un Google Doc con el **JSON de la
unit embebido** (mismo formato que `HG-P1-L1-001.json`). El script
`hg.scripts.sync_units_from_drive` recorre esos sub-folders, sube los MP4 a R2,
arma los `video_blocks` apuntando a las URLs de R2 y hace upsert de cada unit
en la base (idempotente por slug).

Folder raíz actual:
`https://drive.google.com/drive/folders/1JeGr5jYk5IjarRxigtsyGEcZy_VXzNb3`

> **TL;DR** — para el import real necesitás credenciales de Google Drive **y**
> de R2. Para probar el flujo sin subir nada: `--dry-run`. Para importar desde
> una copia local (sin Drive API): `--local-folder ... --skip-drive-download`.

---

## Setup de credenciales

Todo va en `apps/backend/.env.local` (gitignored) o en el env del proceso.

### Google Drive API (service account)

1. En Google Cloud Console → crear un **service account** con acceso de lectura
   a Drive; descargar el JSON de la key.
2. Compartir el folder raíz de Drive con el email del service account (permiso
   de lectura).
3. Exportar la ruta al JSON:

   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=/ruta/al/service_account.json
   ```

El scope requerido es `https://www.googleapis.com/auth/drive.readonly`.

### Cloudflare R2

El script reusa `hg.core.storage` (el mismo cliente que `migrate_videos_to_r2.py`).
Config esperada (ver `hg.config.Settings`):

```bash
export R2_ACCOUNT_ID=...
export R2_ACCESS_KEY_ID=...
export R2_SECRET_ACCESS_KEY=...
export R2_BUCKET=hg-videos                 # bucket por defecto del proyecto
export R2_PUBLIC_BASE_URL=https://cdn.humangrowth.io   # CDN que sirve el bucket
```

Los videos se suben con key `learning-units/{slug}/VID{n}.mp4` y la
`video_url` que se persiste es la URL pública del CDN
(`{R2_PUBLIC_BASE_URL}/learning-units/{slug}/VID{n}.mp4`).

> Si faltan credenciales R2, `upload_file` opera en **dry-run**: loguea y
> devuelve la URL pública *esperada* sin subir el archivo. El flujo completo
> corre y las units quedan creadas, pero los videos no van a reproducir hasta
> que se suban de verdad.

---

## Uso

Desde `apps/backend/`:

```bash
# Import completo (las 16 units) vía Drive API:
python -m hg.scripts.sync_units_from_drive

# Otro folder raíz:
python -m hg.scripts.sync_units_from_drive --root-folder-id <FOLDER_ID>

# Sin ejecutar — lista lo que haría, no toca R2 ni DB:
python -m hg.scripts.sync_units_from_drive --dry-run

# Sólo un sub-folder:
python -m hg.scripts.sync_units_from_drive --only CP-L1-P1-001

# Crear como borrador sin intentar publicar:
python -m hg.scripts.sync_units_from_drive --no-publish
```

### Comportamiento de publicación

Después de crear cada unit, el script intenta **publicarla** corriendo la misma
validación que la API (`POST /admin/learning-units/{id}/publish`): al menos 1
video, 1 `text_evidence` con `doi_or_url` no vacío, 1 `text_solution` que
referencia esa evidencia, y 1 `quiz_recall`/`reflection_write` con
`required=true`.

- Si pasa → la unit queda **publicada**.
- Si no pasa → queda como **borrador** y el script loguea los motivos (no
  aborta el resto del import).
- `--no-publish` fuerza todas a borrador.

Al final imprime un resumen:
`folders=16 · mp4s=30 · publicadas=14 · borradores=2 · fallidas=0`.

---

## Fallback: sincronizar a local con rclone (sin Google Drive API)

Si preferís no configurar el service account (o querés testear sin creds de
Drive), bajá el folder a disco con [`rclone`](https://rclone.org/) y corré el
script en modo carpeta local.

```bash
# Instalar + configurar un remote de Drive llamado "drive" (una vez):
brew install rclone
rclone config

# Sincronizar el folder raíz a local, exportando los Docs a texto plano:
rclone sync "drive:CP - Units" ./drive-local --drive-export-formats txt

# Import desde la copia local (sólo necesita creds de R2 para subir los MP4):
python -m hg.scripts.sync_units_from_drive \
    --local-folder ./drive-local --skip-drive-download
```

En modo local el script:

- Lee los sub-folders que matchean `CP-L{n}-P{n}-{seq}`.
- Busca en cada uno un `.txt` (Doc exportado) o `.json` con el JSON de la unit.
- Sube los `.mp4` a R2 (si hay creds; si no, dry-run de upload).
- Hace upsert de la unit.

---

## Cómo se arma cada unit

1. **JSON del Doc** → `extract_json_from_doc_text` limpia los escapes de
   markdown que Google Docs mete al exportar (`\_`, `\[`, `\]`, ...) y parsea el
   primer objeto JSON válido (ignora la prosa de alrededor).
2. **Videos** → cada MP4 se sube a R2; se arma un `video_block` por MP4 (el
   primero `video_intro`, los siguientes `video_teaching`) y se **prepend**
   a los bloques de la unit.
3. **Upsert** → `hg.modules.learning_units.services.upsert_unit_from_dict`
   traduce el dict a los schemas admin y crea la unit + bloques reusando
   `create_unit`/`create_block`/`publish_unit` (misma validación que la API).

`requires_evidence_position` en un `text_solution` se resuelve a la posición
1-indexada del `text_evidence` destino **dentro de la lista final de bloques**;
`splice_blocks` corrige ese índice automáticamente cuando el prepend de videos
corre las posiciones.

### `duration_seconds` de los videos

Es un placeholder fijo (`60s`) — leer la duración real de un MP4 necesitaría
`ffprobe`/`moviepy` (deps que no están en el runtime). Andrés puede ajustarlo
post-import, o se completa cuando se agregue lectura de metadata.

---

## Agregar más units en el futuro

Jorge sube el nuevo sub-folder al mismo folder raíz → corré el script de nuevo.
Es idempotente por slug: las units ya importadas se recrean desde el JSON
actual (sin duplicar), y las nuevas se agregan. Para importar sólo la nueva:
`--only CP-L1-P2-007`.

---

## Troubleshooting

| Síntoma | Causa probable | Fix |
|---|---|---|
| `GOOGLE_APPLICATION_CREDENTIALS` KeyError | falta el env var | exportá la ruta al JSON del service account |
| `HttpError 404` al listar el folder | el folder no está compartido con el service account | compartilo (lectura) con el email del service account |
| `HttpError 403 · rateLimitExceeded` | demasiadas requests a Drive | reintentá; para lotes grandes, corré por tandas con `--only` |
| `sin Google Doc — se saltea` | el sub-folder no tiene un Doc | agregá el Doc con el JSON, o revisá permisos |
| `JSON embebido en el Doc no parseable` | el JSON del Doc está mal formado | abrí el Doc, validá el JSON (llaves, comas) |
| video_url apunta al CDN pero el video no carga | R2 en dry-run (sin creds) — no se subió | configurá `R2_*` y reimportá |
| `R2 no configurado` en el log | faltan credenciales R2 | exportá `R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`/`R2_PUBLIC_BASE_URL` |

---

## Referencias

- Script: [`apps/backend/src/hg/scripts/sync_units_from_drive.py`](../../apps/backend/src/hg/scripts/sync_units_from_drive.py)
- Service helper: `hg.modules.learning_units.services.upsert_unit_from_dict`
- Crear una unit a mano (sin bulk): [`create-unit-via-api.md`](./create-unit-via-api.md)
- Migración de videos de events (script hermano): `apps/backend/scripts/migrate_videos_to_r2.py`
