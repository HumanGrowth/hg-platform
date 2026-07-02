"use client";

import Link from "next/link";
import * as React from "react";

import { CourseCard } from "@/components/library/CourseCard";
import { apiListCoursesForPath, apiListPaths } from "@/lib/api";
import { PILLARS } from "@/lib/pillars";
import type { CareerPath, Course } from "@/lib/types";

const DOT: Record<string, string> = Object.fromEntries(PILLARS.map((p) => [p.id, p.dot]));

interface Lane {
  path: CareerPath;
  courses: Course[];
}

export function PathLanes() {
  const [status, setStatus] = React.useState<"loading" | "error" | "ok">("loading");
  const [lanes, setLanes] = React.useState<Lane[]>([]);

  const load = React.useCallback(async () => {
    setStatus("loading");
    try {
      const paths = await apiListPaths();
      const lanes = await Promise.all(
        paths.map(async (path) => {
          const { items } = await apiListCoursesForPath(path.code, { limit: 3 });
          return { path, courses: items };
        }),
      );
      setLanes(lanes);
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (status === "loading") {
    return (
      <div className="flex flex-col gap-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-bg-sunken" />
        ))}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-lg border border-border bg-bg-raised p-8 text-center">
        <p className="mb-3 font-sans text-sm font-semibold text-fg">No pudimos cargar tu ruta.</p>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md bg-orange px-5 py-2 font-sans text-sm font-semibold text-white hover:bg-orange-600"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {lanes.map(({ path, courses }) => (
        <section key={path.id} id={`lane-${path.code}`} className="scroll-mt-24">
          <div className="mb-3 flex items-center gap-3">
            <span className={`h-3 w-3 shrink-0 rounded-full ${DOT[path.code] ?? "bg-fg-subtle"}`} />
            <h2 className="font-sans text-lg font-semibold text-fg">{path.name}</h2>
            <span className="font-mono text-xs text-fg-subtle">{path.code}</span>
          </div>
          {courses.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-bg-raised px-5 py-6 text-sm text-fg-muted">
              Próximamente · contenido en producción
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </section>
      ))}

      <div>
        <Link href="/library" className="font-sans text-sm font-semibold text-orange-700">
          Explorar la biblioteca completa →
        </Link>
      </div>
    </div>
  );
}
