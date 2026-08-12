"use client";

import { useParams, useRouter } from "next/navigation";
import * as React from "react";

import { TraditionalForm } from "@/components/assessment/TraditionalForm";
import { EmptyRing } from "@/components/EmptyRing";
import { apiFinalizeSession, apiGetMyResults, apiRespondItem, apiStartSession } from "@/lib/api";
import { DIMENSION_NAMES } from "@/lib/assessment-utils";
import type { AssessmentDimensionCode, AssessmentSession } from "@/lib/types";
import { toast } from "@/lib/toast-store";

const VALID: AssessmentDimensionCode[] = ["P1", "P2", "P3", "P4", "P5", "P6A", "P6B"];

export default function PillarDetailPage() {
  const params = useParams<{ pillar: string }>();
  const router = useRouter();
  const pillar = params.pillar as AssessmentDimensionCode;
  const [session, setSession] = React.useState<AssessmentSession | null>(null);
  const [status, setStatus] = React.useState<"loading" | "error" | "ok">("loading");
  const [submitting, setSubmitting] = React.useState(false);
  const startRef = React.useRef<number>(Date.now());
  const startedRef = React.useRef(false);

  const begin = React.useCallback(async () => {
    setStatus("loading");
    try {
      // Gate: el deep-dive de una dimensión requiere un resultado preliminar de la
      // evaluación inicial. Sin él el backend responde 422 y el usuario veía un
      // error opaco ("No se pudo iniciar…"). Si falta, lo mandamos a la
      // evaluación inicial en vez de fallar.
      const { results } = await apiGetMyResults();
      if (!results.some((r) => r.dimension_code === pillar)) {
        toast("Primero completá tu evaluación inicial.", "default");
        router.replace("/onboarding/welcome");
        return;
      }
      const s = await apiStartSession({ kind: "dimension_detail", target_dimension: pillar });
      setSession(s);
      setStatus("ok");
      startRef.current = Date.now();
    } catch (e) {
      // Red de seguridad: si el start falla con un 422 de regla de negocio,
      // guiamos al usuario en vez de mostrar el error opaco.
      const status = (e as { response?: { status?: number } })?.response?.status;
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      if (status === 422 && typeof detail === "string") {
        if (detail.includes("preliminar")) {
          toast("Primero completá tu evaluación inicial.", "default");
          router.replace("/onboarding/welcome");
          return;
        }
        if (detail.includes("no disponible")) {
          toast("Ya evaluaste esta dimensión. Vas a poder reevaluarla más adelante.", "default");
          router.replace("/perfil");
          return;
        }
      }
      setStatus("error");
    }
  }, [pillar, router]);

  React.useEffect(() => {
    if (!VALID.includes(pillar)) {
      router.replace("/home");
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;
    void begin();
  }, [pillar, begin, router]);

  async function handleSubmit(value: number) {
    if (!session?.next_item || submitting) return;
    setSubmitting(true);
    try {
      const updated = await apiRespondItem(session.id, {
        item_id: session.next_item.id,
        response_value: value,
        response_time_ms: Date.now() - startRef.current,
      });
      if (updated.next_item === null) {
        await apiFinalizeSession(session.id);
        toast("Evaluación confirmada.", "success");
        router.push("/home");
        return;
      }
      setSession(updated);
      startRef.current = Date.now();
    } catch {
      toast("No pudimos guardar tu respuesta.", "danger");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[640px] flex-col justify-center px-6 py-12">
      <p className="mb-6 text-center font-sans text-sm font-semibold text-primary">
        Evaluación detallada · {DIMENSION_NAMES[pillar] ?? pillar}
      </p>
      {status === "loading" && (
        <div className="flex justify-center py-20">
          <EmptyRing label="Preparando la evaluación…" />
        </div>
      )}
      {status === "error" && (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <p className="text-fg-muted">No se pudo iniciar la evaluación de esta dimensión.</p>
          <button
            type="button"
            onClick={() => void begin()}
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
          <EmptyRing label="Calculando tu resultado…" />
        </div>
      )}
    </div>
  );
}
