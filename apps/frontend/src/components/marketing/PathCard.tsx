import { getCopy } from "@/lib/i18n";

export type PathStyle = {
  faces: string[];
  cohort: number;
  dark?: boolean;
};

export type PathContent = {
  category: string;
  meta: string;
  title: string;
  body: string;
};

export type Path = PathStyle & PathContent;

export function PathCard({ path, cohortLabel }: { path: Path; cohortLabel: string }) {
  const dark = !!path.dark;
  return (
    <div
      className={`rounded-lg p-6 flex flex-col gap-4 min-h-[320px] cursor-pointer transition-shadow ${
        dark ? "" : "hover:shadow-md"
      }`}
      style={{
        background: dark ? "var(--ink-900)" : "var(--cream-100)",
        color: dark ? "var(--cream-100)" : "var(--ink-900)",
        border: dark ? "none" : "1px solid var(--border)",
      }}
    >
      <div className="flex justify-between items-start">
        <div className="eyebrow" style={{ color: dark ? "var(--amber)" : "var(--orange-700)" }}>
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
        style={{ color: dark ? "#B3B0A8" : "var(--ink-800)" }}
      >
        {path.body}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex">
          {path.faces.map((c, i) => (
            <div
              key={i}
              className="w-7 h-7 rounded-full"
              style={{
                background: c,
                border: `2px solid ${dark ? "var(--ink-900)" : "var(--cream-100)"}`,
                marginLeft: i ? -10 : 0,
              }}
            />
          ))}
        </div>
        <span className="font-mono text-xs" style={{ color: dark ? "#B3B0A8" : "var(--fg-muted)" }}>
          {path.cohort} {cohortLabel}
        </span>
      </div>
    </div>
  );
}

const styles: PathStyle[] = [
  { faces: ["#C8A76E", "#4A7A54", "#A8C4A0"], cohort: 312 },
  { faces: ["#1A1A1A", "#C8A76E", "#6B7061"], cohort: 184, dark: true },
  { faces: ["#A8C4A0", "#E8530A", "#2A2826"], cohort: 96 },
];

export function FeaturedPaths() {
  const c = getCopy("es");
  const cohortLabel = c.paths.cohort;
  return (
    <section className="max-w-marketing mx-auto px-8 py-32">
      <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
        <h2 className="display m-0 text-[40px] sm:text-[48px] lg:text-[56px]">{c.paths.heading}</h2>
        <div className="flex gap-2 flex-wrap">
          {c.paths.filters.map((name, i) => (
            <span
              key={name}
              className="px-3.5 py-2 rounded-full text-[13px] font-medium cursor-pointer"
              style={{
                background: i === 0 ? "var(--ink-900)" : "transparent",
                color: i === 0 ? "var(--cream-100)" : "var(--ink-800)",
                border: i === 0 ? "none" : "1px solid var(--border-strong)",
              }}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {c.paths.items.map((content, i) => (
          <PathCard key={content.title} path={{ ...content, ...styles[i] }} cohortLabel={cohortLabel} />
        ))}
      </div>
    </section>
  );
}
