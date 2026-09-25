import Link from "next/link";

export type PathStyle = {
  faces?: string[];
  cohort?: number;
  dark?: boolean;
};

export type PathContent = {
  category: string;
  meta: string;
  title: string;
  body: string;
};

export type Path = PathStyle & PathContent;

export function PathCard({ path, cohortLabel }: { path: Path; cohortLabel?: string }) {
  const dark = !!path.dark;
  return (
    <Link
      href="/paths"
      className={`fx-spot group relative flex min-h-[280px] flex-col gap-4 overflow-hidden rounded-lg p-6 ${
        dark ? "bg-hg-ink text-hg-cream" : "glass-surface-strong"
      }`}
      style={{ ["--glow" as string]: dark ? "232,160,48" : "74,122,84" }}
    >
      <div className="flex items-start justify-between">
        <div className="eyebrow" style={{ color: dark ? "var(--hg-amber)" : "var(--hg-orange-700)" }}>
          {path.category}
        </div>
        <span className={`body-xs ${dark ? "text-[#B3B0A8]" : "text-fg-muted"}`}>{path.meta}</span>
      </div>
      <h3
        className="display m-0 transition-transform duration-300 group-hover:translate-x-1"
        style={{ fontSize: 32, lineHeight: 0.98, letterSpacing: "-0.01em", color: "inherit" }}
      >
        {path.title}
      </h3>
      <p className={`mt-auto text-sm leading-[1.5] ${dark ? "text-[#B3B0A8]" : "text-fg-muted"}`}>{path.body}</p>
      {path.cohort != null && (
        <div className="flex items-center justify-between">
          <div className="flex">
            {(path.faces ?? []).map((c, i) => (
              <div
                key={i}
                className="h-7 w-7 rounded-full transition-transform duration-300 group-hover:-translate-y-0.5"
                style={{
                  background: c,
                  border: `2px solid ${dark ? "var(--text-strong)" : "var(--surface-page)"}`,
                  marginLeft: i ? -10 : 0,
                  transitionDelay: `${i * 40}ms`,
                }}
              />
            ))}
          </div>
          <span className={`font-mono text-xs ${dark ? "text-[#B3B0A8]" : "text-fg-muted"}`}>
            {path.cohort} {cohortLabel}
          </span>
        </div>
      )}
    </Link>
  );
}
