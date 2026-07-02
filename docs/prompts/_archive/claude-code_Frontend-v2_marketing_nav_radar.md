# Prompt para Claude Code · Frontend v2 (refactor marketing + nav UX + Radar)

> **Modo recomendado:** `/effort high` con **Claude Opus 4.8**.
> Refactor mayor del frontend. ~6-8h secuencial. 10 TASKs.

---

## ⚙️ Resume protocol

Si la sesión se compacta o reinicia:

1. Releé este prompt entero (`docs/prompts/claude-code_Frontend-v2_marketing_nav_radar.md`).
2. Verificá estado:
   ```bash
   git status && git log --oneline -10
   cd apps/frontend && pnpm typecheck 2>&1 | tail -10
   make test-backend 2>&1 | tail -5
   ```
3. Releé "## 📌 Estado al iniciar" abajo.
4. Buscá TASKs `🟧 IN PROGRESS` y reanudá.

## 🧱 Reglas duras

- **Un commit por TASK** con prefijo `feat(FE-v2-XX): ...`. Sub-commits intermedios `wip(FE-v2-XX): ...` cada >25 min.
- **Editá ESTE archivo al avanzar** (status + criterios tildados).
- **No avances** si la TASK actual no está `✅ DONE`.
- **TASKs en orden estricto**: 01 → 02 → 03 ... cada una depende de la anterior.
- **No tocar lógica de assessment** — onboarding queda como shells visuales. El motor B2-02/B2-03 se hace aparte cuando los coaches firmen.

## 📌 Estado al iniciar

