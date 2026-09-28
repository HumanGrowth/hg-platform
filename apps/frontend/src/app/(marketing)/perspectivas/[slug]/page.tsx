import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PerspectiveDetailContent } from "@/components/marketing/PerspectiveDetailContent";
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

  return <PerspectiveDetailContent post={post} />;
}
