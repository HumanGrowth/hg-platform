# Prompt Claude Code · Polish Marketing + Login pre-JxCR demo

> **Modo recomendado:** `/effort high` con **Claude Opus 4.8**.
> **23 cambios** consolidados del walkthrough live con Andrés (ver `HG/Docs/HG_Punch_List_JxCR_Demo.md` v2). ~5-6h secuencial. **7 TASKs**. Pages que NO se tocan: `/onboarding/*`, `/home`, `/library`, `/path`, `/radar`, `/profile`, `/team`, `/admin/org` (esas se auditan en sesión 2).

---

## ⚙️ Resume protocol

Si la sesión se compacta o reinicia:

1. Releé este prompt entero (`docs/prompts/claude-code_polish_marketing_pre_jxcr.md`).
2. Releé el doc de referencia: `HG/Docs/HG_Punch_List_JxCR_Demo.md` (vive fuera del repo, secciones 1-8 son el alcance de este sprint).
3. Verificá estado:
   ```bash
   git status && git log --oneline -10
   cd apps/frontend && pnpm typecheck 2>&1 | tail -10 && pnpm test 2>&1 | tail -10
   ```
4. Buscá TASKs `🟧 IN PROGRESS` y reanudá desde el último criterio sin tildar.

## 🧱 Reglas duras

- **Un commit por TASK** con prefijo `feat(polish): ...` o `fix(polish): ...`. Sub-commits intermedios `wip(polish): ...` cada >25 min.
- **Editá ESTE archivo al avanzar** (status + `[x]`).
- **No avances** si la TASK actual no está `✅ DONE`.
- **NO tocar pages de la app autenticada** (`/home`, `/library`, `/path`, `/radar`, `/profile`, `/team`, `/admin/org`, `/onboarding/*`). Esas se polish en sesión 2.
- **NO modificar el motor de assessment ni los scorers ni el catálogo**.
- **NO instalar dependencias nuevas** salvo confirmación.
- **9 decisiones de Andrés ya tomadas** (sección 9 del doc) — no re-debatirlas.

## 📌 Estado al iniciar

