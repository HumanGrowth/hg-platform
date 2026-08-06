"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Editor Markdown con preview lado a lado (cierre-beta CMS · fallback sin Tiptap). */
export function MarkdownEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={20}
        placeholder="Escribí en Markdown…  # Título, **negrita**, - listas, [link](url)"
        className="w-full rounded-md border border-border bg-bg-raised px-3 py-2 font-mono text-sm text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-hg-amber/40"
      />
      <div className="max-h-[520px] overflow-auto rounded-md border border-border bg-bg-raised px-4 py-3 text-sm leading-relaxed text-fg [&_a]:text-primary [&_a]:underline [&_h1]:mb-2 [&_h1]:mt-3 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-4 [&_li]:list-disc [&_p]:my-2">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{value || "_Vista previa…_"}</ReactMarkdown>
      </div>
    </div>
  );
}