- `main` en commit `ef46540` (Sprint A cerrado, PRs #1 y #2 mergeados).
- Backend prod en `api.humangrowth.io` (Railway · `hg_app` con RLS).
- Frontend prod en `app.humangrowth.io` (Vercel).
- Frontend Next.js 14 actual: 6 páginas funcionales (`/login`, `/accept-invite`, `/home`, `/library`, `/profile`, `/admin/orgs`) usando DS beta (Anton + Manrope + cream + orange #FF4500).
- Tests: backend 34/34 · frontend 7/7.

## 🎨 Paleta v1 marketing (confirmada por Andrés, Jun 15)

```
Neutrales / foundation (6):
  #1A1A1A  #2C3E50  #6B7061  #8E8E8E  #FFFFFF  #FAF3E8

Paleta marca (7):
  #F0EDE6  #C8A76E  #2A2826  #4A7A54  #E8530A  #E8A030  #A8C4A0
```

**Fonts:**
- Display: **Anton** (primary) → **Poppins** (fallback) → system-ui
- Body: **Manrope** (primary) → **Lato** (fallback) → system-ui
- Serif: Instrument Serif (sin cambio)
- Mono: JetBrains Mono (sin cambio)

## 📐 Decisiones UX/UI vigentes (de `HG/Docs/HG_Decisiones_Diseno_UXUI_v1.docx`)

- **2 productos · 1 base de datos**: A (colaborador) y B (RRHH).
- **4 destinos de nav (Producto A)**: Inicio, Mi Ruta, Mi Radar, Perfil. RRHH es toggle en header solo para superadmin.
- **Sidebar colapsable desktop · bottom nav mobile** (4 ítems máx en mobile).
- **Coach AI = mensajes contextuales** (NO chat) en MVP.
- **Onboarding cinematográfico**: 5-6 pantallas con escenarios situacionales. **En este prompt solo armamos shells visuales** — la lógica del scoring es separada.
- **Personalización sin imposición**: recomendación visible pero usuario elige.
- **Radar = elemento visual diferenciador**, aparece en 3 momentos (vacío→llenándose · mini siempre · completo interactivo).

---

# TASKS

## TASK FE-v2-01 · Swap de tokens · nueva paleta + fonts · `[x]`

### 1.1 · Actualizar `apps/frontend/tailwind.config.ts`

Reemplazar la paleta del DS beta por la paleta v1 marketing. Mantener semántica de pilares:

```ts
colors: {
  // Foundation (neutrales)
  ink: {
    900: '#1A1A1A',     // texto principal
    800: '#2A2826',     // texto profundo / warm ink
  },
  slate: {
    900: '#2C3E50',     // azul-gris profundo (alternativo)
  },
  warm: {
    600: '#6B7061',     // gris cálido
    500: '#8E8E8E',     // gris medio
  },
  cream: {
    50: '#FFFFFF',      // blanco puro
    100: '#FAF3E8',     // cream base
    200: '#F0EDE6',     // cream claro
  },
  // Paleta marca
  gold: {
    DEFAULT: '#C8A76E', // dorado caqui (acentos calidad/logro)
  },
  forest: {
    DEFAULT: '#4A7A54', // verde bosque (crecimiento)
  },
  orange: {
    DEFAULT: '#E8530A', // CTA principal
    50: '#FFF1E8',      // tints derivados
    100: '#FFD9C2',
    600: '#C8470A',     // hover (-10%)
    700: '#A03B08',     // press (-20%)
  },
  amber: {
    DEFAULT: '#E8A030', // ámbar (warning, badges)
  },
  sage: {
    DEFAULT: '#A8C4A0', // verde salvia (acentos suaves, success ligero)
  },
  // Semánticos
  success: { DEFAULT: '#4A7A54', bg: '#E6F0E8' },
  warning: { DEFAULT: '#E8A030', bg: '#FBE9CC' },
  danger:  { DEFAULT: '#B83A1A', bg: '#FADAD2' },
  info:    { DEFAULT: '#2C3E50', bg: '#DCE3EB' },
  // Pilares (alineados a la lógica del Marco Teórico)
  pillar: {
    p1: '#E8530A',  // Carrera (orange)
    p2: '#C8A76E',  // Propósito (gold)
    p3: '#4A7A54',  // Relaciones (forest)
    p4: '#A8C4A0',  // Salud (sage)
    p5: '#2C3E50',  // Paz interior (slate)
    p6: '#6B7061',  // Estabilidad (warm)
  },
},
fontFamily: {
  display: ['Anton', 'Poppins', 'Bebas Neue', 'Impact', 'system-ui', 'sans-serif'],
  sans: ['Manrope', 'Lato', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
  serif: ['Instrument Serif', 'Source Serif 4', 'Georgia', 'serif'],
  mono: ['JetBrains Mono', 'ui-monospace', 'SF Mono', 'monospace'],
},
```

Mantener el resto (spacing, borderRadius sharp, shadows warm-tinted, easings).

### 1.2 · Actualizar `apps/frontend/src/app/globals.css`

Sobrescribir el bloque `:root` con las CSS variables nuevas. Cream 100 (`#FAF3E8`) es el `--bg` default. Ink 900 (`#1A1A1A`) es el `--fg`. Border tertiario calculado del ink en alpha bajo.

Eliminar las variables `--orange-*` viejas (#FF4500) que ya no aplican.

### 1.3 · Cargar fonts en `apps/frontend/src/app/layout.tsx`

```ts
import { Anton, Manrope, Poppins, Lato, Instrument_Serif, JetBrains_Mono } from "next/font/google";

const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-display-1" });
const manrope = Manrope({ subsets: ["latin"], weight: ["400","500","600","700"], variable: "--font-body-1" });
const poppins = Poppins({ subsets: ["latin"], weight: ["400","500","600"], variable: "--font-display-2" });
const lato = Lato({ subsets: ["latin"], weight: ["400","700"], variable: "--font-body-2" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal","italic"], variable: "--font-serif" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400","500"], variable: "--font-mono" });
```

Aplicar las 6 variables al `<html>`. En CSS, la cadena de fallback `Anton, Poppins, ...` se activa sola — si Anton falla, Next.js cae a Poppins, después a system-ui.

### 1.4 · Verificar `/_kit` con la paleta nueva

Smoke test: `pnpm dev` → `localhost:3000/_kit` debe mostrar todos los primitives con los colores nuevos. **NO debe quedar ni un `#FF4500` ni `#FDF5E6` en el código** (verificar con `grep -r "FF4500\|FDF5E6" apps/frontend/src`).

**Criterios:**
- [ ] `tailwind.config.ts` con nueva paleta + fallback chains
- [ ] `globals.css` con `:root` actualizado
- [ ] 6 fonts cargadas via `next/font`
- [ ] `_kit` página renderiza con paleta nueva
- [ ] `grep -r "FF4500\|FDF5E6" apps/frontend/src` → cero matches
- [ ] Commit: `feat(FE-v2-01): swap to marketing palette v1 + Anton/Manrope primary fonts`

---

## TASK FE-v2-02 · Port assets + i18n stub · `[ ]`

### 2.1 · Copiar assets del lovable

```bash
mkdir -p apps/frontend/public/marketing/{mentors,illustrations}
cp ../../Docs/humangrowth-project/src/assets/logo-color.svg apps/frontend/public/marketing/logo-color.svg
cp ../../Docs/humangrowth-project/src/assets/logo-white.svg apps/frontend/public/marketing/logo-white.svg
cp ../../Docs/humangrowth-project/src/assets/mentor-andres.jpg apps/frontend/public/marketing/mentors/andres.jpg
cp ../../Docs/humangrowth-project/src/assets/mentor-jorge.jpg apps/frontend/public/marketing/mentors/jorge.jpg
cp ../../Docs/humangrowth-project/src/assets/mentor-karina.jpg apps/frontend/public/marketing/mentors/karina.jpg
```

### 2.2 · i18n stub liviano

El lovable usa `react-i18next` (10MB+ de deps). **No portamos esa lib** — armamos un stub simple con un dict ES/EN:

`apps/frontend/src/lib/i18n.ts`:

```ts
type Lang = 'es' | 'en';
type Dict = Record<string, Record<Lang, string>>;

export const dict: Dict = {
  // Nav
  'nav.paths': { es: 'Rutas', en: 'Paths' },
  'nav.mentorships': { es: 'Mentorías', en: 'Mentorships' },
  'nav.forTeams': { es: 'Para equipos', en: 'For teams' },
  'nav.pricing': { es: 'Precios', en: 'Pricing' },
  'nav.login': { es: 'Iniciar sesión', en: 'Log in' },
  'nav.conversemos': { es: 'Conversemos', en: 'Let\'s talk' },
  // Hero
  'hero.eyebrow': { es: 'Plataforma de crecimiento profesional holístico', en: 'Holistic professional growth platform' },
  'hero.titleLine1': { es: 'Crecé', en: 'Grow' },
  'hero.titleLine2': { es: 'integralmente', en: 'integrally' },
  // ... (completar con los strings de los 9 componentes)
};

export function t(key: string, lang: Lang = 'es'): string {
  return dict[key]?.[lang] ?? key;
}
```

Por simplicidad, **arrancar en español hardcodeado** (la mayoría del target HG es CR/LATAM). El switcher EN/ES se puede agregar después con cookie + middleware.

### 2.3 · Extraer los strings de los 9 componentes lovable

Revisar `HG/Docs/humangrowth-project/src/components/marketing/*.tsx` y los archivos `i18n/locales/{es,en}.json` si existen. Completar el dict.

**Criterios:**
- [ ] 5 assets copiados a `public/marketing/`
- [ ] `lib/i18n.ts` con dict completo de los componentes a portar
- [ ] Commit: `feat(FE-v2-02): port marketing assets + minimal i18n stub`

---

## TASK FE-v2-03 · Marketing route group + Nav + Hero · `[ ]`

### 3.1 · Crear route group `(marketing)`

```
apps/frontend/src/app/
├── (auth)/        ← existente
├── (app)/         ← existente
├── (admin)/       ← existente
└── (marketing)/   ← NUEVO
    ├── layout.tsx           ← Nav + Footer comunes
    ├── page.tsx             ← landing /
    ├── for-teams/page.tsx
    ├── paths/page.tsx
    ├── pricing/page.tsx
    └── contacto/page.tsx    ← NUEVO (no estaba en lovable)
```

⚠️ La ruta `/` actualmente redirige a `/home` (en `apps/frontend/src/app/page.tsx`). Hay que **cambiar esa lógica**: si hay sesión → `/home`, si no → landing público (`(marketing)/page.tsx`).

Lo más limpio: mover el redirect actual a un middleware o a un `<SessionGate>` que decide. La página `/` queda como landing público con el Nav que tiene el CTA "Conversemos" → `/login`.

### 3.2 · Portar `Nav.tsx`

Adaptar `HG/Docs/humangrowth-project/src/components/marketing/Nav.tsx`:

- `import { Link } from "@tanstack/react-router"` → `import Link from "next/link"`
- `import logo from "@/assets/logo-color.svg"` → `import Image from "next/image"` + ruta `/marketing/logo-color.svg`
- `useTranslation()` → `t(key, 'es')` del stub
- Cambiar el botón principal "Get started" → **"Conversemos"** con `href="/login"`
- Agregar link secundario "Solicitar unirse" → `href="/contacto"`

Mantener: scroll behavior con glass effect, lang switcher (puede quedar oculto si EN no está traducido).

### 3.3 · Portar `Hero.tsx`

Mismo patrón: TanStack → Next.js Link, asset path, `t()` stub. **Botones**:
- Primary `ctaPrimary` → "Conversemos" → `/login`
- Secondary `ctaSecondary` → "Ver rutas" → `/paths`

Verificar que el `<h1 className="display">` y los `text-warm-900`/`text-warm-700` se vean correctos con la nueva paleta — probablemente hay que cambiar `warm-900` a `ink-900` (la paleta nueva no tiene la escala completa warm 100-900).

### 3.4 · Layout del grupo (marketing)

`(marketing)/layout.tsx`:

```tsx
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main>{children}</main>
      <Footer />
    </>
  );
}
```

Smoke: `localhost:3000/` debe mostrar Hero + Nav con los nuevos colores. Click "Conversemos" → debe ir a `/login`.

**Criterios:**
- [ ] `(marketing)` route group con 5 rutas
- [ ] Nav + Hero portados, sin TanStack, sin react-i18next
- [ ] "Conversemos" enlaza a `/login`
- [ ] "Solicitar unirse" enlaza a `/contacto`
- [ ] `/` muestra landing público si no hay sesión, redirige a `/home` si hay
- [ ] Commit: `feat(FE-v2-03): marketing route group + Nav + Hero ports`

---

## TASK FE-v2-04 · LogoCloud + Features + PathCard · `[ ]`

Portar los 3 componentes del lovable con la misma metodología. Adaptaciones puntuales:

- **LogoCloud**: lista de logos placeholder por ahora. Andrés agrega logos de partners reales después.
- **Features**: 3-4 cards de las "killer features" del producto. Los iconos lucide se mantienen.
- **PathCard** + **FeaturedPaths**: 3 paths de ejemplo. Los datos pueden ir hardcoded por ahora — más adelante se conectan al endpoint `/api/v1/marketing/featured-paths`.

Página `/paths`:
- Hero corto + grid completo de los 12 paths del catálogo (sugeridos en DEC-02 de la sesión previa).
- Filtros por pilar + por nivel de carrera.

**Criterios:**
- [ ] 3 componentes portados
- [ ] `/paths` muestra grid completo con filtros
- [ ] Commit: `feat(FE-v2-04): LogoCloud + Features + PathCard components`

---

## TASK FE-v2-05 · MentorStrip + Quote + PricingTable + Footer · `[ ]`

Portar los 4 restantes:

- **MentorStrip**: usa las 3 fotos de mentores (Andrés, Jorge, Karina). Layout horizontal con avatares + nombre + rol corto.
- **Quote**: testimonial estático por ahora. Tipografía `serif-italic`.
- **PricingTable**: 2-3 tiers (Starter / Pro / Enterprise). Botón CTA en cada uno → `/contacto` (todos contactan, no hay self-service de pago).
- **Footer**: logo + links secundarios + copyright + redes sociales.

Páginas `/for-teams` y `/pricing`:
- `/for-teams`: hero específico B2B + value props + CTA "Conversemos" → `/contacto`
- `/pricing`: PricingTable + FAQ

**Criterios:**
- [ ] 4 componentes portados
- [ ] `/for-teams` y `/pricing` funcionales
- [ ] Commit: `feat(FE-v2-05): MentorStrip + Quote + PricingTable + Footer + B2B/pricing pages`

---

## TASK FE-v2-06 · Página `/contacto` + endpoint backend · `[ ]`

### 6.1 · Backend: endpoint público de inquiry

`apps/backend/src/hg/modules/admin/contact_router.py` (o donde tenga sentido):

```python
@router.post("/contact/inquiry", status_code=201)
def submit_inquiry(
    payload: ContactInquiryIn,  # { name, email, company, role, message, source }
    db: Session = Depends(get_db_as_superadmin),
):
    inquiry = ContactInquiry(
        name=payload.name,
        email=payload.email,
        company=payload.company,
        role=payload.role,
        message=payload.message,
        source=payload.source,
        created_at=datetime.now(UTC),
    )
    db.add(inquiry)
    db.commit()
    # Email stub a Jorge + Roberto (log a stdout por ahora)
    log.info("contact.inquiry", extra={"name": payload.name, "email": payload.email, "company": payload.company})
    # Cuando Resend esté wired (B3-05), enviar email real
    return {"ok": True}
```

Nueva tabla `contact_inquiries` (sin `org_id` — son leads, no usuarios todavía):

```python
class ContactInquiry(Base):
    __tablename__ = "contact_inquiries"
    id: Mapped[uuid.UUID] = mapped_column(...)
    name: Mapped[str]
    email: Mapped[str]
    company: Mapped[str | None]
    role: Mapped[str | None]
    message: Mapped[str | None]
    source: Mapped[str | None]   # "landing-hero", "footer", "pricing-cta", etc.
    contacted_at: Mapped[datetime | None]   # cuando un admin marca como contactado
    created_at: Mapped[datetime]
```

Migración Alembic: `B1-13 add contact inquiries`.

Endpoint `GET /admin/contact/inquiries` solo para superadmin (RBAC) — lista leads.

### 6.2 · Frontend: página `/contacto`

`(marketing)/contacto/page.tsx`:

- Hero corto: "Conversemos sobre cómo Human Growth puede acelerar el crecimiento de tu equipo"
- Form con react-hook-form + zod:
  - Nombre (required)
  - Email (required, validado)
  - Empresa (required)
  - Rol (opcional, dropdown: RRHH, Líder, IT, Otro)
  - Mensaje (opcional, textarea)
- POST a `/api/v1/contact/inquiry` (sin auth, público)
- Estado de éxito: mensaje cálido "Gracias [nombre], te respondemos en menos de 24h" + link a `/paths`
- Estado de error: toast genérico

**Criterios:**
- [ ] Migración `B1-13` aplicada
- [ ] Endpoint `POST /contact/inquiry` funciona sin auth, tests ≥2
- [ ] Endpoint `GET /admin/contact/inquiries` solo superadmin, tests ≥1
- [ ] Página `/contacto` con form validado
- [ ] Submit funciona, se ve la fila en DB tras enviar
- [ ] Logs muestran el inquiry
- [ ] Commit: `feat(FE-v2-06): contact inquiry endpoint + landing /contacto page`

---

## TASK FE-v2-07 · Refactor nav app · SideNav desktop + BottomNav mobile · `[ ]`

### 7.1 · Componentes nuevos en `apps/frontend/src/components/nav/`

- `SideNav.tsx`: sidebar colapsable (expanded 240px / collapsed 64px). Toggle con icon button. Persistir estado en localStorage.
- `BottomNav.tsx`: bottom bar con 4 destinos (Inicio, Mi Ruta, Mi Radar, Perfil). Solo visible <768px.
- `TopBar.tsx`: bar superior con logo, search opcional, avatar dropdown, **toggle Admin** (solo si `current_user.role === 'superadmin'` o `admin`).

### 7.2 · Reemplazar el TopNav actual

En `(app)/layout.tsx`:

```tsx
<div className="flex h-screen">
  <SideNav className="hidden md:block" />
  <div className="flex-1 flex flex-col min-w-0">
    <TopBar />
    <main className="flex-1 overflow-auto">{children}</main>
    <BottomNav className="md:hidden" />
  </div>
</div>
```

### 7.3 · Mapeo de los 4 destinos

| Destino | Ruta | Icono lucide | Notas |
|---|---|---|---|
| Inicio | `/home` | `Home` | Dashboard |
| Mi Ruta | `/path` | `Route` | 6 pilares como carriles |
| Mi Radar | `/radar` | `Hexagon` | Radar completo interactivo |
| Perfil | `/profile` | `User` | Datos + logros + config |

Nota: `/library` actual se mueve dentro de `/path` (Mi Ruta) como sub-vista, ya no es destino principal.

### 7.4 · Toggle Admin

Cuando `current_user.role === 'superadmin'`:
- Botón en TopBar derecha "Modo admin ⇄"
- Click → redirige a `/admin/orgs`
- En modo admin, botón "Volver a colaborador" → vuelve a `/home`

**Criterios:**
- [ ] 3 componentes de nav nuevos
- [ ] `(app)/layout.tsx` usa SideNav + TopBar + BottomNav
- [ ] Sidebar colapsable persiste en localStorage
- [ ] Bottom nav muestra exactamente 4 ítems en mobile
- [ ] Admin toggle funciona para superadmin
- [ ] Routes `/path` y `/radar` creadas (stubs con título — se llenan en tasks siguientes)
- [ ] Commit: `feat(FE-v2-07): app nav refactor (SideNav + BottomNav + 4 destinations)`

---

## TASK FE-v2-08 · Componente Radar en 3 estados · `[ ]`

### 8.1 · Componente base `apps/frontend/src/components/radar/Radar.tsx`

Usar **Recharts RadarChart** (ya en deps). 6 ejes (P1-P6) con colores del nuevo `pillar.*`.

Props:

```ts
interface RadarProps {
  values: { P1?: number; P2?: number; P3?: number; P4?: number; P5?: number; P6?: number };
  state: 'empty' | 'filling' | 'complete';
  size?: 'mini' | 'medium' | 'large';
  interactive?: boolean;  // hover/click para detalle por pilar
  animateOnMount?: boolean;
}
```

### 8.2 · Tres estados visuales

- **`empty`**: solo los 6 ejes vacíos, etiquetas P1-P6 visibles. Animación sutil de "respirando" (opacity oscillation).
- **`filling`**: animación de Framer Motion (o CSS animation) que rellena el polígono de a un eje por vez en ~6 segundos. Usar `useEffect` con `setInterval` para incrementar `progress` de 0 a 1.
- **`complete`**: polígono lleno con valores reales. Si `interactive`, hover muestra tooltip con estado del pilar; click navega a `/radar/[pillarCode]`.

### 8.3 · Mini-Radar

`MiniRadar.tsx`: versión 120×120px sin etiquetas, solo el polígono. Para usar en sidebar y en Home.

### 8.4 · Página `/radar`

`(app)/radar/page.tsx`: Radar grande interactivo + lista lateral de los 6 pilares con estado actual y CTA "Ver detalle" → `/radar/[pillarCode]`.

Si el user no ha completado el onboarding (no tiene `user_pillar_states`), mostrar Radar `empty` con CTA "Hacer assessment" → `/onboarding`.

### 8.5 · Tests

`Radar.test.tsx`:
- Renderiza con state=empty sin valores
- Renderiza con state=complete y muestra valores correctos
- Mini-Radar tiene tamaño 120×120

**Criterios:**
- [ ] Radar component con 3 estados
- [ ] MiniRadar component
- [ ] `/radar` muestra Radar grande + lista de pilares
- [ ] Animación `filling` se ve fluida (no laggy)
- [ ] Tests Vitest pasando
- [ ] Commit: `feat(FE-v2-08): Radar component (3 states) + MiniRadar + /radar page`

---

## TASK FE-v2-09 · Onboarding shells (sin lógica) · `[ ]`

### 9.1 · Route nueva `apps/frontend/src/app/(onboarding)/`

Route group **separado** (sin Nav ni sidebar — onboarding es full-screen cinematográfico):

```
(onboarding)/
├── layout.tsx              ← layout cinematográfico (cream bg, sin chrome)
├── welcome/page.tsx        ← pantalla 1: bienvenida personalizada
├── scenario/[index]/page.tsx  ← pantallas 2-7: 6 escenarios situacionales
└── result/page.tsx         ← pantalla 8: Radar generado + path recomendado
```

### 9.2 · Pantalla `/onboarding/welcome`

- Hero con logo + título "Hola [first_name], vamos a descubrir tu punto de partida"
- 3 bullets cortos: "6 situaciones reales · 3 minutos · sin respuestas correctas"
- CTA "Empezar" → `/onboarding/scenario/1`

### 9.3 · Pantallas `/onboarding/scenario/[1-6]`

Cada una con:
- Fondo cream con ilustración placeholder al lado derecho
- Texto del escenario (placeholder — se llena cuando coaches firmen)
- 3-5 opciones de respuesta como botones grandes
- Indicador de progreso "Situación 1 de 6" arriba

**Por ahora**, hardcodear 6 escenarios placeholder con texto generico tipo "[Coach: completar]". Cuando el motor B2-02/B2-03 esté listo, esta página leerá del backend.

Logic de navegación: click en opción → guardar en state Zustand → siguiente pantalla. Al final de scenario 6 → `/onboarding/result`.

### 9.4 · Pantalla `/onboarding/result`

- Radar component en estado `filling` (animación 4-6 segundos)
- Después de la animación: Radar `complete` con valores mock
- Card con "Tu punto de partida" + pilar más rezagado + CTA "Empezar aquí" → `/path`
- Link discreto "Ver todos los pilares" → `/radar`

### 9.5 · Trigger de onboarding

Modificar `(app)/SessionGate` o `middleware.ts`: si user no tiene `user_pillar_states` → redirigir a `/onboarding/welcome`. Si ya completó → flujo normal.

**Criterios:**
- [ ] Route group `(onboarding)` con 8 pantallas
- [ ] Layout cinematográfico full-screen sin chrome
- [ ] State Zustand para acumular respuestas (efímero, no persiste server-side aún)
- [ ] Result muestra Radar `filling → complete` con animación
- [ ] SessionGate redirige a onboarding si user nuevo
- [ ] Commit: `feat(FE-v2-09): onboarding cinematic shells (no backend logic yet)`

---

## TASK FE-v2-10 · Verificación e2e + screenshots + docs · `[ ]`

### 10.1 · Smoke test e2e desde browser limpio (incognito)

1. `https://app.humangrowth.io/` → landing público con Hero nuevo
2. Navegar `/paths`, `/for-teams`, `/pricing`, `/contacto`
3. Submit form `/contacto` → ver fila en DB prod (después del deploy)
4. Click "Conversemos" → `/login`
5. Login `superadmin@humangrowth.app` → como es user existente, va a `/home`
6. Verificar SideNav + BottomNav (resize a mobile)
7. Verificar admin toggle
8. Visitar `/radar` y `/onboarding/welcome` (forzar URL)

### 10.2 · Screenshots actualizadas

Guardar en `docs/screenshots/frontend-v2/`:
- `01-landing-hero.png`
- `02-landing-features.png`
- `03-paths-grid.png`
- `04-pricing.png`
- `05-contacto-form.png`
- `06-home-with-mini-radar.png`
- `07-radar-complete.png`
- `08-onboarding-welcome.png`
- `09-onboarding-scenario.png`
- `10-onboarding-result-radar-filling.png`
- `11-mobile-bottom-nav.png`

### 10.3 · Docs

- **ADR-0006**: "Adopción de paleta marketing v1 + nav adaptativa (SideNav/BottomNav)" → resume swap de tokens, fonts, nav refactor.
- Actualizar `docs/ARCHITECTURE.md` sección Frontend con:
  - Nueva paleta + fonts
  - Route groups: `(marketing)` · `(auth)` · `(app)` · `(admin)` · `(onboarding)`
  - Componentes Radar + MiniRadar
  - Tabla de 4 destinos de nav
- Actualizar `apps/frontend/README.md` con instrucciones de desarrollo

### 10.4 · Build prod-ready

```bash
cd apps/frontend
pnpm lint && pnpm typecheck && pnpm build
```

Los tres verdes. Listo para PR a `main`.

**Criterios:**
- [ ] Flujo e2e manual OK
- [ ] 11+ screenshots
- [ ] ADR-0006 + ARCHITECTURE + README actualizados
- [ ] Build verde
- [ ] Commit: `chore(FE-v2-10): e2e verification + screenshots + ADR-0006 + docs`

---

# 🎯 Criterios globales "hecho"

- [ ] 10 TASKs commiteadas individualmente
- [ ] Paleta marketing v1 aplicada, fonts Anton+Manrope primary
- [ ] Cero `#FF4500` o `#FDF5E6` en código
- [ ] Landing público navegable en `/`, `/paths`, `/for-teams`, `/pricing`, `/contacto`
- [ ] "Conversemos" → `/login` · "Solicitar unirse" → `/contacto`
- [ ] Endpoint `/contact/inquiry` funciona con tests
- [ ] App nav refactor con SideNav + BottomNav + admin toggle
- [ ] Radar component en 3 estados + Mini-Radar
- [ ] Onboarding shells navegables (sin lógica backend aún)
- [ ] ADR-0006 + docs actualizados
- [ ] Build verde · tests pasando

# Entrega

Reportá al final:
1. SHA del último commit
2. Output de `pnpm build` (resumen rutas)
3. Screenshots
4. URL del PR a `main`
5. Desviaciones del plan
6. Pendientes (videos B1-09 + motor B2-02/B2-03 + email real B3-05)

---

## 🟧 Status por TASK

| ID | Subject | Status |
|---|---|---|
| FE-v2-01 | Token swap nueva paleta + fonts | `[x] DONE` |
| FE-v2-02 | Port assets + i18n stub | `[x] DONE` |
| FE-v2-03 | (marketing) + Nav + Hero | `[x] DONE` |
| FE-v2-04 | LogoCloud + Features + PathCard | `[x] DONE` |
| FE-v2-05 | Mentor + Quote + Pricing + Footer | `[x] DONE` |
| FE-v2-06 | /contacto + endpoint backend | `[x] DONE` |
| FE-v2-07 | Refactor nav app (Side + Bottom) | `[x] DONE` |
| FE-v2-08 | Radar component 3 estados + Mini | `[x] DONE` |
| FE-v2-09 | Onboarding shells (sin lógica) | `[x] DONE` |
| FE-v2-10 | E2E + screenshots + docs | `[x] DONE` |
