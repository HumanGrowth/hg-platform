# Prompt Claude Code · Perspectivas CMS · Content Types dinámicos

> **Modo recomendado:** `/effort high` con **Claude Opus 4.8**.
> Convertir `/perspectivas` en un CMS de content types editable por superuser desde la app.
> **8 TASKs · ~14-18h** (backend + admin UI + wire frontend público).
> Base: `main` con PR web-v3 (addendum) mergeado — `/perspectivas` frontend prep listo.
> Puede correr **paralelo** al prompt web-v3 (backend vs frontend puro) sin conflictos, pero el wire frontend en Fase 3 requiere ambos.

---

## ⚙️ Resume protocol

1. Releé este prompt.
2. Releé `HG/Docs/HG_Propuesta_Learning_Units_v2.md` §5 (patrón de content types polimórfico).
3. `git status && git log --oneline -10 && cd apps/backend && uv run pytest 2>&1 | tail -10`
4. Reanudá desde el primer `[ ]`.

## 🧱 Reglas duras

- Un commit por TASK con prefijo `feat(perspectives): ...`
- Editá ESTE archivo al avanzar
- **NO tocar assessment / learning modules del backend**
- **NO instalar deps** salvo confirmación (Tiptap podría ser necesario para editor RT · confirmar antes)
- RLS por org NO aplica — Perspectivas es contenido **público de marketing**, sin tenant boundary
- **Solo superadmin puede crear/editar/eliminar** contenido (`SuperadminGate`)

## 🎯 Objetivo funcional

Permitir a un superuser HG editar desde `/admin/perspectivas`:
- **Blog posts** (título, slug, autor, pilar opcional, cover_image, body markdown, published_at)
- **Artículos** (mismo shape + `read_minutes_estimated`)
- **Business cases** (título, slug, org_client (redacted opcional), industry, challenge, solution, metrics_json, body markdown)
- **Whitepapers** (título, slug, pdf_url, cover_image, abstract, download_count, gated_email_required BOOL)

Consumer público en `/perspectivas` filtrable por content_type + pilar + búsqueda.

## 🧠 Decisiones firmadas Andrés

| # | Decisión |
|---|---|
| A | 4 content types: Blog / Artículo / Business Case / Whitepaper |
| B | Solo superuser puede CRUD desde `/admin/perspectivas` |
| C | Contenido público (sin RLS · sin tenant boundary) |
| D | Rich text editor con markdown + preview (Tiptap si permite `pnpm add`, sino textarea + parser markdown minimal) |
| E | Whitepapers gated (email opcional para descargar) — v2 · MVP: link directo al PDF |

---

# TASKS

## TASK perspectives-01 · Backend · schema polimórfico + alembic · `[ ]`

Nueva tabla base + tabla por content type.

### 1.1 · Schema

```sql
-- Cabecera común
CREATE TABLE perspective_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('blog', 'article', 'business_case', 'whitepaper')),
  title TEXT NOT NULL,
  subtitle TEXT,
  cover_image_url TEXT,
  pillar_code TEXT REFERENCES career_paths(code),   -- opcional
  author_name TEXT,
  author_avatar_url TEXT,
  tags TEXT[] DEFAULT '{}',
  body_markdown TEXT,          -- común para blog/article/business_case
  published_at TIMESTAMPTZ,    -- null = draft
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by_user_id UUID REFERENCES users(id)
);
CREATE INDEX ON perspective_posts (content_type, published_at DESC) WHERE published_at IS NOT NULL;
CREATE INDEX ON perspective_posts (pillar_code) WHERE pillar_code IS NOT NULL;

-- Extensiones por content_type
CREATE TABLE perspective_articles (
  post_id UUID PRIMARY KEY REFERENCES perspective_posts(id) ON DELETE CASCADE,
  read_minutes_estimated INT
);

CREATE TABLE perspective_business_cases (
  post_id UUID PRIMARY KEY REFERENCES perspective_posts(id) ON DELETE CASCADE,
  org_client_name TEXT,           -- puede ser "Empresa cliente" si redacted
  industry TEXT,
  challenge TEXT,
  solution TEXT,
  metrics JSONB DEFAULT '[]'      -- [{label, value, delta_pct}]
);

CREATE TABLE perspective_whitepapers (
  post_id UUID PRIMARY KEY REFERENCES perspective_posts(id) ON DELETE CASCADE,
  pdf_url TEXT NOT NULL,
  abstract TEXT NOT NULL,
  download_count INT DEFAULT 0,
  gated_email_required BOOL DEFAULT false
);
```

### 1.2 · Alembic migration

Generar migration `alembic/versions/XXX_perspective_posts.py`. Testear upgrade + downgrade local.

### Criterios
- [ ] Migration idempotente
- [ ] Constraints CHECK activos
- [ ] Indexes creados
- [ ] Commit: `feat(perspectives): schema polimórfico + alembic migration`

