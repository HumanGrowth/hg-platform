import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { Perspective } from "@/lib/types";

const API =
  process.env.API_BASE_URL_INTERNAL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000";

async function getPost(slug: string): Promise<Perspective | null> {
  try {
    const res = await fetch(`${API}/api/v1/perspectives/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as Perspective;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) return { title: "Perspectivas — Human Growth" };
  const description = post.subtitle ?? undefined;
  return {
    title: `${post.title} — Human Growth`,
    description,
    openGraph: {
      type: "article",
      title: post.title,
      description,
      images: post.cover_image_url ? [{ url: post.cover_image_url }] : undefined,
    },
  };
}

export default async function PerspectiveDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getPost(params.slug);
  if (!post) notFound();

  const dateLabel = post.published_at ? new Date(post.published_at).toLocaleDateString() : "";

  return (
    <div className="landing-flow">
      <article className="max-w-marketing mx-auto px-8 py-16">
        <div className="mx-auto max-w-[760px]">
          <div className="eyebrow eyebrow-accent mb-4">
            {{ blog: "Blog", article: "Artículo", business_case: "Business Case", whitepaper: "Whitepaper" }[post.content_type]}
          </div>
          <h1 className="display text-fg m-0 text-4xl leading-tight sm:text-5xl">{post.title}</h1>
          {post.subtitle && (
            <p className="mt-5 text-[19px] leading-[1.5] text-hg-charcoal">{post.subtitle}</p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
            {post.author_name && <span className="font-medium text-fg">{post.author_name}</span>}
            {dateLabel && <span>· {dateLabel}</span>}
            {post.read_minutes_estimated ? <span>· {post.read_minutes_estimated} min</span> : null}
          </div>

          {post.cover_image_url && (
            <div className="mt-8 aspect-video w-full overflow-hidden rounded-xl bg-bg-sunken">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.cover_image_url} alt="" className="h-full w-full object-cover" />
            </div>
          )}

          {post.business_case && (
            <div className="mt-10 flex flex-col gap-6">
              {post.business_case.industry && (
                <span className="self-start rounded-full bg-bg-sunken px-3 py-1 text-sm text-fg-muted">
                  {post.business_case.industry}
                  {post.business_case.org_client_name ? ` · ${post.business_case.org_client_name}` : ""}
                </span>
              )}
              {post.business_case.challenge && (
                <div>
                  <h2 className="font-heading text-xl font-semibold text-fg">El desafío</h2>
                  <p className="mt-2 whitespace-pre-line text-hg-charcoal">{post.business_case.challenge}</p>
                </div>
              )}
              {post.business_case.solution && (
                <div>
                  <h2 className="font-heading text-xl font-semibold text-fg">La solución</h2>
                  <p className="mt-2 whitespace-pre-line text-hg-charcoal">{post.business_case.solution}</p>
                </div>
              )}
              {post.business_case.metrics.length > 0 && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {post.business_case.metrics.map((m, i) => (
                    <div key={i} className="rounded-xl border border-border bg-bg-raised p-4 text-center">
                      <div className="font-mono text-2xl font-semibold text-primary">{m.value}</div>
                      <div className="mt-1 text-xs text-fg-muted">{m.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {post.whitepaper && (
            <div className="mt-10 flex flex-col gap-6">
              {post.whitepaper.abstract && (
                <p className="whitespace-pre-line text-[17px] leading-[1.7] text-hg-charcoal">
                  {post.whitepaper.abstract}
                </p>
              )}
              {post.whitepaper.pdf_url && (
                <a
                  href={post.whitepaper.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="self-start rounded-md bg-primary px-6 py-3 font-semibold text-white hover:bg-primary-hover"
                >
                  Descargar PDF →
                </a>
              )}
            </div>
          )}

          {post.body_markdown && (
            <div className="mt-10 text-[17px] leading-[1.7] text-hg-charcoal [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-border-strong [&_blockquote]:pl-4 [&_blockquote]:italic [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-fg [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-fg [&_li]:ml-5 [&_li]:list-disc [&_p]:my-4">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body_markdown}</ReactMarkdown>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
