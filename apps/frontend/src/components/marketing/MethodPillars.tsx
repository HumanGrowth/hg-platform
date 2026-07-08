import { HexIcon } from "@/components/ui/hex-icon";

export interface MethodPillar {
  code: string;
  name: string;
  tag: string;
  desc: string;
}

/**
 * Los 6 pilares en /metodo, versión user-friendly (web-v3-08 · decisión K):
 * qué mide + ruta de crecimiento, sin jerga académica ni citas. La
 * investigación completa vive en el marco teórico interno.
 */
export function MethodPillars({ pillars }: { pillars: readonly MethodPillar[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {pillars.map((p) => (
        <article
          key={p.code}
          className="flex flex-col gap-3 rounded-lg border border-border bg-surface-card p-7"
        >
          <div className="flex items-center justify-between gap-3">
            <HexIcon pillar={p.code} size={40} />
            <span className="font-mono text-xs text-fg-subtle">{p.tag}</span>
          </div>
          <h3 className="font-heading text-lg font-semibold leading-tight text-fg">{p.name}</h3>
          <p className="text-sm leading-[1.55] text-hg-charcoal">{p.desc}</p>
        </article>
      ))}
    </div>
  );
}