---

## TASK perspectives-02 · SQLAlchemy models + pydantic schemas · `[ ]`

`apps/backend/src/hg/modules/perspectives/models.py`:

```python
class PerspectivePost(Base):
    __tablename__ = "perspective_posts"
    id: Mapped[uuid.UUID] = mapped_column(...)
    slug: Mapped[str] = mapped_column(...)
    content_type: Mapped[str] = mapped_column(...)
    # ... resto de campos
    # relationships polimórficas via SQLAlchemy inheritance o joined loads

class PerspectiveArticle(Base):
    __tablename__ = "perspective_articles"
    post_id: Mapped[uuid.UUID] = ...
    read_minutes_estimated: Mapped[int | None] = ...

# ... y business_case, whitepaper
```

Pydantic schemas en `schemas.py`:

```python
class PerspectivePostRead(BaseModel):
    id: UUID
    slug: str
    content_type: Literal["blog", "article", "business_case", "whitepaper"]
    title: str
    subtitle: str | None
    # ... campos comunes
    extension: PerspectiveArticleExt | PerspectiveBusinessCaseExt | PerspectiveWhitepaperExt | None
```

### Criterios
- [ ] Models + schemas listos
- [ ] Discriminator polimórfico funcional
- [ ] Commit: `feat(perspectives): SQLAlchemy models + pydantic schemas`

---

## TASK perspectives-03 · Backend · endpoints públicos (lectura) · `[ ]`

Endpoints sin auth (contenido público):

```
GET  /api/v1/perspectives?content_type=blog&pillar=P1&q=liderazgo&offset=0&limit=20
GET  /api/v1/perspectives/{slug}
```

Filtros:
- `content_type` (opcional)
- `pillar` (opcional)
- `q` (búsqueda texto sobre title + subtitle + tags)
- Paginación offset/limit (default 20, max 100)

Solo devuelve `published_at IS NOT NULL AND published_at <= now()`.

### Criterios
- [ ] Endpoint feed + detail sin auth
- [ ] Filtros funcionan
- [ ] Paginación
- [ ] Tests unitarios
- [ ] Commit: `feat(perspectives): public read endpoints`

---

## TASK perspectives-04 · Backend · endpoints admin (CRUD) · `[ ]`

Endpoints protegidos con `SuperadminGate`:

```
POST   /api/v1/admin/perspectives                 crear draft (content_type + campos comunes + extension)
PATCH  /api/v1/admin/perspectives/{id}            editar
POST   /api/v1/admin/perspectives/{id}/publish    setea published_at = now()
POST   /api/v1/admin/perspectives/{id}/unpublish  setea published_at = null
DELETE /api/v1/admin/perspectives/{id}            hard delete (soft delete v2)
GET    /api/v1/admin/perspectives                 lista TODOS incluidos drafts
GET    /api/v1/admin/perspectives/{id}            detail admin
```

Validaciones al publicar:
- slug único
- title no vacío
- content_type válido
- Si `whitepaper`: `pdf_url` requerido
- Si `business_case`: `challenge` y `solution` requeridos

### Criterios
- [ ] 7 endpoints admin funcionales
- [ ] `SuperadminGate` bloquea a no-superadmin (401/403)
- [ ] Validaciones publish
- [ ] Tests unitarios cobertura
- [ ] Commit: `feat(perspectives): admin CRUD endpoints + superadmin gate`

---

## TASK perspectives-05 · Frontend admin · `/admin/perspectives` lista + editor · `[ ]`

### 5.1 · Lista `/admin/perspectives/page.tsx`

Tabla con:
- Columnas: Título, Content type (badge), Pilar, Status (draft/published), Última edición, Acciones (editar, publicar, eliminar)
- Filtros: content type + status
- Botón "Nueva perspectiva" → modal con selector de content type → redirect a `/admin/perspectives/nuevo?type=blog`

### 5.2 · Editor `/admin/perspectives/[id]/page.tsx`

Form dinámico por content_type:
- Campos comunes: title, subtitle, slug (auto-generado editable), cover_image_url, pillar_code (dropdown 6 pilares + "sin pilar"), author_name, author_avatar_url, tags (chip input)
- **Body markdown editor:** Textarea con preview lado a lado usando `react-markdown` o similar
  - **Si Andrés autoriza:** `@tiptap/react` para editor rich-text con toolbar (bold, italic, headings, links, listas, image)
  - **Fallback sin nuevas deps:** textarea + preview markdown (Marked o similar ya instalado)
- Campos específicos por type (renderizado condicional):
  - `article`: read_minutes_estimated (input number)
  - `business_case`: org_client_name, industry, challenge, solution, metrics (JSON editor)
  - `whitepaper`: pdf_url (URL input), abstract (textarea), gated_email_required (checkbox)

