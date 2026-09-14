# Diseño: Match de competencias con AI (FASE 2.4 — roadmap, no productivo)

- **Estado:** Diseño. No implementar como feature productiva todavía — este documento entrega el diseño y dejar
  el terreno preparado para el PoC opcional (ver al final).
- **Origen:** Plan de trabajo Feedback del manager + Currícula customizable (Docs/HG_Plan_ClaudeCode_ManagerFeedback_y_CursosCustom.md), ÁREA 2 · FASE 2.4.
- **Objetivo:** cruzar la **currícula HG** (units de `learning_units`, con `competency_code` C1–C5, `dimension_code`,
  `pillar_code`, `keywords`, texto de bloques) contra los **manuales de competencias** que cada Empresa cliente ya
  tiene (sus propios frameworks de competencias, con nombres y niveles distintos a los nuestros), para sugerir qué
  unit de HG cubre qué competencia del cliente. El resultado alimenta una `CustomPath` (FASE 2.2) — nunca reemplaza
  el criterio humano.

## 1. Ingesta del manual de competencias de la empresa

**Modelo de datos** (nuevo módulo `hg/modules/competency_match/`, catálogo por Empresa — mismo patrón sin-RLS que
`CustomPath`/`CompanyAreaAccess`, gobernado por `company_admin`/superadmin vía `get_db_as_superadmin`):

```
CompetencyFramework
  id, company_id (FK companies), name, source_filename, uploaded_by_user_id, uploaded_at, is_active

CompetencyItem
  id, framework_id (FK, cascade), name, description, expected_level (str, libre — cada empresa define su escala),
  order_index
```

**Formato de carga:** CSV o `.xlsx` (mismo patrón que `bulk_import_members` en `company/bulk_service.py`: plantilla
descargable con columnas `nombre, descripción, nivel_esperado`, parseo fila a fila, reporte de errores sin fallar
todo el archivo). Un Google Doc/PDF narrativo (no tabular) requeriría un paso previo de extracción — fuera de v1;
si aparece ese caso, la extracción PDF→texto puede correr con Claude (`document` content block, ver más abajo) como
paso manual antes de la carga tabular, no como parte del pipeline automático.

## 2. Representación de la currícula HG para matching

**Señales disponibles hoy** (ya en el modelo, `learning_units/models.py`):

- `competency_code` (C1–C5, enum `CompetencyCode` en `learning/models.py`) — mapea 1:1 a los pilares de Carrera
  (`pillars.py`: C1=P1 Adaptabilidad de aprendizaje, C2=P2 Excelencia operativa, C3=P3 Experticia y pensamiento
  estratégico, C4=P4 Comunicación e influencia, C5=P5 Inteligencia emocional y social). Es la señal más fuerte y
  ya está curada por un humano (Jorge) — cualquier estrategia de matching debe **empezar por acá**, no ignorarla.
- `dimension_code` / `pillar_code` / `level_code` — contexto adicional (a qué dimensión/nivel pertenece la unit).
- `keywords` (JSONB, tags libres) — señal explícita para búsqueda/matching, ya pensada para esto ("keywords: tags
  unit-level (search / AI futuro)" dice el comment del modelo).
- Texto de bloques (`text_context`/`text_evidence`/`text_solution`, `UnitBlock`/`TextBlock`) — el contenido real,
  más rico pero más caro de procesar (hay que armar el string desde varios bloques por unit).

**Estrategia recomendada — reglas primero, AI donde la regla no alcanza** (política interna del equipo: no
recomendar AI donde una regla/búsqueda alcanza):

1. **Paso 0 (regla, sin AI):** si `CompetencyItem.name` matchea por substring/fuzzy-match contra `keywords` o el
   nombre del pilar (`pillar_display_name`), proponer el match directo con `method="rule"` y confianza alta. Esto
   cubre el caso más común (el cliente ya usa vocabulario similar al nuestro) sin gastar un solo token de LLM.
2. **Paso 1 (AI, solo para lo que el paso 0 no resolvió):** para cada `CompetencyItem` sin match de regla, un
   **LLM-judge con Claude** recibe el `CompetencyItem` (nombre + descripción + nivel esperado) y la lista de
   `competency_code`/pilares de HG con su `pillar_display_name` + una muestra de `keywords`/títulos de units de ese
   pilar (no hace falta mandar el texto completo de cada bloque — evaluar contra el *resumen* del pilar, no unit
   por unit, es más barato y más preciso: reduce el problema de "¿qué unit exacta?" a "¿qué pilar?", y de ahí el
   pilar ya trae su set de units). El LLM devuelve, vía **structured output** (`output_config.format` — nunca
   parseo de texto libre), `{competency_code, confidence: 0-1, rationale}` por cada `CompetencyItem`.
   - **Por qué LLM y no embeddings:** el volumen de contenido es chico (5 pilares × units, no miles de documentos)
     y lo que hay que resolver es "¿esta frase en el vocabulario del cliente corresponde a esta categoría en
     nuestro vocabulario?" — una tarea de clasificación semántica con razonamiento (sinónimos, nivel de
     abstracción distinto, jerga de industria), no de recuperación por similitud sobre un corpus grande. Un
     LLM-judge con contexto explícito (los 5 pilares + su descripción) resuelve esto en una sola llamada por
     `CompetencyItem`, sin pipeline de embeddings/vector store adicional que mantener. Si el volumen crece
     (multi-empresa con manuales de cientos de items cada uno), reconsiderar un paso de embeddings previo para
     reducir cuántos pares se le mandan al LLM — no hace falta hoy.
   - **Modelo:** `claude-opus-5` (calidad de razonamiento importa más que costo acá — son decisiones que un
     humano va a revisar y potencialmente usar para asignar contenido a cientos de colaboradores; ver
     `shared/live-sources.md` del skill `claude-api` para precios vigentes). Batch de items vía **Message
     Batches** (`client.messages.batches.create`, 50% más barato, apto porque esto corre offline/async, no en
     el camino crítico de una request de usuario).
