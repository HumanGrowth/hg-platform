"use client";

import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { VideoPlayer } from "@/components/video/VideoPlayer";
import { Badge } from "@/components/ui/badge";
import { ApiError, apiGetCourse } from "@/lib/api";
import { toast } from "@/lib/toast-store";
import type { CourseDetail } from "@/lib/types";
import { useThrottledProgress } from "@/lib/use-throttled-progress";
import { formatDuration } from "@/lib/utils";

export function CourseDetailView({ slug }: { slug: string }) {
  const router = useRouter();
  const [status, setStatus] = React.useState<"loading" | "error" | "ok">("loading");
  const [course, setCourse] = React.useState<CourseDetail | null>(null);
  const [resumeOpen, setResumeOpen] = React.useState(false);
  const [startAt, setStartAt] = React.useState(0);
  const [ready, setReady] = React.useState(false);
  const [completed, setCompleted] = React.useState(false);
  const { report, flush } = useThrottledProgress(slug);

  const load = React.useCallback(async () => {
    setStatus("loading");
    try {
      const c = await apiGetCourse(slug);
      setCourse(c);
      setCompleted(Boolean(c.progress?.is_completed));
      const last = c.progress?.last_position_seconds ?? 0;
      if (last > 5 && !c.progress?.is_completed) {
        setResumeOpen(true);
      } else {
        setReady(true);
      }
      setStatus("ok");
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        toast("Curso no encontrado", "danger");
        router.replace("/library");
        return;
      }
      setStatus("error");
    }
  }, [slug, router]);

  React.useEffect(() => {
    void load();
  }, [load]);

  // Flush final del último progreso al salir.
  React.useEffect(() => {
    const onLeave = () => flush();
    window.addEventListener("pagehide", onLeave);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("pagehide", onLeave);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [flush]);

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-app px-6 py-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="aspect-video w-full animate-pulse rounded-lg bg-bg-sunken" />
          <div className="h-64 animate-pulse rounded-lg bg-bg-sunken" />
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto max-w-app px-6 py-20 text-center">
        <p className="mb-4 font-sans text-md font-semibold text-fg">No pudimos cargar el curso.</p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-md bg-orange px-5 py-2 font-sans text-sm font-semibold text-white hover:bg-orange-600"
          >
            Reintentar
          </button>
          <Link
            href="/library"
            className="rounded-md border border-border px-5 py-2 font-sans text-sm font-semibold text-fg hover:bg-bg-sunken"
          >
            Volver a biblioteca
          </Link>
        </div>
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="mx-auto max-w-app px-6 py-8">
      <Link
        href="/library"
        className="mb-5 inline-flex items-center gap-1.5 font-sans text-sm font-semibold text-fg-muted hover:text-fg"
      >
        <ArrowLeft size={16} strokeWidth={1.75} />
        Volver a biblioteca
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-5">
          {ready && course.hls_master_url ? (
            <VideoPlayer
              src={course.hls_master_url}
              poster={course.thumbnail_url}
              startAt={startAt}
              onProgress={report}
              onComplete={() => {
                setCompleted(true);
                toast("¡Lo terminaste!", "success");
              }}
            />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-ink-900 text-cream-200">
              {course.hls_master_url ? "Cargando…" : "Video no disponible"}
            </div>
          )}
          {course.description && (
            <p className="max-w-prose text-md leading-relaxed text-fg-muted">{course.description}</p>
          )}
        </div>

        <aside className="flex h-fit flex-col gap-4 rounded-lg border border-border bg-bg-raised p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{course.career_level}</Badge>
            {course.competency_code && <Badge>{course.competency_code}</Badge>}
            <span className="font-mono text-xs text-fg-subtle">
              {formatDuration(course.duration_seconds)}
            </span>
          </div>
          <h1 className="font-sans text-xl font-semibold text-fg">{course.title}</h1>
          {completed && (
            <div className="flex items-center gap-2 font-sans text-sm font-semibold text-success">
              <CheckCircle2 size={18} strokeWidth={1.75} />
              Completado
            </div>
          )}
        </aside>
      </div>

      {/* Diálogo de reanudación */}
      {resumeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-6">
          <div className="w-full max-w-sm rounded-lg border border-border bg-bg-raised p-6 text-center">
            <h2 className="mb-2 font-sans text-lg font-semibold text-fg">¿Dónde querés seguir?</h2>
            <p className="mb-5 text-sm text-fg-muted">
              Dejaste este curso en {formatDuration(course.progress?.last_position_seconds ?? 0)}.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setStartAt(course.progress?.last_position_seconds ?? 0);
                  setResumeOpen(false);
                  setReady(true);
                }}
                className="rounded-md bg-orange px-5 py-2.5 font-sans text-sm font-semibold text-white hover:bg-orange-600"
              >
                Reanudar desde {formatDuration(course.progress?.last_position_seconds ?? 0)}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStartAt(0);
                  setResumeOpen(false);
                  setReady(true);
                }}
                className="rounded-md border border-border px-5 py-2.5 font-sans text-sm font-semibold text-fg hover:bg-bg-sunken"
              >
                Empezar de nuevo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
