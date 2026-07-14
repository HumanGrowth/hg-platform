"use client";

/* eslint-disable @next/next/no-img-element */
import { Play } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import type { Course } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

export function CourseCard({ course }: { course: Course }) {
  const [imgOk, setImgOk] = React.useState(true);
  const showImg = Boolean(course.thumbnail_url) && imgOk;

  return (
    <Link
      href={`/eventos/${course.slug}` as Route}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-bg-raised text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber"
    >
      <div className="relative aspect-video w-full bg-bg-sunken">
        {showImg ? (
          <img
            src={course.thumbnail_url as string}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setImgOk(false)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-fg-subtle">
            <Play size={28} strokeWidth={1.75} />
          </div>
        )}
        <span className="absolute bottom-2 right-2 rounded bg-hg-ink/80 px-1.5 py-0.5 font-mono text-xs text-white">
          {formatDuration(course.duration_seconds)}
        </span>
      </div>
      <div className="flex flex-col gap-2 p-4">
        <h3 className="line-clamp-2 font-sans text-sm font-semibold text-fg">{course.title}</h3>
        <div className="flex flex-wrap gap-2">
          <Badge>{course.career_level}</Badge>
          {course.competency_code && <Badge>{course.competency_code}</Badge>}
        </div>
      </div>
    </Link>
  );
}
