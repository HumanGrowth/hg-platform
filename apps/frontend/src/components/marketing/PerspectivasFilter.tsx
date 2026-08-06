"use client";

import type { Route } from "next";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { BrandSawWave } from "@/components/motion/BrandSawWave";
import { BubbleField } from "@/components/motion/BubbleField";
import { DecoLayer } from "@/components/motion/DecoLayer";
import { apiListPerspectives } from "@/lib/api";
import type { PerspectiveSummary } from "@/lib/types";

const TYPE_LABEL: Record<string, string> = {
  blog: "Blog",
  article: "Artículo",
  business_case: "Case",
  whitepaper: "Whitepaper",
};

const PAGE = 12;

/** Feed público de Perspectivas: filtro por content type + grid + cargar más. */
export function PerspectivasFilter() {
  const c = useMarketingCopy().perspectives;
  const [active, setActive] = useState<string>("all");
  const [items, setItems] = useState<PerspectiveSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const chip = (isActive: boolean) =>
    `px-3.5 py-2 rounded-full text-[13px] font-medium cursor-pointer transition-colors border ${
      isActive
        ? "bg-hg-ink text-hg-cream border-transparent"
        : "bg-transparent text-hg-charcoal border-border-strong hover:bg-bg-sunken"
    }`;

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
    <section className="landing-flow-section max-w-marketing mx-auto px-8">
      <DecoLayer>
        <BrandSawWave width={260} teeth={7} height={18} rotation={-10} top="30%" right="2%" color="var(--hg-gold)" opacity={0.3} speed={0.1} />
        <BubbleField seed={32} count={4} />
      </DecoLayer>
      <div className="mb-10 flex flex-wrap gap-2">
        <button type="button" className={chip(active === "all")} onClick={() => setActive("all")}>
          Todo
        </button>
        {c.contentTypes.map((t) => (
          <button key={t.id} type="button" className={chip(active === t.id)} onClick={() => setActive(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && items.length === 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-bg-sunken" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center">
          <p className="body-lg text-fg-muted">{c.emptyState}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <Link
                key={p.id}
                href={`/perspectivas/${p.slug}` as Route}
                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-bg-raised transition-shadow hover:shadow-md"
              >
                <div className="aspect-video w-full overflow-hidden bg-bg-sunken">
                  {p.cover_image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.cover_image_url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <span className="mb-2 self-start rounded-full bg-bg-sunken px-2.5 py-0.5 text-xs font-medium text-fg-muted">
                    {TYPE_LABEL[p.content_type] ?? p.content_type}
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
          </div>
          {items.length < total && (
            <div className="mt-10 text-center">
              <button
                type="button"
                disabled={loading}
                onClick={() => void load(items.length)}
                className="rounded-md border border-border-strong px-6 py-2.5 font-sans text-sm font-semibold text-fg hover:bg-bg-sunken disabled:opacity-60"
              >
                {loading ? "Cargando…" : "Cargar más"}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
