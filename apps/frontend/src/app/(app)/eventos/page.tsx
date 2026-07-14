"use client";

import { Library as LibraryIcon } from "lucide-react";
import * as React from "react";

import { CourseCard } from "@/components/library/CourseCard";
import { EmptyRing } from "@/components/EmptyRing";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { apiListCourses } from "@/lib/api";
import type { CompetencyCode, Course, CourseLevel } from "@/lib/types";
import { isFixtureCourse } from "@/lib/utils";

const LEVELS: CourseLevel[] = ["L1", "L2", "L3", "L4", "L5", "L6"];
const COMPETENCIES: CompetencyCode[] = ["C1", "C2", "C3", "C4", "C5"];
type Mode = "competency" | "foundation";

export default function LibraryPage() {
  const [mode, setMode] = React.useState<Mode>("competency");
  const [level, setLevel] = React.useState<CourseLevel | null>(null);
  const [competency, setCompetency] = React.useState<CompetencyCode | null>(null);
  const [status, setStatus] = React.useState<"loading" | "error" | "ok">("loading");
  const [courses, setCourses] = React.useState<Course[]>([]);

  const load = React.useCallback(async () => {
    setStatus("loading");
    try {
      const res = await apiListCourses({
        level: level ?? undefined,
        competency: mode === "competency" ? (competency ?? undefined) : undefined,
        track: mode === "competency" ? "competency" : undefined,
        limit: 60,
      });
      const visible = res.items.filter((c) => !isFixtureCourse(c.slug));
      const items =
        mode === "foundation" ? visible.filter((c) => c.track !== "competency") : visible;
      setCourses(items);
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }, [level, competency, mode]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="mx-auto w-full max-w-app px-6 py-10">
      <Eyebrow accent>Eventos</Eyebrow>
      <Display variant="display-2" className="mt-2">
        Carrera
      </Display>
      <p className="mt-3 max-w-prose text-md text-fg-muted">
        Eventos del catálogo. Filtrá por nivel y competencia.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
        {/* Filtros */}
        <aside className="flex flex-col gap-6">
          <div>
            <Eyebrow className="mb-3">Tipo</Eyebrow>
            <div className="flex flex-wrap gap-2">
              <Chip active={mode === "competency"} onClick={() => setMode("competency")}>
                Competencias
              </Chip>
              <Chip
                active={mode === "foundation"}
                onClick={() => {
                  setMode("foundation");
                  setCompetency(null);
                }}
              >
                Foundations
              </Chip>
            </div>
          </div>
          <div>
            <Eyebrow className="mb-3">Nivel</Eyebrow>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((l) => (
                <Chip key={l} active={level === l} onClick={() => setLevel(level === l ? null : l)}>
                  {l}
                </Chip>
              ))}
            </div>
          </div>
          {mode === "competency" && (
            <div>
              <Eyebrow className="mb-3">Competencia</Eyebrow>
              <div className="flex flex-wrap gap-2">
                {COMPETENCIES.map((c) => (
                  <Chip
                    key={c}
                    active={competency === c}
                    onClick={() => setCompetency(competency === c ? null : c)}
                  >
                    {c}
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Grid */}
        <section>
          {status === "loading" && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-video w-full rounded-lg bg-bg-sunken" />
                  <div className="mt-3 h-4 w-3/4 rounded bg-bg-sunken" />
                </div>
              ))}
            </div>
          )}

          {status === "error" && (
            <Card className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <p className="font-sans text-md font-semibold text-fg">
                No pudimos cargar el catálogo.
              </p>
              <button
                type="button"
                onClick={() => void load()}
                className="rounded-md bg-primary px-5 py-2 font-sans text-sm font-semibold text-white hover:bg-primary-hover"
              >
                Reintentar
              </button>
            </Card>
          )}

          {status === "ok" && courses.length === 0 && (
            <Card className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <LibraryIcon size={32} strokeWidth={1.75} className="text-fg-subtle" />
              <EmptyRing label="Sin eventos para estos filtros. Probá otro nivel o competencia." />
            </Card>
          )}

          {status === "ok" && courses.length > 0 && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
