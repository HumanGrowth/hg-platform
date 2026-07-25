# Prompt Claude Code · Admin Content Hub · Módulos + Perspectivas + Mentores

> **Modo recomendado:** `/effort high` con **Claude Opus 4.8**.
> Panel admin unificado para superuser con 3 secciones: Módulos (LU) · Perspectivas (Blog/Artículos/Cases/Whitepapers) · Mentores. **15 TASKs · ~28-36h · 1 PR grande** (o 2 sub-PRs backend/frontend si preferís).
> Base: `main` con LU + polish v3 mergeados.
> Rama: `feat/admin-content-hub`.

---

## ⚙️ Resume protocol

1. Releé este prompt.
2. Releé:
   - `HG/Docs/HG_Guia_Diseno_Modulos_Templates.md` (para reglas de LU)
   - `HG/1.Product/5. Videos Final Version/HG-P1-L1-001.json` (estructura LU)
3. `git status && git log --oneline -10 && cd apps/backend && uv run pytest 2>&1 | tail -5 && cd apps/frontend && pnpm typecheck 2>&1 | tail -5`
4. Reanudá desde el primer `[ ]`.

## 🧱 Reglas duras

- Un commit por TASK · prefijos `feat(admin): ...` · `chore(admin): ...`
- Editá ESTE archivo al avanzar
- **NO tocar assessment/motion**
- **`SuperadminGate` obligatorio** en TODOS los endpoints admin y pages `/admin/contenido/*`
- **Rich text editor:** confirmar Tiptap (~80KB) con Andrés antes de instalar · fallback markdown-editor sin deps nuevas
- **Sin RLS de contenido** (marketing público) · sí de audit (created_by_user_id)

## 🎯 Producto final

Al terminar:
- `/admin/contenido` hub con 3 cards: Módulos · Perspectivas · Mentores
- Cada sección con lista + editor + preview + publish workflow
- Consumer público consume las 3 sin cambios de API core (los endpoints ya existen o se agregan mínimo)
- Superadmin puede crear/editar/publicar todo desde un solo lugar

---

# FASE A · Backend (7 TASKs · ~10-14h)

## TASK admin-A-01 · Perspectivas schema + models · `[ ]`

Sigue lo definido en `claude-code_perspectivas_cms.md` (prompt anterior nunca ejecutado). Recuperar:

- Tabla `perspective_posts` + extensiones por content_type
- 4 content types: blog · article · business_case · whitepaper
- Migration Alembic
- SQLAlchemy models + pydantic schemas polimórficos

### Criterios
- [ ] Migration idempotente
- [ ] Models + schemas
- [ ] Commit: `feat(admin): perspective_posts schema + polymorphic models`

---

## TASK admin-A-02 · Perspectivas endpoints públicos + admin · `[ ]`

Sigue lo definido en el prompt de Perspectivas anterior:

- GET `/api/v1/perspectives` (list + filter + search + paginación)
- GET `/api/v1/perspectives/{slug}`
- POST/PATCH/DELETE `/api/v1/admin/perspectives` (superadmin)
- Publish/unpublish endpoints

### Criterios
- [ ] 7 endpoints funcionales
- [ ] SuperadminGate
- [ ] Tests unitarios
- [ ] Commit: `feat(admin): perspectives public + admin CRUD endpoints`

---

## TASK admin-A-03 · Mentores schema + models · `[ ]`

Nueva tabla `mentors`:

```sql
CREATE TABLE mentors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  title TEXT,                        -- ej "Fundadora · HumanGrowth"
  bio_markdown TEXT,                 -- markdown permitido
  avatar_url TEXT,
  hero_image_url TEXT,
  expertise TEXT[] DEFAULT '{}',    -- ej ["P1", "P3", "leadership"]
  linkedin_url TEXT,
  email TEXT,
  featured BOOL DEFAULT false,      -- destacado en Mi Ruta / MentorStrip marketing
  active BOOL DEFAULT true,         -- si está aceptando sesiones
  order_index INT DEFAULT 0,        -- para ordenar en lista
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_user_id UUID REFERENCES users(id)
);
CREATE INDEX ON mentors (active, featured, order_index);
```

**Nota:** los mentors se **linkean** a learning_units (que ya tiene `mentor_id`) — pero ese `mentor_id` hoy apunta a `users`. Decisión:

- **Opción A:** cambiar `learning_units.mentor_id` → FK a `mentors.id` (nueva tabla)
- **Opción B:** mantener `users.id` y `mentors` es tabla extra opcional (mentor puede o no tener perfil público)