- `main` con motor de assessment vivo (PR #10 mergeado · SHA `6d20a8e`).
- Tests: backend **134/134** · frontend **70/70**.
- Andrés tiene este prompt + el punch list v2 abiertos. Va a ejecutar mientras el equipo sigue auditando otras pages en paralelo.
- Stack local corriendo: backend :8000 · frontend :3000 · Postgres con seed completo.

## 🧠 Decisiones firmadas por Andrés (no re-debatir)

1. **Rutas `/paths` aspiracionales** → mantener tal cual
2. **Mentores landing + for-teams** → placeholders honestos
3. **LogoCloud** → blur alto + sin tagline
4. **Pricing** → 1 sola tarjeta tipo Enterprise + ocultar FAQs
5. **Contacto** → bloque socials (LinkedIn `humangrowthlatam`) + email visible
6. **Login** → bienvenida (no "volvé a entrar")
7. **Nuevo tab "La Ciencia"** en nav → page derivada del PDF firmado
8. **Footer + Nav** → componente único
9. **Quote fundador** → **Jorge Araya** (no Salas)

---

# TASKS

## TASK polish-01 · Componentes globales · Nav + Footer · `[ ]`

### 1.1 · `apps/frontend/src/components/marketing/Nav.tsx`

- CTA derecha "Conversemos" → `href="/contacto"` (hoy `/login`)
- Quitar `<span>` "Mentorías" con `opacity-60` — no aparece más en el nav
- Sumar nuevo `<Link>` "La Ciencia" → `/ciencia` (la page se crea en TASK 06). Posición: entre "Para Equipos" y "Tarifas".
- Verificar que "Iniciar sesión" sigue → `/login` (sin cambios)

### 1.2 · `apps/frontend/src/components/marketing/Footer.tsx`

Cambiar items a `<Link>` donde corresponda. Mantener los demás como `<span>` con cursor default (sin pointer, sin hover effect — quedan como visual placeholder hasta poblar).

```tsx
// Producto
- "Rutas de Crecimiento" → <Link href="/paths">
- "Mentorías" → <span> (sin link, placeholder)
- "Badges" → <span>
- "Diagnóstico" → <Link href="/login"> (entra a app post-auth)
- "Biblioteca" → <Link href="/login">

// Para Equipos
- "Tarifas" → <Link href="/pricing">
- "Vista de líder" → <span>
- "Rutas a la medida" → <span>
- "Compras corporativas" → <span>

// Recursos (todos sin link)
- Blog, Casos de estudio, Centro de ayuda, Docs de API, Estado → <span>

// Empresa
- "Acerca de" → <span>
- "Empleo" → <span>
- "Press kit" → <span>
- "Contacto" → <Link href="/contacto">

// Legal (todos sin link)
- Privacidad, Términos, Seguridad, Estado → <span>
```

Estilo de los `<span>` sin link: mantener mismo color/tamaño que los links pero sin `cursor-pointer` ni hover effect (quitar `hover:text-ink-900`).

### 1.3 · Sumar bloque socials + email en footer

Debajo del logo en la primera columna (o como nueva sección antes de los rights):

```tsx
<div className="mt-4 flex items-center gap-4">
  <a
    href="https://www.linkedin.com/company/humangrowthlatam"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="LinkedIn Human Growth"
    className="text-ink-800 hover:text-ink-900"
  >
    <Linkedin size={20} strokeWidth={1.75} />
  </a>
  <a
    href="mailto:admin@humangrowth.io"
    className="text-sm text-ink-800 hover:text-ink-900"
  >
    admin@humangrowth.io
  </a>
</div>
```

Import: `import { Linkedin } from "lucide-react"`.

### 1.4 · Criterios

- [ ] Nav: "Conversemos" → /contacto · "La Ciencia" agregado · "Mentorías" quitado
- [ ] Footer: 4 columnas con items selectivamente linkeados según especificación
- [ ] Bloque socials con LinkedIn + email visible
- [ ] `pnpm typecheck` verde
- [ ] Commit: `feat(polish): nav + footer adjustments (links activos + socials + ciencia tab)`

---

## TASK polish-02 · `/` Landing · `[ ]`

### 2.1 · `Hero.tsx`

- CTA "Conversemos →" → `href="/contacto"` (hoy `/login`)
- **socialProof**: reemplazar `"+14,300 profesionales creciendo hoy"` por `"Diseñado para profesionales y equipos de LatAm"`. Editar en `apps/frontend/src/lib/locales/es.ts` key `hero.socialProof`.
- **Fix a11y heading**: hoy el screen reader lee "Crece conintención." sin espacio. Cambiar `<h1>` para que use 2 `<span>` con `<br aria-hidden="true">` entre medio, y agregar `aria-label="Crece con intención"` al `<h1>`.

### 2.2 · `LogoCloud.tsx`

- **Quitar tagline** "Empresas en Costa Rica..." (eliminar el `<p>` que lo contiene).
- **Aplicar blur a los 6 logos**: agregar clase `filter blur-sm` o estilo inline `style={{ filter: "blur(6px)" }}` a los wrappers de cada logo. Aria-hidden true en cada uno (no aportan info real).
- Conservar el eyebrow "EMPRESAS QUE CONFÍAN EN HG" — pero también ocultarlo o cambiar a "PRÓXIMOS PARTNERS" para honestidad.

### 2.3 · `Features.tsx` → split en 2 componentes nuevos

**Crear `SixPillars.tsx`** (componente nuevo en `apps/frontend/src/components/marketing/SixPillars.tsx`):

```tsx
const PILLARS = [
  { code: "P1", name: "Carrera e impacto", body: "Crecé profesionalmente con un mapa claro de tu próximo paso." },
  { code: "P2", name: "Propósito y significado", body: "Conectá tu trabajo con algo que de verdad te importa." },
  { code: "P3", name: "Relaciones y conexión", body: "Construí redes que te sostienen y te empujan." },
  { code: "P4", name: "Salud y bienestar", body: "Sueño, movimiento y energía para sostener el desempeño." },
  { code: "P5", name: "Paz interior y claridad", body: "Regulá tus estados internos en presencia del estrés." },
  { code: "P6", name: "Estabilidad emocional y material", body: "Resiliencia y seguridad económica como base." },
];
```

Renderizar grid 3×2 con cards usando colores `pillar.pN` (semánticos del DS).

**Renombrar `Features.tsx` → `WhatWeOffer.tsx`** con las 4 cards actuales (Diagnóstico, Rutas, Mentorías, Badges). Cambios en copy:

- Card 01 Diagnóstico: actualizar a "18 preguntas. 6 dimensiones. ~5 minutos. Un perfil con base científica."
- Card 02 Rutas: mantener
- Card 03 Mentorías: cambiar stat "10+ mentores" → "En roadmap Q4 2026"
- Card 04 Badges: cambiar stat "20+ credenciales" → "En roadmap Q4 2026"

Link "Ver todo →" debajo de `<WhatWeOffer/>` → `<Link href="/paths">`.

### 2.4 · `apps/frontend/src/app/(marketing)/page.tsx`

Actualizar la composición:

```tsx
return (
  <>
    <Hero />
    <LogoCloud />
    <SixPillars />    {/* NUEVO */}
    <WhatWeOffer />   {/* renombrado de Features */}
    <FeaturedPaths />
    <MentorStrip />
    <Quote />
    <PricingTable />
  </>
);
```

### 2.5 · `Quote.tsx`

- Cambiar `"Jorge Salas"` → `"Jorge Araya"` (key `quote.name` en `es.ts`).

### 2.6 · `PathCard.tsx` o componente de "Nuevo este trimestre"

- Convertir chips de cards en `<Link href="/paths">` clickeables (hoy son `<generic>`).
- Quitar el contador "312 en esta cohorte" / "184" / "96" (eliminar `<span>` con cohort count). Mantener solo `category + meta + title + body`.

### 2.7 · Criterios

- [ ] Hero CTA + socialProof + a11y heading
- [ ] LogoCloud blur + sin tagline + eyebrow honesto
- [ ] `<SixPillars/>` componente nuevo
- [ ] `Features.tsx` → `WhatWeOffer.tsx` con copy actualizado
- [ ] Landing page composición actualizada
- [ ] Quote: Jorge Araya
- [ ] Cards "Nuevo este trimestre" linkeadas + sin contadores
- [ ] `pnpm build` verde
- [ ] Commit: `feat(polish): landing — honest copy + split SixPillars/WhatWeOffer + quote name + cards links`

---

## TASK polish-03 · `/for-teams` + `/login` · `[ ]`

### 3.1 · `for-teams/page.tsx`

- **Fix a11y heading**: "Crecimiento que tu lídersí puede ver." → split en 2 `<span>` + `<br aria-hidden="true">` + `aria-label="Crecimiento que tu líder sí puede ver"` en el `<h1>`.
- Mantener mentores + SSO + rutas a la medida como están (decisión Andrés: roadmap honesto).

### 3.2 · `login/page.tsx`

- Heading "Volvé a entrar" → **"Bienvenido/a"** (más cálido, sirve tanto para first-time como para return).
- **Ocultar botón "Olvidé mi contraseña"** (B3-07 pendiente). Comentar el botón con `// TODO: reactivar cuando exista flow de recovery (B3-07)`.
- Sumar al final del form:

```tsx
<p className="mt-6 text-center text-sm text-fg-muted">
  ¿No tenés cuenta?{" "}
  <Link href="/contacto" className="font-semibold text-orange-700 hover:underline">
    Solicitá unirte
  </Link>
</p>
```

### 3.3 · Criterios

- [ ] `/for-teams` heading a11y fixed
- [ ] `/login` heading bienvenida + ocultar "olvidé contraseña" + link a /contacto
- [ ] `pnpm test` verde (test del login probablemente busca "Volvé a entrar" — actualizar)
- [ ] Commit: `feat(polish): for-teams a11y + login welcome heading + solicitar unirse link`

---

## TASK polish-04 · `/pricing` rediseño a 1 tarjeta + ocultar FAQs · `[ ]`

### 4.1 · `PricingTable.tsx` rediseño completo

Reemplazar las 3 tarjetas + toggle Mensual/Anual por **1 sola tarjeta tipo Enterprise**:

```tsx
export default function PricingTable() {
  return (
    <section className="max-w-marketing mx-auto px-8 py-32">
      <div className="flex flex-col items-center text-center mb-12">
        <div className="eyebrow eyebrow-accent mb-4">TARIFAS</div>
        <h2 className="display text-ink-900 m-0 max-w-[760px] text-[44px] sm:text-[56px] lg:text-[64px]">
          Cada empresa es distinta. Vamos a armar tu paquete.
        </h2>
        <p className="text-ink-800 text-[18px] leading-[1.5] mt-6 max-w-[620px]">
          Sin tarifas fijas todavía. Conversamos contigo para entender tu equipo, definir el alcance y armarte una propuesta a la medida.
        </p>
      </div>

      <div className="max-w-[720px] mx-auto">
        <Card className="bg-bg-raised p-10 border border-border">
          <div className="eyebrow mb-3">PLAN A LA MEDIDA</div>
          <h3 className="display text-ink-900 mb-4 text-3xl">
            Construido contigo
          </h3>
          <p className="text-ink-800 mb-8 text-base leading-[1.6]">
            Elegí qué incluir según el momento de tu equipo. Sin compromisos ocultos.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 mb-10">
            {/* Features list — 2 columnas */}
            <FeatureItem>Diagnóstico inicial con base científica</FeatureItem>
            <FeatureItem>Catálogo de cursos completos</FeatureItem>
            <FeatureItem>Biblioteca de contenido HG</FeatureItem>
            <FeatureItem>Player de video adaptativo</FeatureItem>
            <FeatureItem>Dashboard para manager directo</FeatureItem>
            <FeatureItem>Dashboard RRHH con métricas org</FeatureItem>
            <FeatureItem>Export CSV de progreso</FeatureItem>
            <FeatureItem>Onboarding asistido del equipo</FeatureItem>
            <FeatureItem>Soporte LatAm en horario local</FeatureItem>
            <FeatureItem>Acceso web + mobile responsive</FeatureItem>
            <FeatureItem>Re-takes del assessment (cada 30d)</FeatureItem>
            <FeatureItem>Documentación de privacidad y GDPR</FeatureItem>
          </div>

          <Link
            href="/contacto"
            className="block w-full text-center bg-orange text-white px-8 py-4 rounded-md font-semibold text-base hover:bg-orange-600 transition-colors"
          >
            Conversemos →
          </Link>

          <p className="text-xs text-fg-muted text-center mt-6">
            Tarifas individuales y por licencia próximamente.
          </p>
        </Card>
      </div>
    </section>
  );
}

function FeatureItem({ children }) {
  return (
    <div className="flex items-start gap-2 text-sm text-ink-800">
      <Check size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-forest" />
      <span>{children}</span>
    </div>
  );
}
```

Import `Check from lucide-react`.

### 4.2 · Quitar FAQs

En `apps/frontend/src/app/(marketing)/pricing/page.tsx`, eliminar la sección de FAQs (las 4 preguntas: "¿Hay prueba gratuita?", "¿Cómo funciona el cobro?", "¿Puedo cambiar de plan?", "¿Tienen facturación para empresas en LatAm?").

### 4.3 · Limpiar i18n keys obsoletas

En `es.ts`, eliminar/comentar las keys de pricing que ya no se usan: `pricing.monthly`, `pricing.annual`, `pricing.tiers`, etc. Mantener solo `pricing.eyebrow`, `pricing.title`.

### 4.4 · Criterios

- [ ] PricingTable.tsx reescrito a 1 tarjeta
- [ ] FAQs quitadas del page
- [ ] i18n keys obsoletas limpiadas
- [ ] Sin toggle Mensual/Anual
- [ ] `pnpm build` verde
- [ ] Commit: `feat(polish): pricing — single enterprise card + remove FAQs`

---

## TASK polish-05 · `/contacto` socials + UX · `[ ]`

> ⚠️ **CN-01 (email a admin@humangrowth.io) queda fuera de este sprint** — depende de B3-05 Resend. JxCR ya recibe leads en DB y RRHH los ve en `/admin/contact/inquiries`. Email real se agrega cuando se cierre Resend.

### 5.1 · `apps/frontend/src/app/(marketing)/contacto/page.tsx`

Agregar debajo del form un bloque "Otras formas de contacto":

```tsx
<section className="max-w-marketing mx-auto px-8 mt-12 pb-20">
  <div className="max-w-[640px] mx-auto border-t border-border pt-10">
    <div className="eyebrow mb-3">OTRAS FORMAS DE CONTACTO</div>
    <div className="flex flex-col sm:flex-row gap-6 sm:gap-10">
      <a
        href="mailto:admin@humangrowth.io"
        className="flex items-center gap-2 text-ink-900 hover:text-orange-700"
      >
        <Mail size={18} strokeWidth={1.75} />
        <span className="text-sm font-medium">admin@humangrowth.io</span>
      </a>
      <a
        href="https://www.linkedin.com/company/humangrowthlatam"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-ink-900 hover:text-orange-700"
      >
        <Linkedin size={18} strokeWidth={1.75} />
        <span className="text-sm font-medium">linkedin.com/company/humangrowthlatam</span>
      </a>
    </div>
  </div>
</section>
```

Imports: `Mail, Linkedin from "lucide-react"`.

### 5.2 · Post-submit success

En `ContactForm.tsx`, después de submit exitoso, reemplazar el toast por:

- Ocultar form
- Mostrar bloque grande:
```tsx
<Card className="text-center py-12">
  <CheckCircle2 size={48} strokeWidth={1.5} className="text-forest mx-auto mb-4" />
  <h2 className="display text-2xl text-ink-900 mb-3">¡Gracias por escribirnos!</h2>
  <p className="text-ink-800 mb-8">Te respondemos en menos de 24 horas.</p>
  <Link href="/" className="text-orange-700 font-semibold hover:underline">
    Volver al inicio →
  </Link>
</Card>
```

### 5.3 · Heading más corto

Cambiar `"Conversemos sobre cómo Human Growth puede acelerar el crecimiento de tu equipo"` por `"Conversemos · te respondemos en 24h"` (en el page o si está en i18n).

### 5.4 · Fix combobox Rol

Verificar si `Otro` duplicado es bug real o ruido del accessibility tree. Si es bug: limpiar opciones del `<select>`.

### 5.5 · Criterios

- [ ] Bloque "Otras formas de contacto" con email + LinkedIn
- [ ] Post-submit con success card grande + link al inicio
- [ ] Heading corto
- [ ] Combobox Rol sin duplicados
- [ ] `pnpm test` verde
- [ ] Commit: `feat(polish): contacto — socials block + success state + cleaner heading`

---

## TASK polish-06 · NUEVO · Page `/ciencia` · `[ ]`

### 6.1 · Crear `apps/frontend/src/app/(marketing)/ciencia/page.tsx`

Page derivada del PDF firmado `HG/Docs/HG_Evaluacion_Pilares.pdf` (resumen pedagógico, no copia técnica). Estructura sugerida:

```tsx
export const metadata = {
  title: "La Ciencia — Human Growth",
  description: "Por qué cada pilar de Human Growth se mide con un instrumento psicométrico validado.",
};

export default function CienciaPage() {
  return (
    <>
      <section className="max-w-marketing mx-auto px-8 pt-36 pb-16">
        <div className="eyebrow eyebrow-accent mb-6">LA CIENCIA</div>
        <h1 className="display text-ink-900 text-5xl sm:text-6xl m-0">
          La ciencia detrás de tu radar.
        </h1>
        <p className="text-ink-800 text-[18px] leading-[1.5] mt-6 max-w-[720px]">
          Cada pilar tiene un instrumento psicométrico con décadas de validación
          publicada — adaptado al lenguaje y la realidad de Costa Rica y LatAm.
          No inventamos preguntas. Tropicalizamos instrumentos validados.
        </p>
      </section>

      {/* 6 cards con un pilar cada uno */}
      <section className="max-w-marketing mx-auto px-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PillarScience
            code="P2"
            name="Propósito y significado"
            instrument="MLQ-10 (Steger)"
            validation="Validado en España, Argentina, Brasil (n≈3.020)"
            evidence="Estudio MIDUS (n=6.000, 14 años de seguimiento): mayor propósito predice menor mortalidad y menor inflamación."
            result="4 estados Damon: Latente / Explorador / Direccionado / Integrado"
          />
          <PillarScience
            code="P3"
            name="Relaciones y conexión"
            instrument="UCLA Loneliness + Cacioppo"
            validation="Validado en múltiples muestras hispanas"
            evidence="Meta-análisis Holt-Lunstad (+3,4M participantes): la falta de conexión tiene mortalidad comparable a fumar 15 cigarrillos/día."
            result="4 niveles: Aislamiento → Funcional → Integrado → Generativo"
          />
          <PillarScience
            code="P4"
            name="Salud y bienestar"
            instrument="Modelo Transteórico de Prochaska"
            validation="40+ años de validación, aplicado en CR/MX"
            evidence="OMS: las enfermedades no transmisibles causan 74% de muertes globales. Factores de riesgo modificables."
            result="5 etapas Prochaska × 4 dominios (Sueño, Actividad, Nutrición, Recuperación)"
          />
          <PillarScience
            code="P5"
            name="Paz interior y claridad"
            instrument="ERQ (Gross) + AAQ-II (Hayes)"
            validation="Validado en Argentina, España"
            evidence="ACT meta-análisis 39 ECAs: reduce ansiedad, depresión y dolor crónico significativamente."
            result="4 niveles: Reactivo → Consciente → Regulado → Flexible"
          />
          <PillarScience
            code="P6A"
            name="Resiliencia emocional"
            instrument="CD-RISC-10 (Connor-Davidson)"
            validation="Escala de resiliencia más usada en el mundo, validada en español"
            evidence="Bonanno (Columbia): la resiliencia es la respuesta más común al trauma, no la excepción."
            result="3 niveles: Baja / Media / Alta"
          />
          <PillarScience
            code="P6B"
            name="Bienestar financiero"
            instrument="CFPB Financial Wellbeing Scale"
            validation="Adaptada a Costa Rica (₡)"
            evidence="Mullainathan & Shafir (Science): la preocupación financiera erosiona el rendimiento cognitivo más que la privación severa de sueño."
            result="3 niveles: Frágil / Vulnerable / Estable"
          />
        </div>
      </section>

      {/* Sección "Por qué no usamos AI generativo" */}
      <section className="max-w-marketing mx-auto px-8 pb-32">
        <div className="max-w-[760px] mx-auto bg-cream-200 rounded-lg p-10">
          <div className="eyebrow mb-3">NUESTRA POSTURA</div>
          <h2 className="display text-ink-900 text-3xl mb-4">
            Por qué no usamos AI generativo para clasificar tu perfil.
          </h2>
          <p className="text-ink-800 text-base leading-[1.6] mb-3">
            Los instrumentos que usamos tienen entre 20 y 50 años de validación
            con miles de participantes. Un modelo de lenguaje que adivina tu
            estado emocional no tiene esa base — y no es defensible
            pedagógicamente ni legalmente bajo regulaciones como EU AI Act o NYC
            Local Law 144.
          </p>
          <p className="text-ink-800 text-base leading-[1.6]">
            La ciencia ya hizo el trabajo difícil. Nuestro aporte es entregarla
            con un lenguaje cercano, sin pedirte que dediques 40 minutos a un
            cuestionario.
          </p>
        </div>
      </section>
    </>
  );
}

function PillarScience({ code, name, instrument, validation, evidence, result }) {
  const colorMap = {
    P2: "pillar-p2", P3: "pillar-p3", P4: "pillar-p4",
    P5: "pillar-p5", P6A: "pillar-p6", P6B: "pillar-p6",
  };
  return (
    <div className="bg-cream-50 border border-border rounded-lg p-8">
      <div className="flex items-center gap-3 mb-4">
        <Badge variant={colorMap[code]}>{code}</Badge>
        <h3 className="display text-ink-900 text-xl m-0">{name}</h3>
      </div>
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="eyebrow mb-1">Instrumento</dt>
          <dd className="text-ink-800">{instrument}</dd>
        </div>
        <div>
          <dt className="eyebrow mb-1">Validación</dt>
          <dd className="text-ink-800">{validation}</dd>
        </div>
        <div>
          <dt className="eyebrow mb-1">Evidencia causal</dt>
          <dd className="text-ink-800">{evidence}</dd>
        </div>
        <div>
          <dt className="eyebrow mb-1">Resultado</dt>
          <dd className="text-ink-800 font-mono text-xs">{result}</dd>
        </div>
      </dl>
    </div>
  );
}
```

### 6.2 · Criterios

- [ ] Page `/ciencia` accesible y renderiza 6 pilares + sección "por qué no AI"
- [ ] Linkeada desde nav (TASK 01)
- [ ] `pnpm build` incluye la nueva ruta
- [ ] Commit: `feat(polish): new /ciencia page with 6 pillars + scientific framing`

---

## TASK polish-07 · Tests + smoke + screenshots · `[ ]`

### 7.1 · Tests

- Actualizar tests del login que buscan "Volvé a entrar" → "Bienvenido"
- Actualizar test de Hero si testea `+14,300` → reemplazar
- Verificar que el split `SixPillars` + `WhatWeOffer` no rompe ningún test existente

### 7.2 · Smoke manual

- Abrir `localhost:3000` y caminar las 7 pages (`/`, `/paths`, `/for-teams`, `/pricing`, `/contacto`, `/login`, `/ciencia`).
- Verificar links: footer, nav, CTAs.
- Verificar mobile (`/team/[id]` y `/onboarding` quedan fuera de scope).

### 7.3 · Screenshots `docs/screenshots/polish-jxcr-marketing/`

5 screenshots con Playwright:

- `01-landing-hero-new-cta.png`
- `02-six-pillars-section.png`
- `03-pricing-single-card.png`
- `04-contacto-with-socials.png`
- `05-ciencia-page.png`

### 7.4 · Criterios

- [ ] `pnpm test` verde (probablemente 68/68 o algún ajuste)
- [ ] `pnpm build` verde
- [ ] 5 screenshots en `docs/screenshots/polish-jxcr-marketing/`
- [ ] Commit: `test(polish): adjust tests + 5 screenshots pre-JxCR`

---

# 🎯 Criterios globales "hecho"

- [ ] 7 TASKs commiteadas individualmente
- [ ] Nav + Footer: links activos + socials + "La Ciencia"
- [ ] Landing: copy honesto + 2 secciones (pilares + ofertas)
- [ ] Pricing: 1 tarjeta + sin FAQs
- [ ] Contacto: socials block + post-submit success
- [ ] Login: bienvenida
- [ ] `/ciencia`: page nueva con base del PDF firmado
- [ ] `pnpm build` + `typecheck` + `test` verdes
- [ ] 5 screenshots
- [ ] PR contra main

# 📤 Entrega

- SHA último commit
- 5 screenshots
- URL del PR
- Lista de desviaciones (si las hubo)

# Status por TASK (editar al avanzar)

| ID | Subject | Status |
|---|---|---|
| polish-01 | Nav + Footer adjustments + socials + Ciencia tab | `[ ]` |
| polish-02 | Landing copy + split SixPillars/WhatWeOffer + Quote name | `[ ]` |
| polish-03 | for-teams a11y + login welcome + solicitar unirse | `[ ]` |
| polish-04 | Pricing single card + remove FAQs | `[ ]` |
| polish-05 | Contacto socials block + success state | `[ ]` |
| polish-06 | NEW page `/ciencia` | `[ ]` |
| polish-07 | Tests + 5 screenshots | `[ ]` |
