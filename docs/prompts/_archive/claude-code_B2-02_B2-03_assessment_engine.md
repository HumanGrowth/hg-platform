# Prompt para Claude Code · B2-02 + B2-03 · Motor de assessment modular

> **Modo recomendado:** `/effort high` con **Claude Opus 4.8**.
> Trabajo complejo de arquitectura. Diseño multi-modelo (strategy pattern), schemas DB nuevos, motor de scoring por pilar, tests cross-pillar. Estimado: 3-5h.

---

## ⚙️ Resume protocol

Si la sesión se compacta o reinicia:

1. Releé este prompt entero (`docs/prompts/claude-code_B2-02_B2-03_assessment_engine.md`).
2. Verificá estado real:
   ```bash
   git status
   git log --oneline -10
   make test-backend 2>&1 | tail -20
   docker compose exec backend uv run alembic current
   ```
3. Releé "## 📌 Estado al iniciar" abajo.
4. Buscá TASKs marcadas `🟧 IN PROGRESS` y reanudá.

## 🧱 Reglas duras

- **Un commit por TASK** con prefijo Kanban: `feat(B2-02): ...`, `feat(B2-03): ...`.
- **Sub-commits intermedios** cada >25 min: `wip(B2-XX): partial — <qué>`.
- **Editá ESTE archivo al avanzar**.
- **No avances** si la TASK actual no está `✅ DONE`.
- **Tests obligatorios por scorer** — un test que verifica el ejemplo del kit pasa.
- **NO inventes datos clínicos**. Si dudás sobre umbrales o reglas → comentario `TODO(coach):` y mantené el placeholder del Excel del kit.

## 📌 Estado al iniciar

