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
      className={`rounded-lg p-6 flex flex-col gap-4 min-h-[280px] transition-shadow ${
        dark ? "" : "hover:shadow-md"
      }`}
      style={{
        background: dark ? "var(--text-strong)" : "var(--surface-page)",
        color: dark ? "var(--surface-page)" : "var(--text-strong)",
        border: dark ? "none" : "1px solid var(--border)",
      }}
    >
      <div className="flex justify-between items-start">
        <div className="eyebrow" style={{ color: dark ? "var(--hg-amber)" : "var(--hg-orange-700)" }}>
          {path.category}
        </div>
        <span className="body-xs" style={{ color: dark ? "#B3B0A8" : "var(--fg-muted)" }}>
          {path.meta}
        </span>
      </div>
      <h3
        className="display m-0"
        style={{ fontSize: 32, lineHeight: 0.98, letterSpacing: "-0.01em", color: "inherit" }}
      >
        {path.title}
      </h3>
      <p
        className="text-sm leading-[1.5] mt-auto"
        style={{ color: dark ? "#B3B0A8" : "var(--hg-charcoal)" }}
      >
        {path.body}
      </p>
      {path.cohort != null && (
        <div className="flex items-center justify-between">
          <div className="flex">
            {(path.faces ?? []).map((c, i) => (
              <div
                key={i}
                className="w-7 h-7 rounded-full"
                style={{
                  background: c,
                  border: `2px solid ${dark ? "var(--text-strong)" : "var(--surface-page)"}`,
                  marginLeft: i ? -10 : 0,
                }}
              />
            ))}
          </div>
          <span className="font-mono text-xs" style={{ color: dark ? "#B3B0A8" : "var(--fg-muted)" }}>
            {path.cohort} {cohortLabel}
          </span>
        </div>
      )}
    </Link>
  );
}
