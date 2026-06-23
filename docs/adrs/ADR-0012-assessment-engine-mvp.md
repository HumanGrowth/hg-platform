# ADR-0012 — Motor de assessment MVP (multi-instrumento)

- **Estado:** Aceptado
- **Fecha:** 2026-06-23
- **Entregables relacionados:** B2-02 (backend) · B2-03 (frontend)
- **Doc firmado:** `HG/Docs/HG_Evaluacion_Pilares.pdf` (52 ítems P2-P6) · `HG_Propuesta_Assessment_v1_5.md`

## Contexto

El radar y el onboarding estaban mockeados. Hay que medir los 6 pilares con
instrumentos psicométricos validados. La estructura del resultado **no es
uniforme**: Propósito usa 4 estados no lineales (Damon), Salud usa etapas de
cambio (Prochaska), Relaciones/Paz Interior usan 4 niveles, Resiliencia/Finanzas
3 niveles ordinales, Carrera 6 niveles (PMM v3). El radar muestra **estados, no
scores 0-100 uniformes**.

## Decisión

- **Strategy pattern multi-modelo:** 7 scorers (uno por pilar: P1,P2,P3,P4,P5,
  P6A,P6B) detrás de un `ScorerRegistry`. Cada uno encapsula su estructura y sus
  umbrales clínicos exactos del doc firmado.
- **9 instrumentos / 57 ítems** seedeados (`seed_assessment.py`): P2-P6 transcritos
  **literal** del PDF firmado; P1 PMM v3 (5 competencias × 6 niveles) compuesto
  según el Marco Teórico. Ítems invertidos: MLQ-5, AAQ-B1, CFPB-B4.
- **2 niveles de resultado:** `preliminary` (del onboarding corto de 18 ítems,
  ~5-6 min) y `confirmed` (del detalle por pilar, 52 ítems). El preliminary se
  puede upgradear inmediatamente; el confirmed re-evalúa a los 30 días (o al
  completar un path).
- **P3 N4 (Generativo) lo confirma el usuario, no el manager:** el scorer marca
  `requires_user_confirmation` y el estado queda en N3 hasta que el user se
  reconoce en el perfil (no es deducible por puntaje).
- **P4 recaída** no degrada el estado pero levanta `recaida_detected` (alerta al
  coach) cuando la conducta no respalda el hábito declarado (E5).
- **Adapter pattern (`TraditionalForm`):** Capa 1 es Q&A clásico; el modelo de
  datos (`AssessmentResponse.qualitative_text`, `presentation_mode`) habilita la
  Capa 2 conversacional (v1.5) sin rework.
- **Privacidad:** colaborador + coach + manager directo ven **estados y vías**;
  el manager NUNCA ve respuestas item-by-item (lee `UserLearningProfile.
  pillar_states`, no `assessment_responses`). RLS por org en sessions/responses/
  results/profiles.
- **Sin scores uniformes ni chatbot.** No se inventaron ítems psicométricos.

## Modelo

`AssessmentInstrument → AssessmentItem (+ AssessmentItemOption) → AssessmentSession
→ AssessmentResponse → [scorer] → PillarResult → UserLearningProfile.pillar_states`
(snapshot read-optimized). Catálogo global sin RLS; lo demás con RLS por org.

## Endpoints

`POST /assessment/sessions` · `GET /sessions/{id}` · `POST /sessions/{id}/respond`
· `POST /sessions/{id}/finalize` · `POST /sessions/{id}/abandon` ·
`GET /assessment/me/results` · `POST /me/results/{pillar}/confirm` ·
`POST /admin/users/{id}/reset-retake/{pillar}`.

## Consecuencias

- ✅ Onboarding y radar reales con instrumentos validados; `/home` y `/team/[id]`
  consumen estados reales con vías de movimiento accionables.
- ✅ El adapter deja lista la Capa 2 conversacional sin migración.
- ⚠️ Scoring on-demand en `finalize` (no materializado); aceptable para MVP.
- ⚠️ El subset corto (18 ítems) da un `preliminary` con menos precisión que el
  detalle; por eso se etiqueta "Estimación rápida" y se ofrece confirmar.
- ⚠️ La atribución de minutos/streak y el scoring asumen respuestas honestas (sin
  detección de patrones de respuesta) — fuera de scope MVP.