- `main` con todo B1 + FE-v1 + FUs cerrados. Último commit: `ef46540` (PR #2 ISSUE-1).
- Backend prod en `api.humangrowth.io` (Railway) usando `hg_app`. RLS activo.
- Frontend prod **pendiente** (Vercel, mañana).
- Tests backend: 34/34. Frontend: 7/7.
- Marco Teórico vigente: `HG/Docs/HG_Marco_Teórico_Completo.docx`.
- **Assessment Kit (sustituye Decisions Kit)**: `HG/Artifacts/assessment_kit/` con 6 subcarpetas (una por pilar):
  - `P1_Carrera/` (PMM v3, sin Excel — usa `HG/Docs/HumanGrowth_Matrices_v2.docx`)
  - `P2_Proposito/`, `P3_Relaciones/`, `P4_Salud/`, `P5_Paz_Interior/`, `P6_Estabilidad/` (cada uno con `<P>_GUIDE.md` + `<P>_template.xlsx`)
- Pilar de Carrera (P1) está en `users.career_level` (enum L1/L2/L3/L4a/L4b). Para PMM v3 completa hay que **extender el enum a L5/L6**.

---

# Contexto

Implementás el **motor de assessment modular** que reemplaza al modelo uniforme L1-L4. Cada pilar usa un **scorer propio** (strategy pattern) y devuelve un **estado/nivel cualitativo** (no un score 0-100 uniforme).

El backend debe:
1. Almacenar instrumentos, items, respuestas e estados del usuario por pilar.
2. Ejecutar el scorer correspondiente cuando el usuario termina el cuestionario.
3. Exponer endpoints para el frontend que muestra cards por pilar con la estructura específica de ese pilar.

Decisión arquitectural: **NO usar un único `assessment_score` 0-100 uniforme**. Cada pilar tiene su `pillar_state` propio (estado/nivel) + opcionalmente sub-componentes (dominios en Salud, sub-pilares en Estabilidad).

---

# TASKS

## TASK B2-02 · Schemas + arquitectura del motor · `[ ]`

### 1.1 · Refactor `learning/models.py` (sale del DRAFT)

Reemplazar el draft actual con modelos productivos para el motor de assessment:

```python
class PillarCode(str, enum.Enum):
    P1 = "P1"  # Carrera e Impacto
    P2 = "P2"  # Propósito y Significado
    P3 = "P3"  # Relaciones y Conexión
    P4 = "P4"  # Salud y Bienestar
    P5 = "P5"  # Paz Interior y Claridad
    P6 = "P6"  # Estabilidad Emocional y Material


class AssessmentInstrument(Base):
    """
    Catálogo de instrumentos por pilar.
    Versionado para permitir adaptaciones futuras sin perder data histórica.
    """
    __tablename__ = "assessment_instruments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pillar: Mapped[PillarCode]
    code: Mapped[str] = mapped_column(String(50))         # ej. "MLQ-10", "UCLA-3", "CD-RISC-10"
    version: Mapped[str] = mapped_column(String(20))       # ej. "v1.0"
    name: Mapped[str] = mapped_column(String(150))
    description: Mapped[str | None]
    scorer_class: Mapped[str] = mapped_column(String(100))  # nombre clase Python para dispatch
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("pillar", "code", "version", name="uq_instrument_pillar_code_version"),)


class AssessmentItem(Base):
    """
    Ítem individual de un instrumento (pregunta del cuestionario).
    """
    __tablename__ = "assessment_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    instrument_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("assessment_instruments.id", ondelete="CASCADE"), index=True
    )
    code: Mapped[str] = mapped_column(String(20))    # ej. "A1", "B3" — coincide con _template.xlsx
    sub_scale: Mapped[str | None] = mapped_column(String(50))  # ej. "Presencia", "Búsqueda", "Reevaluación"
    order_index: Mapped[int]
    text_es: Mapped[str] = mapped_column(String(500))       # versión validada ES
    text_cr: Mapped[str | None] = mapped_column(String(500))  # tropicalización (override si presente)
    response_type: Mapped[str] = mapped_column(String(20))    # 'likert-5', 'likert-7', 'multi-choice', 'count'
    response_config: Mapped[dict] = mapped_column(JSONB, default=dict)  # opciones, escalas, etc.
    is_reverse_scored: Mapped[bool] = mapped_column(Boolean, default=False)

    __table_args__ = (UniqueConstraint("instrument_id", "code", name="uq_item_instrument_code"),)


class PillarAssessmentAttempt(Base):
    """
    Un intento de assessment del usuario sobre UN pilar.
    """
    __tablename__ = "pillar_assessment_attempts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    instrument_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("assessment_instruments.id"), nullable=False, index=True
    )
    pillar: Mapped[PillarCode]
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Resultado del scorer (estructura varía por pilar) — usar JSONB para flexibilidad
    result: Mapped[dict] = mapped_column(JSONB, default=dict)
    # Ejemplos:
    # P2: {"presencia": 5.2, "busqueda": 3.1, "estado": "Con propósito"}
    # P3: {"ucla_score": 4, "intimate": 4.5, "relational": 3.0, "collective": 3, "level": "N2 Funcional"}
    # P4: {"sleep": "E5", "activity": "E2", "nutrition": "E3", "substances": "E1"}


class PillarAssessmentResponse(Base):
    """
    Respuesta del usuario a un ítem específico dentro de un intento.
    """
    __tablename__ = "pillar_assessment_responses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attempt_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("pillar_assessment_attempts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    item_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("assessment_items.id"), nullable=False
    )
    value: Mapped[dict] = mapped_column(JSONB)  # {"selected": 5} o {"option": "E3"} o {"count": 4}
    responded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class UserPillarState(Base):
    """
    Estado/nivel CURRENT del usuario por pilar.
    Una fila por (user, pillar). Se reemplaza al completar un nuevo attempt.
    """
    __tablename__ = "user_pillar_states"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    pillar: Mapped[PillarCode]
    state_code: Mapped[str] = mapped_column(String(40))   # "Con propósito", "N2 Funcional", "E5", "Alta", etc.
    state_label: Mapped[str] = mapped_column(String(60))   # human-readable, ES
    details: Mapped[dict] = mapped_column(JSONB, default=dict)
    # P4 tiene sub-componentes: {"sleep": "E5", "activity": "E2", ...}
    # P6 tiene sub-pilares: {"resilience": "Media", "financial": "Vulnerable"}

    last_attempt_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("pillar_assessment_attempts.id", ondelete="SET NULL")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (UniqueConstraint("user_id", "pillar", name="uq_user_pillar_state"),)
```

Quitar el docstring `⚠️ DRAFT` del archivo (ya es productivo).

### 1.2 · Migración Alembic

```bash
docker compose exec backend uv run alembic revision --autogenerate -m "B2-02 assessment engine schema"
```

Revisar la migración generada. Verificar:
- Tablas creadas con `org_id` donde aplica
- Enums `pillar_code` creado correctamente
- Constraints únicas presentes

### 1.3 · RLS sobre las tablas con `org_id`

Migración separada `B2-02b enable rls on assessment tables`:

```python
def upgrade():
    for table in ["pillar_assessment_attempts", "user_pillar_states"]:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY;")
        op.execute(f"""
            CREATE POLICY tenant_isolation ON {table}
            USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
            WITH CHECK (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);
        """)
        op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON {table} TO hg_app;")
        op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON {table} TO hg_superadmin;")
    # tablas catalog (instruments, items, responses) — no necesitan RLS
    for table in ["assessment_instruments", "assessment_items"]:
        op.execute(f"GRANT SELECT ON {table} TO hg_app;")
        op.execute(f"GRANT ALL ON {table} TO hg_superadmin;")
```

### 1.4 · Strategy pattern · `hg.modules.learning.scorers/`

Crear nuevo package `scorers/` dentro de `learning/`:

```
apps/backend/src/hg/modules/learning/scorers/
├── __init__.py           # factory get_scorer(pillar) → instancia
├── base.py               # BaseScorer (ABC)
├── purpose.py            # PurposeScorer (P2 · MLQ + Damon)
├── relationships.py      # RelationshipsScorer (P3 · UCLA + Cacioppo)
├── health.py             # HealthScorer (P4 · Prochaska por dominio)
├── inner_peace.py        # InnerPeaceScorer (P5 · ERQ)
├── stability.py          # StabilityScorer (P6 · CD-RISC + CFPB)
└── career.py             # CareerScorer (P1 · PMM v3)
```

**`base.py`**:

```python
from abc import ABC, abstractmethod
from typing import Any

class BaseScorer(ABC):
    """Contrato de un scorer de pilar."""

    pillar_code: str  # override en subclase

    @abstractmethod
    def score(self, responses: dict[str, Any]) -> dict[str, Any]:
        """
        Recibe dict {item_code: response_value} y retorna:
        {
            "state_code": str,           # ej. "Con propósito", "N2", "E5"
            "state_label": str,           # human-readable ES
            "details": dict,              # sub-componentes específicos del pilar
        }
        """

    @abstractmethod
    def next_step(self, current_state: str) -> dict[str, Any]:
        """
        Devuelve la siguiente vía de movimiento dada el estado actual.
        {
            "next_state": str | None,
            "path_recommendation": str,
        }
        """
```

**`purpose.py`** (P2 · MLQ + Damon — usar el guide y el Excel del kit):

```python
class PurposeScorer(BaseScorer):
    pillar_code = "P2"

    LIKERT_MAX = 7
    THRESHOLD = 5.0  # umbral "Alta"

    def score(self, responses: dict) -> dict:
        # Items: A1..A10 con sub_scale 'Presencia' o 'Búsqueda'
        # Item 9 (Presencia) es invertido
        presencia_items = [1, 4, 5, 6]
        item_9_reverse = (self.LIKERT_MAX + 1) - responses["9"]
        presencia = sum([responses[str(i)] for i in presencia_items] + [item_9_reverse]) / 5

        busqueda_items = [2, 3, 7, 8, 10]
        busqueda = sum([responses[str(i)] for i in busqueda_items]) / 5

        if presencia >= self.THRESHOLD and busqueda < self.THRESHOLD:
            state_code = "con_proposito"
            state_label = "Con propósito"
        elif presencia >= self.THRESHOLD and busqueda >= self.THRESHOLD:
            state_code = "sonador"
            state_label = "Soñador"
        elif presencia < self.THRESHOLD and busqueda >= self.THRESHOLD:
            state_code = "diletante"
            state_label = "Diletante"
        else:
            state_code = "desconectado"
            state_label = "Desconectado"

        return {
            "state_code": state_code,
            "state_label": state_label,
            "details": {"presencia": round(presencia, 2), "busqueda": round(busqueda, 2)},
        }

    def next_step(self, current_state: str) -> dict:
        VIAS = {
            "desconectado": ("diletante", "Activar la búsqueda de propósito — micro-cursos auto-conocimiento"),
            "diletante": ("sonador", "Aterrizar la búsqueda en metas — clarificación de valores"),
            "sonador": ("con_proposito", "Convertir intención en compromiso — práctica deliberada"),
            "con_proposito": (None, "Profundizar trascendencia horizontal/vertical (Fase 1.5)"),
        }
        nxt, path = VIAS.get(current_state, (None, "Sin recomendación"))
        return {"next_state": nxt, "path_recommendation": path}
```

Implementar análogamente los otros 5 scorers siguiendo cada `_GUIDE.md` del kit:

- **`relationships.py`** (P3 · UCLA-3 + Cacioppo)
- **`health.py`** (P4 · Prochaska por dominio — devuelve `details` con un estado por dominio)
- **`inner_peace.py`** (P5 · ERQ + 1 item flexibilidad)
- **`stability.py`** (P6 · CD-RISC + CFPB → 2 sub-componentes en `details`)
- **`career.py`** (P1 · PMM v3 — stub por ahora con `TODO(coach): leer matriz de PMM v3 desde HumanGrowth_Matrices_v2.docx`)

**`__init__.py`**:

```python
from hg.modules.learning.scorers.base import BaseScorer
from hg.modules.learning.scorers.purpose import PurposeScorer
from hg.modules.learning.scorers.relationships import RelationshipsScorer
from hg.modules.learning.scorers.health import HealthScorer
from hg.modules.learning.scorers.inner_peace import InnerPeaceScorer
from hg.modules.learning.scorers.stability import StabilityScorer
from hg.modules.learning.scorers.career import CareerScorer

SCORERS = {
    "P1": CareerScorer,
    "P2": PurposeScorer,
    "P3": RelationshipsScorer,
    "P4": HealthScorer,
    "P5": InnerPeaceScorer,
    "P6": StabilityScorer,
}

def get_scorer(pillar: str) -> BaseScorer:
    cls = SCORERS.get(pillar)
    if not cls:
        raise ValueError(f"unknown pillar: {pillar}")
    return cls()
```

**Criterios B2-02:**
- [ ] Modelos productivos en `learning/models.py` (sin DRAFT docstring)
- [ ] Migración generada + RLS aplicado (`B2-02` + `B2-02b`)
- [ ] `make migrate` corre limpio
- [ ] `make db-shell` muestra 5 tablas nuevas (instruments, items, attempts, responses, states)
- [ ] Pruebas RLS: usuario de Org A no ve attempts de Org B
- [ ] Paquete `scorers/` creado con 6 scorers + factory
- [ ] Cada scorer respeta la lógica del `<P>_GUIDE.md` correspondiente del kit
- [ ] Commit: `feat(B2-02): assessment engine schema + modular scorers (strategy pattern)`

---

## TASK B2-03 · Endpoints + seed de instrumentos · `[ ]`

### 2.1 · Seed de instrumentos + items

`apps/backend/scripts/seed_instruments.py`:

```python
"""
Lee los template Excel del Assessment Kit y popula assessment_instruments + items.
Idempotente: si el instrumento+versión ya existe, skip.
"""
from openpyxl import load_workbook
from hg.modules.learning.models import AssessmentInstrument, AssessmentItem, PillarCode
# ...

def seed_p2(db: Session):
    inst = upsert_instrument(
        db,
        pillar=PillarCode.P2,
        code="MLQ-10",
        version="v1.0",
        name="Meaning in Life Questionnaire (Steger)",
        description="10 items · 2 ejes: Presencia + Búsqueda · 4 estados Damon",
        scorer_class="PurposeScorer",
    )
    # Leer items del Excel:
    wb = load_workbook("HG/Artifacts/assessment_kit/P2_Proposito/P2_template.xlsx")
    items_sheet = wb["1_Items"]
    for row in items_sheet.iter_rows(min_row=2, values_only=True):
        if not row[0]:
            continue
        num, sub, text, _crz, _notes, _status = row
        upsert_item(
            db, instrument=inst,
            code=str(num),
            sub_scale=sub,
            text_es=text,
            text_cr=None,  # se actualiza desde Excel cuando los coaches aprueben
            response_type="likert-7",
            response_config={"min": 1, "max": 7, "labels": ["Absolutamente falso", ...]},
            is_reverse_scored=(num == 9),
        )

# Repetir para P3, P4, P5, P6.
# P1 (PMM v3) queda como stub — se hace en sprint separado.
```

Agregar al `Makefile`:

```make
seed-instruments: ## Seed assessment instruments + items
	docker compose exec backend python -m hg.scripts.seed_instruments
```

### 2.2 · Endpoints assessment

`apps/backend/src/hg/modules/learning/router.py` (nuevo o ampliar el existente):

```python
@router.get("/assessment/instruments", response_model=list[InstrumentOut])
def list_instruments(
    pillar: PillarCode | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
): ...

@router.get("/assessment/instruments/{instrument_id}/items", response_model=list[ItemOut])
def list_items_for_instrument(...): ...

@router.post("/assessment/attempts", response_model=AttemptOut)
def start_attempt(
    payload: StartAttemptIn,  # { instrument_id }
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
): ...

@router.post("/assessment/attempts/{attempt_id}/responses", response_model=AttemptOut)
def submit_response(
    attempt_id: UUID,
    payload: SubmitResponseIn,  # { item_id, value }
    ...
): ...

@router.post("/assessment/attempts/{attempt_id}/finalize", response_model=AttemptResultOut)
def finalize_attempt(
    attempt_id: UUID,
    ...
):
    """
    Marca completed_at, ejecuta el scorer correspondiente, actualiza UserPillarState.
    Retorna el resultado completo + next_step.
    """

@router.get("/assessment/me/states", response_model=list[PillarStateOut])
def my_pillar_states(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Lista los 6 pillar states del current user (con None si no completó alguno).
    """

@router.get("/assessment/me/next-recommendation", response_model=PathRecommendationOut)
def my_next_recommendation(...):
    """
    Aplica las reglas de DEC-02 (cuello de botella primero + career_level + combo P4+P5).
    Retorna el pilar prioritario + path recomendado.
    """
```

### 2.3 · Lógica de recomendación de path

`hg/modules/learning/path_recommender.py`:

```python
PRIORITY_ORDER = ["P3", "P5", "P1", "P2", "P4", "P6"]  # del Marco Teórico (impacto profesional)

def recommend_next_path(user: User, states: dict[str, UserPillarState]) -> dict:
    """
    Aplica las reglas:
    1. Combo bloqueante: si P4 y P5 ambos en estado regresivo → wellness primero
    2. Cuello de botella claro: pilar en peor estado → su path
    3. Career level: ajustar al nivel del usuario (PMM)
    4. Default: CP-FOUNDATIONS
    """
    # Implementación según DEC-02 ya documentada
```

### 2.4 · Tests por scorer (1 test = 1 ejemplo del kit)

`apps/backend/tests/test_scorers.py`:

```python
def test_purpose_scorer_con_proposito():
    scorer = PurposeScorer()
    # Andrea con presencia alta, búsqueda baja → "con_proposito"
    responses = {"1": 7, "4": 6, "5": 7, "6": 6, "9": 2,  # presencia alta
                 "2": 3, "3": 2, "7": 3, "8": 2, "10": 3}  # búsqueda baja
    result = scorer.score(responses)
    assert result["state_code"] == "con_proposito"
    assert result["details"]["presencia"] >= 5.0
    assert result["details"]["busqueda"] < 5.0

def test_purpose_scorer_sonador(): ...
def test_purpose_scorer_diletante(): ...
def test_purpose_scorer_desconectado(): ...

# Tests análogos para P3, P4, P5, P6.
```

`test_assessment_endpoints.py`:

- start_attempt crea PillarAssessmentAttempt
- submit_response acumula respuestas
- finalize_attempt ejecuta scorer + actualiza UserPillarState
- /me/states retorna 6 estados (con `null` si no completado)
- /me/next-recommendation aplica reglas DEC-02

### 2.5 · Documentación

- Actualizar `docs/ARCHITECTURE.md` con sección "Assessment Engine":
  - Strategy pattern por pilar
  - Tablas nuevas + RLS
  - Diagrama mermaid del flujo: usuario → cuestionario → scorer → state → recomendación
- Crear `docs/adrs/ADR-0005-modular-assessment-engine.md`:
  - Decisión: scorer por pilar (no fórmula uniforme)
  - Alternativas: suma ponderada uniforme (rechazada por Marco Teórico)
  - Consecuencias: agregar un pilar nuevo = agregar 1 scorer + 1 instrument + N items

**Criterios B2-03:**
- [ ] `seed_instruments.py` corre limpio e idempotente
- [ ] 6 endpoints assessment funcionando
- [ ] Tests scorers: 4 tests por scorer mínimo (1 por estado/nivel) = ~20 tests nuevos
- [ ] Tests endpoints: start → submit → finalize → states OK
- [ ] `make test-backend` ≥ 55 tests passing
- [ ] OpenAPI muestra los nuevos endpoints bajo tag `assessment`
- [ ] ADR-0005 + ARCHITECTURE.md actualizada
- [ ] Commit: `feat(B2-03): assessment endpoints + path recommender + instruments seed`

---

# 🎯 Criterios globales "hecho"

- [ ] 5 tablas nuevas + RLS donde aplica
- [ ] 6 scorers funcionando + tests
- [ ] 6 endpoints assessment + tests
- [ ] Instruments + items seedeados desde los Excel del kit
- [ ] `make test-backend` ≥ 55 tests verdes
- [ ] `make lint-backend` sin errores
- [ ] OpenAPI tag `assessment` con 6+ endpoints
- [ ] ADR-0005 + ARCHITECTURE.md
- [ ] 2 commits: `feat(B2-02)` + `feat(B2-03)`

# Entrega

Reportá al final:
1. SHA de los 2 commits
2. Output de `make test-backend` (resumen contador)
3. Output de `\dt` en DB mostrando tablas nuevas
4. Lista de scorers + ejemplos de su output para los 6 pilares
5. Desviaciones del plan y por qué
6. Pendientes (por ej. PMM v3 stub que requiere matriz formal)

---

## 🟧 Status por TASK

| ID | Subject | Status | Effort sugerido |
|---|---|---|---|
| B2-02 | Schemas + scorers (strategy pattern) | `[ ]` | high |
| B2-03 | Endpoints + seed + tests + docs | `[ ]` | high |

> Estados: `[ ]` pending · `🟧` in progress · `✅` done · `🚫` blocked (con nota)
