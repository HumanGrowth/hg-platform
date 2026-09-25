"use client";

import { CheckCircle2, Clock } from "lucide-react";
import * as React from "react";

import { Eyebrow } from "@/components/ui/eyebrow";
import {
  apiGetBehaviorMatrix,
  apiGetPillarFeedback,
  apiUpsertBehaviorEvaluations,
  apiUpsertPillarFeedback,
  ApiError,
} from "@/lib/api";
import { toast } from "@/lib/toast-store";
import type { BehaviorMatrix, PillarBehaviors, PillarFeedback } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";

const FEEDBACK_MAX_CHARS = 2000;

const RATING_OPTIONS: { value: 1 | 2 | 3; label: string }[] = [
  { value: 1, label: "Sin demostrar" },
  { value: 2, label: "En progreso" },
  { value: 3, label: "Demostrando" },
];

interface Props {
  userId: string;
}

/** Matriz de comportamientos del pilar en curso — el manager califica cada
 * comportamiento en 3 puntos. Guardado optimista: la fila muestra el rating
 * elegido de inmediato y confirma/revierte según la respuesta del PUT
 * (`apiUpsertBehaviorEvaluations`), que trae la matriz recalculada
 * (`manager_approved`) para el estado de aprobación del badge de nivel. */
export function BehaviorMatrixCard({ userId }: Props) {
  const [matrix, setMatrix] = React.useState<BehaviorMatrix | null>(null);
  const [status, setStatus] = React.useState<"loading" | "error" | "ok" | "empty">("loading");
  const [savingIds, setSavingIds] = React.useState<Set<string>>(new Set());
  const [feedback, setFeedback] = React.useState<Map<string, PillarFeedback>>(new Map());

  const load = React.useCallback(async () => {
    setStatus("loading");
    try {
      const data = await apiGetBehaviorMatrix(userId);
      setMatrix(data);
      setStatus(data.pillars.every((p) => p.behaviors.length === 0) ? "empty" : "ok");
    } catch {
      setStatus("error");
      return;
    }
    // El feedback de pilar es aditivo: si falla, la matriz sigue siendo usable.
    try {
      const rows = await apiGetPillarFeedback(userId);
      setFeedback(new Map(rows.map((f) => [`${f.dimension_code}:${f.pillar_code}`, f])));
    } catch {
      setFeedback(new Map());
    }
  }, [userId]);

  async function saveFeedback(pillarCode: string, text: string) {
    if (!matrix) return;
    const saved = await apiUpsertPillarFeedback(userId, matrix.dimension_code, pillarCode, text);
    setFeedback((m) => new Map(m).set(`${saved.dimension_code}:${saved.pillar_code}`, saved));
  }

  React.useEffect(() => {
    void load();
  }, [load]);

  async function rate(behaviorId: string, rating: 1 | 2 | 3) {
    if (!matrix) return;
    const previous = matrix;
    // Optimista: refleja el rating elegido ya mismo en la fila.
    setMatrix({
      ...matrix,
      pillars: matrix.pillars.map((p) => ({
        ...p,
        behaviors: p.behaviors.map((b) =>
          b.behavior_id === behaviorId ? { ...b, rating } : b,
        ),
      })),
    });
    setSavingIds((s) => new Set(s).add(behaviorId));
    try {
      const updated = await apiUpsertBehaviorEvaluations(userId, [
        { behavior_id: behaviorId, rating },
      ]);
      setMatrix(updated);
    } catch (e) {
      setMatrix(previous);
      toast(
        e instanceof ApiError && e.status === 422
          ? "No se pudo guardar: comportamiento inválido."
          : "No se pudo guardar la calificación.",
        "danger",
      );
    } finally {
      setSavingIds((s) => {
        const next = new Set(s);
        next.delete(behaviorId);
        return next;
      });
    }
  }

  if (status === "loading") {
    return (
      <div className="glass-surface-strong rounded-lg border border-border bg-bg-raised p-5">
        <div className="h-24 animate-pulse rounded-md bg-bg-sunken" />
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="glass-surface-strong rounded-lg border border-border bg-bg-raised p-5 text-sm text-fg-muted">
        No pudimos cargar la matriz de comportamientos.
      </div>
    );
  }
  if (!matrix || status === "empty") {
    return (
      <div className="rounded-lg border border-dashed border-border bg-bg-sunken p-5 text-sm text-fg-muted">
        Todavía no hay comportamientos cargados para {matrix?.dimension_name ?? "esta dimensión"}.
      </div>
    );
  }

  const current = matrix.pillars.find((p) => p.is_current);
  const rest = matrix.pillars.filter((p) => !p.is_current);

  return (
    <section className="glass-surface-strong rounded-lg border border-border bg-bg-raised p-5">
      <Eyebrow className="mb-1">Comportamientos del pilar en curso</Eyebrow>
      <p className="mb-4 text-xs text-fg-subtle">{matrix.dimension_name}</p>

      {current ? (
        <>
          <PillarTable pillar={current} savingIds={savingIds} onRate={rate} />
          <CoachingTips tips={current.coaching_tips} />
          <PillarFeedbackBox
            key={`${current.pillar_code}:${feedback.get(`${matrix.dimension_code}:${current.pillar_code}`)?.updated_at ?? ""}`}
            saved={feedback.get(`${matrix.dimension_code}:${current.pillar_code}`)}
            onSave={(text) => saveFeedback(current.pillar_code, text)}
          />
        </>
      ) : (
        <p className="text-sm text-fg-muted">Sin un pilar en curso identificado todavía.</p>
      )}

      <ApprovalStatus matrix={matrix} />

      {rest.length > 0 && (
        <details className="mt-5 rounded-md border border-border">
          <summary className="cursor-pointer select-none px-4 py-2.5 font-sans text-sm font-semibold text-fg">
            Otros pilares de {matrix.dimension_name} ({rest.length})
          </summary>
          <div className="flex flex-col gap-5 border-t border-border p-4">
            {rest.map((p) => (
              <div key={p.pillar_code} className="flex flex-col gap-3">
                <PillarTable pillar={p} savingIds={savingIds} onRate={rate} />
                {feedback.has(`${matrix.dimension_code}:${p.pillar_code}`) && (
                  <details className="rounded-md border border-border">
                    <summary className="cursor-pointer select-none px-3 py-2 font-sans text-xs font-semibold text-fg-muted">
                      Feedback que dejaste en este pilar
                    </summary>
                    <div className="border-t border-border p-3">
                      <PillarFeedbackBox
                        saved={feedback.get(`${matrix.dimension_code}:${p.pillar_code}`)}
                        onSave={(text) => saveFeedback(p.pillar_code, text)}
                        hideTitle
                      />
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

/** El manager tiene la decisión final: el badge de nivel de esta dimensión
 * solo se otorga si, además de aprendizaje+assessment, TODOS los
 * comportamientos activos están calificados "Demostrando". No es una
 * ponderación numérica — es un estado de verificación. */
function ApprovalStatus({ matrix }: { matrix: BehaviorMatrix }) {
  if (matrix.manager_approved) {
    return (
      <p className="mt-4 flex items-center gap-1.5 text-xs text-success">
        <CheckCircle2 size={14} strokeWidth={2} className="shrink-0" />
        Aprobado — habilita el badge de nivel de {matrix.dimension_name} (junto con el completion de
        aprendizaje y assessment).
      </p>
    );
  }
  return (
    <p className="mt-4 flex items-center gap-1.5 text-xs text-fg-subtle">
      <Clock size={14} strokeWidth={2} className="shrink-0" />
      Pendiente de aprobación — calificá "Demostrando" todos los comportamientos activos para
      habilitar el badge de nivel de {matrix.dimension_name}.
    </p>
  );
}

function PillarTable({
  pillar,
  savingIds,
  onRate,
}: {
  pillar: PillarBehaviors;
  savingIds: Set<string>;
  onRate: (behaviorId: string, rating: 1 | 2 | 3) => void;
}) {
  return (
    <div>
      <p className="mb-2 font-sans text-sm font-semibold text-fg">{pillar.pillar_name}</p>
      <ul className="flex flex-col gap-3">
        {pillar.behaviors.map((b) => (
          <li key={b.behavior_id} className="glass-inset rounded-md p-3">
            <p className="text-sm text-fg">{b.text}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <div
                role="radiogroup"
                aria-label={b.text}
                className="inline-flex overflow-hidden rounded-md border border-border"
              >
                {RATING_OPTIONS.map((opt, i) => {
                  const checked = b.rating === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      onClick={() => onRate(b.behavior_id, opt.value)}
                      className={`px-3 py-1.5 font-sans text-xs font-semibold transition-colors ${
                        i > 0 ? "border-l border-border" : ""
                      } ${
                        checked
                          ? "bg-hg-amber text-white"
                          : "bg-bg-raised text-fg-muted hover:bg-bg-sunken"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {savingIds.has(b.behavior_id) && (
                <span className="text-xs text-fg-subtle">Guardando…</span>
              )}
              {!savingIds.has(b.behavior_id) && b.rating !== null && b.evaluated_by_name && (
                <span className="text-xs text-fg-subtle">
                  {b.evaluated_by_name}
                  {b.updated_at ? ` · ${formatRelativeTime(b.updated_at)}` : ""}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** "Feedback que impulsa": texto libre del manager sobre el pilar, que el
 * colaborador ve en Mi Ruta al terminarlo. Se guarda con botón explícito (no
 * autosave) para no publicar texto largo a medio escribir. Es informativo:
 * no bloquea el avance del colaborador. */
function PillarFeedbackBox({
  saved,
  onSave,
  hideTitle,
}: {
  saved: PillarFeedback | undefined;
  onSave: (text: string) => Promise<void>;
  hideTitle?: boolean;
}) {
  const [text, setText] = React.useState(saved?.text ?? "");
  const [saving, setSaving] = React.useState(false);
  const baseline = saved?.text ?? "";
  const dirty = text.trim() !== baseline.trim();
  const canSave = dirty && text.trim().length > 0 && !saving;

  async function submit() {
    setSaving(true);
    try {
      await onSave(text.trim());
      toast("Feedback guardado.", "success");
    } catch {
      toast("No se pudo guardar el feedback.", "danger");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={hideTitle ? "" : "mt-5"}>
      {!hideTitle && (
        <label htmlFor="pillar-feedback" className="mb-1 block font-sans text-sm font-semibold text-fg">
          Feedback que impulsa
        </label>
      )}
      <p className="mb-2 text-xs text-fg-subtle">
        Lo verá el colaborador en Mi Ruta al terminar el pilar. No reemplaza las notas privadas por
        comportamiento.
      </p>
      <textarea
        id={hideTitle ? undefined : "pillar-feedback"}
        aria-label="Feedback que impulsa"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={FEEDBACK_MAX_CHARS}
        rows={4}
        placeholder="Qué viste, qué sigue y cómo impulsarlo…"
        className="w-full resize-y rounded-md border border-border bg-bg-raised p-3 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-hg-amber"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-xs text-fg-subtle">
          {saved && !dirty
            ? `Guardado${saved.updated_at ? ` · ${formatRelativeTime(saved.updated_at)}` : ""}`
            : `${text.length}/${FEEDBACK_MAX_CHARS}`}
        </span>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!canSave}
          className="rounded-md bg-hg-amber px-3 py-1.5 font-sans text-xs font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar feedback"}
        </button>
      </div>
    </div>
  );
}

/** "Tips para acompañar este pilar": contenido curado por el equipo (no
 * generado). Panel colapsable en vez de columna de tabla — la fila ya tiene
 * texto + 3 botones y una columna extra se aprieta en mobile. */
function CoachingTips({ tips }: { tips: string[] | undefined }) {
  if (!tips || tips.length === 0) return null;
  return (
    <details className="mt-4 rounded-md border border-border">
      <summary className="cursor-pointer select-none px-4 py-2.5 font-sans text-sm font-semibold text-fg">
        Tips para acompañar este pilar
      </summary>
      <ul className="flex list-disc flex-col gap-2 border-t border-border py-3 pl-8 pr-4 text-sm text-fg-muted">
        {tips.slice(0, 4).map((tip, i) => (
          <li key={i}>{tip}</li>
        ))}
      </ul>
    </details>
  );
}
