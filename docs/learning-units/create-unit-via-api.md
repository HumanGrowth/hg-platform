# Cómo crear una Learning Unit vía API

No hay CMS UI todavía (Fase 2) — hasta entonces, un superadmin crea y publica
units directo contra la API. Esta guía sigue el mismo flujo que
`docs/api/learning_units.bruno/` (que podés importar en Bruno y correr en
orden en vez de hacerlo a mano con curl).

## 0. Login como superadmin

```bash
curl -X POST localhost:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"superadmin@humangrowth.app","password":"<ver docs/dev-credentials.md>"}'
```

Guardá el `access_token` de la respuesta — todos los pasos siguientes lo
mandan como `Authorization: Bearer <token>`.

## 1. Crear la unit (vacía, sin bloques)

```bash
curl -X POST localhost:8000/api/v1/admin/learning-units \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{
    "slug": "p1-c3-l2-002-mi-nueva-unit",
    "title": "Título de la unit",
    "pillar_code": "P1",
    "competency_code": "C3",
    "level_code": "L2",
    "estimated_duration_seconds": 90
  }'
```

`slug` debe ser único (409 si ya existe) y `level_code` matchear `^L[1-6]$`.
La unit queda en borrador — no aparece en `/modulos/feed` ni es visible por
`GET /modulos/{slug}` hasta que se publique (paso 4).

Guardá el `id` de la respuesta — lo vas a necesitar para agregar bloques.

## 2. Agregar bloques

Cada bloque se crea con `POST /admin/learning-units/{unit_id}/blocks`. El
`position` define el orden. Para publicar, la unit necesita (ver
`_validate_for_publish` en `admin_router.py`):

1. Al menos 1 bloque de video (`video_intro`/`video_teaching`/`video_closing`)
2. Al menos 1 `text_evidence` con `citation.doi_or_url` no vacío
3. Al menos 1 `text_solution` con `requires_evidence_block_id` apuntando a
   un `text_evidence` **de la misma unit**
4. Al menos 1 `quiz_recall` o `reflection_write` con `required: true`
5. Todas las opciones `single_choice`/`multiple_choice` con `explanation`
   no vacío (ni solo espacios)

### Video

```json
POST /admin/learning-units/{unit_id}/blocks
{
  "block_type": "video_intro",
  "position": 1,
  "video_url": "https://cdn.humangrowth.app/videos/mi-unit/vid1.mp4",
  "duration_seconds": 12
}
```

`video_url` es cualquier URL http(s) completa (típicamente un MP4 servido
desde R2 — YouTube salió de scope). `poster_url` **no** se auto-genera —
si querés un thumbnail, hay que mandarlo explícito.

### Texto (evidencia)

```json
{
  "block_type": "text_evidence",
  "position": 2,
  "variant": "evidence",
  "eyebrow": "EVIDENCIA",
  "body": "...",
  "citation": {
    "text": "Autor, Journal (año)",
    "source": "Nombre del estudio",
    "year": 2020,
    "doi_or_url": "https://doi.org/...",
    "tier": "observational"
  }
}
```

`tier` es uno de `meta_analysis | rct | observational | expert_opinion`.
Guardá el `id` de la respuesta — es el que necesita el bloque `text_solution`.

### Texto (solución)

```json
{
  "block_type": "text_solution",
  "position": 3,
  "variant": "solution",
  "eyebrow": "PROBÁ ESTO",
  "body": "...",
  "requires_evidence_block_id": "<id del text_evidence del paso anterior>"
}
```

`requires_evidence_block_id` es el `id` que devolvió la respuesta del bloque
evidence (no un ID interno distinto — el mismo que ves en cualquier
`BlockRead`).

### Quiz (6 tipos de pregunta posibles)

```json
{
  "block_type": "quiz_recall",
  "position": 4,
  "required": true,
  "questions": [
    {
      "question_type": "single_choice",
      "prompt": "...",
      "options": [
        {"text": "...", "is_correct": true, "explanation": "..."},
        {"text": "...", "is_correct": false, "explanation": "..."}
      ]
    }
  ]
}
```

Los otros 5 tipos (`multiple_choice`, `true_false`, `ordering`, `matching`,
`fill_blank`) tienen shapes distintos — ver
`apps/backend/src/hg/modules/learning_units/schemas.py`
(`QuizQuestionCreateUnion`) para el detalle exacto de cada uno, o los
ejemplos en `tests/test_learning_units_admin.py`.

### Reflexión (alternativa al quiz para el requisito #4)

```json
{
  "block_type": "reflection_write",
  "position": 5,
  "required": true,
  "prompt": "...",
  "min_chars": 30,
  "max_chars": 500
}
```

## 3. Reordenar bloques (opcional)

```json
POST /admin/learning-units/{unit_id}/blocks/reorder
{ "block_ids": ["<id1>", "<id2>", "..."] }
```

Tiene que incluir **exactamente** todos los bloques de la unit, sin repetir.

## 4. Publicar

```bash
curl -X POST localhost:8000/api/v1/admin/learning-units/{unit_id}/publish \
  -H "Authorization: Bearer $TOKEN"
```

`200` con `published_at` seteado si pasa las 5 reglas del paso 2. `422` con
`{"errors": [...]}` listando **todas** las reglas que fallan (no solo la
primera) si no.

## 5. Verificar como usuario normal

```bash
curl localhost:8000/api/v1/modulos/{slug} -H "Authorization: Bearer $USER_TOKEN"
```

Debería devolver 200 con los bloques. Si no aparece en `/modulos/feed`, es
esperado si el usuario no tiene enrollment activo en el pilar de la unit —
el feed cae a un pick random entre units publicadas si no hay match.

## Editar contenido después de publicar

- `PATCH /admin/learning-units/{unit_id}` — campos de la unit (título, nivel, etc.)
- `PATCH /admin/blocks/{block_type}/{block_id}` — contenido de un bloque
  (**usa el PK interno del template**, no el `id` de `unit_blocks` — mirá el
  detalle de la unit vía `PATCH .../learning-units/{unit_id}` con body `{}`
  para ver ambos IDs si los perdiste)
- `DELETE /admin/blocks/{block_id}` — usa el `id` de `unit_blocks` (el que
  sí devuelve cualquier `BlockRead`)
- `POST /admin/learning-units/{unit_id}/unpublish` antes de poder
  `DELETE /admin/learning-units/{unit_id}` (409 si sigue publicada)

## Ver también

- `docs/api/learning_units.bruno/` — los mismos 15 pasos como colección
  Bruno corrible (login → CRUD → publish → consumo → completion).
- `apps/backend/src/hg/scripts/seed_learning_units.py` — 3 units de
  ejemplo completas (código real, no solo estos snippets) que pasan
  publish validation.
