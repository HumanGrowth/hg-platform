"use client";

import { useParams, useRouter } from "next/navigation";
import * as React from "react";

import { TraditionalForm } from "@/components/assessment/TraditionalForm";
import { EmptyRing } from "@/components/EmptyRing";
import { apiFinalizeSession, apiGetSession, apiRespondItem } from "@/lib/api";
import type { AssessmentSession } from "@/lib/types";
import { toast } from "@/lib/toast-store";

export default function OnboardingSessionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sessionId = params.id;
  const [session, setSession] = React.useState<AssessmentSession | null>(null);
  const [status, setStatus] = React.useState<"loading" | "error" | "ok">("loading");
  const [submitting, setSubmitting] = React.useState(false);
  const startRef = React.useRef<number>(Date.now());

  const load = React.useCallback(async () => {
    setStatus("loading");
    try {
      setSession(await apiGetSession(sessionId));
      setStatus("ok");
      startRef.current = Date.now();
    } catch {
      setStatus("error");
    }
  }, [sessionId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(value: number, qualitativeText?: string) {
    if (!session?.next_item || submitting) return;
    setSubmitting(true);
    try {
      const updated = await apiRespondItem(sessionId, {
        item_id: session.next_item.id,
        response_value: value,
        qualitative_text: qualitativeText,
        response_time_ms: Date.now() - startRef.current,
      });
      if (updated.next_item === null) {
        await apiFinalizeSession(sessionId);
        router.push(`/onboarding/result/${sessionId}`);
        return;
      }
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
      {status === "ok" && session?.next_item && (
        <TraditionalForm
          item={session.next_item}
          onSubmit={handleSubmit}
          isLoading={submitting}
          answered={session.answered_items}
          total={session.total_items}
        />
      )}
      {status === "ok" && session && !session.next_item && (
        <div className="flex justify-center py-20">
          <EmptyRing label="Calculando tus resultados…" />
        </div>
      )}
    </div>
  );
}