Mi voto **Opción B** — separa "quién editó" (user) de "quién es el mentor público" (mentor). Un user puede no ser mentor. Un mentor no necesita ser user (ej. mentor externo sin cuenta).

Sumar campo `learning_units.public_mentor_id` (nullable, FK a `mentors.id`) para el display público.

### Criterios
- [ ] Migration `mentors` + `learning_units.public_mentor_id`
- [ ] SQLAlchemy model + pydantic schemas
- [ ] Commit: `feat(admin): mentors schema + link to learning_units`

---

## TASK admin-A-04 · Mentores endpoints · `[ ]`

- GET `/api/v1/mentors` (público · list activos con filter por expertise)
- GET `/api/v1/mentors/{slug}` (público · detalle)
- POST/PATCH/DELETE `/api/v1/admin/mentors` (superadmin)
- POST `/api/v1/admin/mentors/reorder` (superadmin · body: array de ids)

### Criterios
- [ ] Endpoints funcionales
- [ ] SuperadminGate en admin
- [ ] Test unitarios
- [ ] Commit: `feat(admin): mentors public + admin endpoints`

---

## TASK admin-A-05 · Wire LU con mentor público · `[ ]`

- Endpoint `GET /api/v1/modulos/{slug}` incluye `mentor_public: MentorRead | null` en response (si `learning_units.public_mentor_id` está seteado)
- Endpoint admin `PATCH /admin/learning-units/{id}` acepta `public_mentor_id`

### Criterios
- [ ] Response LU incluye mentor público
- [ ] Admin puede setear/desetear mentor público
- [ ] Commit: `feat(admin): wire learning_units with public mentors`

---

## TASK admin-A-06 · Seed mentores + 4 perspectivas ejemplo · `[ ]`

Script `apps/backend/scripts/seed_admin_content.py`:

- 2-3 mentores ejemplo (Jorge Araya + placeholders)
- 4 perspectivas ejemplo (1 por content_type) con markdown de ejemplo
- Idempotente

### Criterios
- [ ] Seed corre 2x sin duplicar
- [ ] Commit: `chore(admin): seed mentors + perspectives examples`

---

## TASK admin-A-07 · Tests backend + Bruno · `[ ]`

- Tests unitarios para cada endpoint
- Bruno collection en `docs/api/admin_content.bruno`
- Cobertura ≥80%

### Criterios
- [ ] Tests verdes
- [ ] Bruno con requests para 3 tipos de contenido
- [ ] Commit: `test(admin): backend tests + Bruno collection`

---

# FASE B · Frontend admin (8 TASKs · ~18-22h)

## TASK admin-B-01 · `/admin/contenido` hub landing · `[ ]`

Nueva ruta `apps/frontend/src/app/(admin)/admin/contenido/page.tsx`:

Cards grid 3 columnas (o 1 en mobile):
- **Módulos** (icon Sparkles) · "12 publicados · 3 draft" · link a `/admin/contenido/modulos`
- **Perspectivas** (icon FileText) · "4 publicados · 2 draft" · link a `/admin/contenido/perspectivas`
- **Mentores** (icon Users) · "3 activos · 1 inactivo" · link a `/admin/contenido/mentores`

Cada card muestra counts en vivo (fetch metadata endpoints). SuperadminGate wrapper.

### Criterios
- [ ] Hub con 3 cards y counts
- [ ] SuperadminGate + redirect si no autorizado
- [ ] Commit: `feat(admin): /admin/contenido hub landing`

---

## TASK admin-B-02 · Rich text editor decision + install · `[ ]`

**Decisión pendiente Andrés:**

- **A · Tiptap** (~80KB · rich text WYSIWYG) — mejor UX para coach no técnico
- **B · Textarea + markdown preview** (0 deps nuevas) — más simple, requiere que coach sepa markdown

Si Andrés confirma A, correr:
```bash
cd apps/frontend
pnpm add @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-highlight
```

Componente reusable:
`apps/frontend/src/components/admin/RichTextEditor.tsx` con toolbar (bold, italic, highlight, link, lists, blockquote).

**Fallback B:** `MarkdownEditor.tsx` = textarea + preview lado a lado con `react-markdown` (ya instalado).

### Criterios
- [ ] Decisión firmada
- [ ] Componente reusable
- [ ] Commit: `feat(admin): rich text editor (Tiptap or markdown fallback)`

---

## TASK admin-B-03 · `/admin/contenido/modulos` lista + editor · `[ ]`

