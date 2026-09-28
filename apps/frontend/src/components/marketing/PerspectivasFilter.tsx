"use client";

import type { Route } from "next";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { FilterChip } from "@/components/marketing/fx/FilterChip";
import { Reveal, RevealGroup } from "@/components/marketing/fx/Reveal";
import { apiListPerspectives } from "@/lib/api";
import type { PerspectiveSummary } from "@/lib/types";

const PAGE = 12;

/** Feed público de Perspectivas: filtro por content type + grid + cargar más. */
export function PerspectivasFilter() {
  const copy = useMarketingCopy();
  const c = copy.perspectives;
  const ui = copy.perspectivesUi;
  const [active, setActive] = useState<string>("all");
  const [items, setItems] = useState<PerspectiveSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (offset: number) => {
      setLoading(true);
      try {
        const res = await apiListPerspectives({
          content_type: active === "all" ? undefined : active,
          offset,
          limit: PAGE,
        });
        setItems((prev) => (offset === 0 ? res.items : [...prev, ...res.items]));
        setTotal(res.total);
      } catch {
        if (offset === 0) setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [active],
  );

  useEffect(() => {
    void load(0);
  }, [load]);

  return (
    <section className="mx-auto w-full max-w-marketing px-5 pb-24 md:px-8">
      <Reveal className="mb-10 flex flex-wrap gap-2">
        <FilterChip active={active === "all"} onClick={() => setActive("all")}>
          {ui.all}
        </FilterChip>
        {c.contentTypes.map((t) => (
          <FilterChip key={t.id} active={active === t.id} onClick={() => setActive(t.id)}>
            {t.label}
          </FilterChip>
        ))}
      </Reveal>

      {loading && items.length === 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-surface h-64 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center">
          <p className="body-lg text-fg-muted">{c.emptyState}</p>
        </div>
      ) : (
        <>
          <RevealGroup key={active} className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" step={0.05}>
            {items.map((p) => (
              <Link
                key={p.id}
                href={`/perspectivas/${p.slug}` as Route}
                className="fx-spot group flex h-full flex-col overflow-hidden glass-surface-strong"
              >
                <div className="glass-surface aspect-video w-full overflow-hidden">
                  {p.cover_image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.cover_image_url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <span className="glass-surface mb-2 self-start rounded-full px-2.5 py-0.5 text-xs font-medium text-fg-muted">
                    {(ui.typeLabels as Record<string, string>)[p.content_type] ?? p.content_type}
                  </span>
                  <h3 className="font-heading text-lg font-semibold leading-tight text-fg">{p.title}</h3>
                  {p.subtitle && <p className="mt-2 line-clamp-2 text-sm text-fg-muted">{p.subtitle}</p>}
                  <div className="mt-auto pt-3 text-xs text-fg-subtle">
                    {p.author_name ? `${p.author_name} · ` : ""}
                    {p.published_at ? new Date(p.published_at).toLocaleDateString() : ""}
                    {p.read_minutes_estimated ? ` · ${p.read_minutes_estimated} min` : ""}
                  </div>
                </div>
              </Link>
            ))}
          </RevealGroup>
          {items.length < total && (
            <div className="mt-10 text-center">
              <button
                type="button"
                disabled={loading}
                onClick={() => void load(items.length)}
                className="glass-fill-strong rounded-xl px-6 py-2.5 font-sans text-sm font-semibold text-fg transition-colors hover:text-primary disabled:opacity-60"
              >
                {loading ? ui.loading : ui.loadMore}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