Botones:
- Guardar draft
- Publicar (llama `/publish`)
- Preview (opens new tab `/perspectivas/{slug}?preview=true`)

### 5.3 · Sidebar en /admin

Nuevo item "Perspectivas" en el admin sidebar (`components/admin/AdminSidebar.tsx` o donde esté).

### Criterios
- [ ] Lista con filtros + acciones
- [ ] Editor dinámico por content type
- [ ] Preview funcional
- [ ] `SuperadminGate` en las rutas admin
- [ ] Commit: `feat(perspectives): admin UI · lista + editor`

---

## TASK perspectives-06 · Frontend público · `/perspectivas` wire · `[ ]`

Reemplazar el empty state de la TASK web-v3-11 con data real.

### 6.1 · `/perspectivas/page.tsx`

Consume `GET /api/v1/perspectives`:

- Hero (ya existente)
- Filter chips por content type (Blog / Artículos / Casos / Whitepapers) — filtra client-side + reset a través de search params
- Grid de cards responsive:
  - Blog/Article: cover + type badge + title + author + date + preview_lines
  - Business case: cover + "CASE" badge + title + industry + challenge preview + "Ver caso"
  - Whitepaper: cover + "WHITEPAPER" badge + title + abstract + "Descargar PDF"
- Paginación "Cargar más" (offset + limit=20)
- Empty state si `count === 0`

### 6.2 · `/perspectivas/[slug]/page.tsx`

Detalle por slug. Consume `GET /api/v1/perspectives/{slug}`. Renderiza según content_type:
- Blog/Article: hero + author + markdown body renderizado + pilar badge
- Business case: hero + industry + challenge → solution → metrics visuales
- Whitepaper: hero + abstract + botón descargar (redirect a pdf_url)

### 6.3 · SEO metadata dinámica

`generateMetadata` en cada page con title, description, og_image usando datos del post.

### Criterios
- [ ] Feed público con filter + paginación
- [ ] Detail por slug funcional
- [ ] 4 content types con renders distintos
- [ ] SEO metadata dinámica
- [ ] Commit: `feat(perspectives): public /perspectivas + [slug] fully wired`

---

## TASK perspectives-07 · Seed data · 4 posts uno por type · `[ ]`

Script `apps/backend/scripts/seed_perspectives.py`:

```python
# 1 Blog
# 1 Article
# 1 Business case
# 1 Whitepaper (pdf_url puede apuntar a un PDF de ejemplo en R2 o placeholder)
```

Copy real curado por Andrés post-merge — poner TODO en el seed.

### Criterios
- [ ] 4 posts publicados de ejemplo
- [ ] Idempotente
- [ ] Commit: `chore(perspectives): seed 4 example posts`

---

## TASK perspectives-08 · Tests + smoke + screenshots · `[ ]`

- Tests unitarios endpoints admin + público
- Smoke: login superadmin → `/admin/perspectives` → crear blog → publicar → ver en `/perspectivas`
- Screenshots:
  - `01-admin-lista.png`
  - `02-admin-editor-blog.png`
  - `03-admin-editor-business-case.png`
  - `04-publico-feed-4-types.png`
  - `05-publico-detail-blog.png`
  - `06-publico-detail-whitepaper.png`

### Criterios
- [ ] Cobertura backend + frontend
- [ ] 6 screenshots
- [ ] Commit: `test(perspectives): full coverage + screenshots`

---

# 🎯 Criterios globales

- [ ] 4 content types operativos backend + admin + público
- [ ] SuperadminGate en admin
- [ ] Sin RLS (público)
- [ ] Editor rich-text funcional (Tiptap o markdown fallback)
- [ ] Seed 4 posts
- [ ] Tests + 6 screenshots
- [ ] PR contra `main`

# 📤 Entrega

- SHA + PR
- 6 screenshots
- Documentar en el PR: cuál rich-text editor final (Tiptap o fallback)

---

# 🔴 Fuera de scope · v2

- Comments/reactions públicos
- Newsletter subscription desde whitepaper gated
- Analytics de reads por post
- Soft delete + revision history
- Sharing por LinkedIn/WhatsApp con card generada

Todo defer post-MVP.

---

# Status por TASK

| ID | Subject | Status |
|---|---|---|
| perspectives-01 | Schema + alembic | `[ ]` |
| perspectives-02 | Models + schemas | `[ ]` |
| perspectives-03 | Endpoints públicos | `[ ]` |
| perspectives-04 | Endpoints admin | `[ ]` |
| perspectives-05 | Admin UI · lista + editor | `[ ]` |
| perspectives-06 | Público wire | `[ ]` |
| perspectives-07 | Seed 4 posts | `[ ]` |
| perspectives-08 | Tests + screenshots | `[ ]` |
