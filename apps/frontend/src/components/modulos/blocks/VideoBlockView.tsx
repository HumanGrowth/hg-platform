"use client";

import { Check } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { VideoBlock } from "@/lib/types";

/**
 * MVP (TASK B-06): iframe simple sin progress tracking granular vía JSAPI —
 * el usuario marca "Ya lo vi" manualmente. Auto-tracking de watch% queda
 * para una iteración siguiente (el spec del prompt lo marca como aceptable
 * para Fase 1: "marca completed on click 'Ya lo vi' manual").
 */
export function VideoBlockView({
  block,
  isCompleted,
  onCompleteBlock,
}: {
  block: VideoBlock;
  isCompleted: boolean;
  onCompleteBlock: () => Promise<void>;
}) {
  const [marking, setMarking] = React.useState(false);

  async function markSeen() {
    if (isCompleted || marking) return;
    setMarking(true);
    try {
      await onCompleteBlock();
    } finally {
      setMarking(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {block.eyebrow_label && <Eyebrow accent>{block.eyebrow_label}</Eyebrow>}
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-hg-ink">
        {/* Interim: TASK lu-refine-B-02 reemplaza este iframe por un <video> nativo. */}
        <iframe
          className="h-full w-full"
          src={block.video_url}
          title="Video del módulo"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      {isCompleted ? (
        <div className="flex items-center gap-2 self-start font-sans text-sm font-semibold text-success">
          <Check size={18} strokeWidth={2} /> Visto
        </div>
      ) : (
        <Button variant="secondary" size="sm" onClick={() => void markSeen()} disabled={marking} className="self-start">
          {marking ? "Guardando…" : "Ya lo vi"}
        </Button>
      )}
    </div>
  );
}
