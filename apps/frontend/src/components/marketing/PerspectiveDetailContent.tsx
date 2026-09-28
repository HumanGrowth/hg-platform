"use client";

import { ArrowRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Tr } from "@/components/marketing/LocalizedText";
import { Reveal } from "@/components/marketing/fx/Reveal";
import { WordReveal } from "@/components/marketing/fx/WordReveal";
import type { Perspective } from "@/lib/types";

/**
 * Contenido de /perspectivas/[slug] (client): mismo lenguaje visual del resto
 * del sitio glass — Reveal/WordReveal, tokens de tema (fg/fg-muted, no
 * hg-charcoal fijo) y badges/CTA en glass en vez de los rellenos planos
 * bg-sunken de la versión pre-rediseño.
 */
export function PerspectiveDetailContent({ post }: { post: Perspective }) {
  const dateLabel = post.published_at ? new Date(post.published_at).toLocaleDateString() : "";

  return (
    <div className="landing-flow">
      <article className="mx-auto w-full max-w-marketing px-5 pb-16 pt-32 md:px-8 md:pb-24 md:pt-40">
        <div className="mx-auto max-w-[760px]">
          <Reveal>
            <div className="eyebrow eyebrow-accent mb-4">
              <Tr k={`perspectivesUi.detailTypeLabels.${post.content_type}`} />
            </div>
          </Reveal>
          <WordReveal
            text={post.title}
            as="h1"
            className="display m-0 text-4xl leading-tight text-fg sm:text-5xl"
          />
          <Reveal delay={0.15}>
            {post.subtitle && (
              <p className="mt-5 text-[19px] leading-[1.5] text-fg-muted">{post.subtitle}</p>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
              {post.author_name && <span className="font-medium text-fg">{post.author_name}</span>}
              {dateLabel && <span>· {dateLabel}</span>}
              {post.read_minutes_estimated ? <span>· {post.read_minutes_estimated} min</span> : null}
            </div>
          </Reveal>

          {post.cover_image_url && (
            <Reveal variant="scale" delay={0.2}>
              <div className="mt-8 aspect-video w-full overflow-hidden rounded-xl border border-border glass-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.cover_image_url} alt="" className="h-full w-full object-cover" />
              </div>
            </Reveal>
          )}

          {post.business_case && (
            <Reveal delay={0.25}>
              <div className="mt-10 flex flex-col gap-6">
                {post.business_case.industry && (
                  <span className="glass-surface self-start rounded-full px-3 py-1 text-sm text-fg-muted">
                    {post.business_case.industry}
                    {post.business_case.org_client_name ? ` · ${post.business_case.org_client_name}` : ""}
                  </span>
                )}
                {post.business_case.challenge && (
                  <div>
                    <h2 className="font-heading text-xl font-semibold text-fg">
                      <Tr k="perspectivesUi.challenge" />
                    </h2>
                    <p className="mt-2 whitespace-pre-line text-fg-muted">{post.business_case.challenge}</p>
                  </div>
                )}
                {post.business_case.solution && (
                  <div>
                    <h2 className="font-heading text-xl font-semibold text-fg">
                      <Tr k="perspectivesUi.solution" />
                    </h2>
                    <p className="mt-2 whitespace-pre-line text-fg-muted">{post.business_case.solution}</p>
                  </div>
                )}
                {post.business_case.metrics.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {post.business_case.metrics.map((m, i) => (
                      <div key={i} className="glass-surface-strong p-4 text-center">
                        <div className="font-mono text-2xl font-semibold text-primary">{m.value}</div>
                        <div className="mt-1 text-xs text-fg-muted">{m.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Reveal>
          )}

          {post.whitepaper && (
            <Reveal delay={0.25}>
              <div className="mt-10 flex flex-col gap-6">
                {post.whitepaper.abstract && (
                  <p className="whitespace-pre-line text-[17px] leading-[1.7] text-fg-muted">
                    {post.whitepaper.abstract}
                  </p>
                )}
                {post.whitepaper.pdf_url && (
                  <a
                    href={post.whitepaper.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fx-cta fx-cta-shine group relative inline-flex w-fit items-center gap-2 overflow-hidden rounded-xl bg-primary px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_30px_-10px_rgba(74,122,84,0.8)] hover:bg-primary-hover"
                  >
                    <span className="relative z-10">
                      <Tr k="perspectivesUi.downloadPdf" />
                    </span>
                    <ArrowRight
                      size={16}
                      strokeWidth={2}
                      aria-hidden
                      className="relative z-10 transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </a>
                )}
              </div>
            </Reveal>
          )}

          {post.body_markdown && (
            <Reveal delay={0.3}>
              <div className="mt-10 text-[17px] leading-[1.7] text-fg-muted [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-border-strong [&_blockquote]:pl-4 [&_blockquote]:italic [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-fg [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-fg [&_li]:ml-5 [&_li]:list-disc [&_p]:my-4">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body_markdown}</ReactMarkdown>
              </div>
            </Reveal>
          )}
        </div>
      </article>
    </div>
  );
}
