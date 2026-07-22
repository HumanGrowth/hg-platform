"use client";

import { useParams, useRouter } from "next/navigation";
import * as React from "react";

import { TraditionalForm } from "@/components/assessment/TraditionalForm";
import { EmptyRing } from "@/components/EmptyRing";
import { apiFinalizeSession, apiGetSession, apiRespondItem } from "@/lib/api";
import type { AssessmentItem, AssessmentSession } from "@/lib/types";
import { toast } from "@/lib/toast-store";

/** Un item ya respondido en esta sesión (para navegar "Anterior"). */
interface AnsweredEntry {
  item: AssessmentItem;
  value: number;
}

export default function OnboardingSessionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sessionId = params.id;
  const [session, setSession] = React.useState<AssessmentSession | null>(null);
  const [status, setStatus] = React.useState<"loading" | "error" | "ok">("loading");
  const [submitting, setSubmitting] = React.useState(false);
  const startRef = React.useRef<number>(Date.now());

  // Historial de respuestas de ESTA sesión (TASK polish-05). `reviewIndex`:
  // null = pregunta viva (session.next_item); un número = revisando el item
  // ya respondido en esa posición del historial (respuesta editable).
  const [history, setHistory] = React.useState<AnsweredEntry[]>([]);
  const [reviewIndex, setReviewIndex] = React.useState<number | null>(null);

  const load = React.useCallback(async () => {
    setStatus("loading");
    try {
      setSession(await apiGetSession(sessionId));
      setHistory([]);
      setReviewIndex(null);
      setStatus("ok");
      startRef.current = Date.now();
    } catch {
      setStatus("error");
    }
  }, [sessionId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const reviewing = reviewIndex !== null;
  const currentItem = reviewing ? history[reviewIndex].item : (session?.next_item ?? null);
  const selectedValue = reviewing ? history[reviewIndex].value : null;
  const canGoBack = reviewing ? reviewIndex > 0 : history.length > 0;

  function goBack() {
    setReviewIndex((idx) => {
      if (idx === null) return history.length - 1; // desde la viva → última respondida
      return Math.max(0, idx - 1);
    });
  }

  async function handleSubmit(value: number, qualitativeText?: string) {
    if (!currentItem || submitting) return;
    setSubmitting(true);
    try {
      const updated = await apiRespondItem(sessionId, {
        item_id: currentItem.id,
        response_value: value,
        qualitative_text: qualitativeText,
        response_time_ms: Date.now() - startRef.current,
      });

      if (reviewing) {
        // Editando una respuesta previa: se actualiza en el server (record_response
        // hace update idempotente) y avanzamos por el historial. La secuencia es
        // de orden fijo, así que editar no reordena los items siguientes.
        setHistory((h) => h.map((e, i) => (i === reviewIndex ? { ...e, value } : e)));
        setReviewIndex((idx) => {
          const nextIdx = (idx ?? 0) + 1;
          return nextIdx < history.length ? nextIdx : null; // volvió a la viva
        });
        startRef.current = Date.now();
        return;
      }

      // Respondiendo la pregunta viva.
      const answeredItem = currentItem;
      if (updated.next_item === null) {
        await apiFinalizeSession(sessionId);
        router.push(`/onboarding/result/${sessionId}`);
        return;
      }
      setHistory((h) => [...h, { item: answeredItem, value }]);
      setSession(updated);
      startRef.current = Date.now();
    } catch {
      toast("No pudimos guardar tu respuesta. Probá de nuevo.", "danger");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[640px] flex-col justify-center px-6 py-12">
      {status === "loading" && (
        <div className="flex justify-center py-20">
          <EmptyRing label="Cargando tu evaluación…" />
        </div>
      )}
      {status === "error" && (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <p className="text-fg-muted">No pudimos cargar la evaluación.</p>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-md border border-border-strong px-5 py-2 font-sans text-sm font-semibold text-fg hover:bg-bg-sunken"
          >
            Reintentar
          </button>
        </div>
      )}
      {status === "ok" && currentItem && session && (
        <TraditionalForm
          key={currentItem.id}
          item={currentItem}
          onSubmit={handleSubmit}
          isLoading={submitting}
          answered={reviewing ? (reviewIndex ?? 0) : session.answered_items}
          total={session.total_items}
          selectedValue={selectedValue}
          onBack={goBack}
          canGoBack={canGoBack}
        />
      )}
      {status === "ok" && !reviewing && session && !session.next_item && (
        <div className="flex justify-center py-20">
          <EmptyRing label="Calculando tus resultados…" />
        </div>
      )}
    </div>
  );
}