3. **Paso 2 (dentro de un pilar, opcional):** si se necesita bajar de "pilar" a "unit específica" (no solo
   "esta competencia cae en Carrera-P3"), un segundo paso de LLM-judge más fino, esta vez con el texto de
   `text_context` de las units candidatas del pilar — pero solo se justifica si el producto realmente necesita esa
   granularidad; si "recomendar el pilar completo" alcanza para armar la `CustomPath`, no hacer este paso (menos
   superficie de error, menos costo).

**Almacenamiento del match:**

```
CurriculumCompetencyMatch
  id, competency_item_id (FK CompetencyItem), dimension_code, pillar_code (el match es a nivel pilar, no unit —
  ver Paso 2), score (0-1, la confidence del LLM), method ("rule"|"llm"), rationale (text, solo si method="llm"),
  status ("proposed"|"confirmed"|"rejected"), reviewed_by_user_id, reviewed_at
```

## 3. Human-in-the-loop (no negociable)

El match AI **propone**, nunca asigna. Flujo:

1. Superadmin/company_admin sube el manual → se generan `CurriculumCompetencyMatch` en estado `proposed`
   (regla o LLM, con su `rationale` visible en la UI para que el humano entienda el "por qué").
2. Un humano (`company_admin`/superadmin) revisa cada propuesta en una pantalla de revisión — approve/reject por
   fila, edición manual si el AI se equivocó de pilar. Mientras no se confirma, el match **no tiene ningún efecto**
   en el producto (no crea `CustomPath`, no aparece en "Mi Ruta" de nadie).
3. Solo al **confirmar** (`status="confirmed"`), un botón explícito ("Crear ruta desde este framework") arma una
   `CustomPath` (FASE 2.2) con los pilares confirmados como items — reusando el mecanismo ya construido, no uno
   nuevo. Ningún colaborador ve contenido asignado por un match que no pasó por esta confirmación humana.

Este mismo principio ya está en el sistema: el manager NUNCA ve respuestas item-by-item del assessment (privacidad,
ver `people/service.py`), y el motor de recompute nunca actúa sin que un humano haya configurado los pesos primero
(FASE 1.1). El match de competencias sigue la misma disciplina: AI propone, humano decide.

## 4. Fallbacks y evaluación

- **Umbral de confianza:** `score < 0.5` (o el umbral que se calibre con casos reales) se muestra en la UI como
  "sin match confiable — revisar manualmente", no se auto-propone un pilar. Mejor admitir "no sé" que forzar un
  match malo que un humano apruebe sin mirar por sesgo de automatización.
- **Cómo se mide la calidad:** guardar `reviewed_by_user_id` + si el humano aceptó/rechazó/editó cada propuesta.
  Con eso, un reporte simple (aceptación % por `method`, por `confidence` bucket) dice si el LLM-judge vale la pena
  vs. la regla sola, sin necesitar infraestructura de evals separada al principio.
- **Auditoría:** cada `CurriculumCompetencyMatch` queda con su `rationale` y quién lo revisó — trazable para
  cuando el cliente pregunte "¿por qué me recomendaron este contenido para esta competencia?".
- **Privacidad:** el manual de competencias de una Empresa es suyo — nunca se usa contenido de la Empresa A para
  mejorar el matching de la Empresa B (ni como few-shot, ni fine-tuning). Cada llamada a Claude lleva únicamente
  el `CompetencyItem` en cuestión + el catálogo HG (que es nuestro, no del cliente) — no hace falta mandar el
  manual completo del cliente en cada llamada, así que tampoco hay retención de datos de un cliente en el contexto
  de otro.

## 5. PoC opcional (no productivo)

Si se quiere validar la idea con datos reales antes de construir el flujo completo: un script standalone
(`hg/scripts/poc_competency_match.py`, fuera del flujo productivo, no montado en ningún router) que:

1. Lee un manual de ejemplo (CSV local, no sube nada a la DB).
2. Corre el Paso 0 (regla) + Paso 1 (LLM-judge, `claude-opus-5`, structured output) contra el catálogo HG real
   (units publicadas, vía una query de solo-lectura).
3. Escribe un CSV de revisión (`competency_item, pilar_propuesto, confidence, rationale, method`) para que Andy/
   Jorge lo miren offline.

Este PoC no requiere el modelo `CompetencyFramework`/`CurriculumCompetencyMatch` ni ningún endpoint — es un script
de una sola corrida. Si el PoC valida la idea, recién ahí se construye el modelo de datos + endpoints + UI de
revisión descriptos arriba.