- Lista todos los LU (draft + published) con filtros
- Botón "Nueva unit" → editor
- Editor:
  - Meta form (slug, title, pillar, level, competency, mentor público)
  - Sortable list de bloques (usar `@dnd-kit/sortable` que ya está)
  - Botón "Agregar bloque" → modal selector de template
  - Cada bloque tipo tiene su sub-editor (video → URL input + preview, text → rich text editor, quiz → constructor de preguntas con 6 tipos)
  - Botón "Publicar" ejecuta validaciones (§8 guía) + backend valida antes de publicar
- Preview "Ver como usuario" en modal

### Criterios
- [ ] CRUD modulos funcional desde UI
- [ ] Constructor de quiz para 6 tipos
- [ ] Preview en modal
- [ ] Commit: `feat(admin): modulos list + editor with block sortable + quiz builder`

---

## TASK admin-B-04 · `/admin/contenido/perspectivas` lista + editor · `[ ]`

- Lista con filtros por content_type
- Editor dinámico según content_type (campos comunes + específicos)
- Rich text para body
- Preview en modal

### Criterios
- [ ] CRUD perspectivas desde UI
- [ ] Editor dinámico por content_type
- [ ] Preview
- [ ] Commit: `feat(admin): perspectivas list + editor per content type`

---

## TASK admin-B-05 · `/admin/contenido/mentores` lista + editor · `[ ]`

- Lista con filtros active/inactive + featured
- Editor:
  - Avatar upload (o URL)
  - Bio con rich text
  - Expertise chip input (P1..P6 + custom tags)
  - Toggle featured + active
  - Reorder handle
- Preview "Ver como usuario" (card mentor pública)

### Criterios
- [ ] CRUD mentores desde UI
- [ ] Reorder con drag-and-drop
- [ ] Commit: `feat(admin): mentores list + editor + reorder`

---

## TASK admin-B-06 · Sidebar admin actualizado · `[ ]`

En `AdminSidebar` (o el equivalente), sumar sección "Contenido" con 3 sub-items:
- Módulos
- Perspectivas
- Mentores

Mantener secciones existentes (Organizaciones, Dashboard, etc).

### Criterios
- [ ] Sidebar admin con nueva sección
- [ ] Active state por sub-item
- [ ] Commit: `feat(admin): admin sidebar with contenido section`

---

## TASK admin-B-07 · Wire consumer con mentor público en LU · `[ ]`

En el player de módulos (`UnitStoriesPlayer` y `UnitBackToBackPlayer`):
- Si `unit.mentor_public` existe, mostrar en el header/footer del player:
  - Avatar + name + title
  - Link a `/mentores/{slug}` (nueva ruta pública opcional)
- Sin cambio si es null

En `MarketingRadar` u otros lugares donde aplique, wire mentor featured (para MentorStrip).

### Criterios
- [ ] Mentor público visible en unit player si aplica
- [ ] Sin regresión si no hay mentor
- [ ] Commit: `feat(admin): wire mentor público in unit player`

---

## TASK admin-B-08 · Tests + smoke + screenshots · `[ ]`

- Tests: 3 páginas admin renderizan · CRUD flows funcionales
- Smoke:
  - Login superadmin → `/admin/contenido` → crear módulo → agregar bloques → publicar → verificar en `/modulos`
  - Crear perspectiva blog → publicar → verificar en `/perspectivas`
  - Crear mentor + featured → verificar en MentorStrip o unit con `public_mentor_id`
- Screenshots:
  - `01-admin-contenido-hub.png`
  - `02-modulos-list.png`
  - `03-modulos-editor-blocks.png`
  - `04-modulos-quiz-builder.png`
  - `05-perspectivas-list.png`
  - `06-perspectivas-editor.png`
  - `07-mentores-list.png`
  - `08-mentores-editor.png`
  - `09-unit-with-mentor-public.png`

### Criterios
- [ ] Tests verdes
- [ ] 9 screenshots
- [ ] Smoke flows end-to-end OK
- [ ] Commit: `test(admin): tests + 9 screenshots + smoke flows`

---

# 🎯 Criterios globales

- [ ] 15 TASKs commiteadas
- [ ] 3 content types administrados desde `/admin/contenido`
- [ ] Editor rich text funcional
- [ ] Consumer público consume mentores + LU + perspectivas
- [ ] Tests + 9 screenshots
- [ ] PR contra `main`

# 📤 Entrega

- SHA + PR
- 9 screenshots
- Bruno collection actualizado
- Nota: cuáles endpoints nuevos vs previos
