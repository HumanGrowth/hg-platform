import {
  BarChart3,
  Calendar,
  Gauge,
  MessageCircle,
  Route as RouteIcon,
  Users,
} from "lucide-react";

import { HeroWatermark } from "@/components/marketing/HeroWatermark";
import { getCopy } from "@/lib/i18n";

export const metadata = { title: "Plataforma · Human Growth" };

const ICONS: Record<string, typeof BarChart3> = {
  chart: BarChart3,
  route: RouteIcon,
  users: Users,
  gauge: Gauge,
  message: MessageCircle,
  calendar: Calendar,
};

// Contenido real basado en features de la app (decisión F, web-v3-09).
export default function PlataformaPage() {
  const c = getCopy("es").plataforma;
  return (
    <div className="landing-flow">
      <section className="landing-flow-section landing-flow-hero relative max-w-marketing mx-auto px-8">
        <HeroWatermark />
        <div className="relative max-w-[920px]">
          <div className="eyebrow eyebrow-accent mb-6">{c.hero.eyebrow}</div>
          <h1 className="display text-fg m-0 text-5xl sm:text-6xl">{c.hero.title}</h1>
          <p className="mt-6 max-w-[620px] text-lg text-hg-charcoal">{c.hero.subtitle}</p>
        </div>
      </section>

      <section className="landing-flow-section max-w-marketing mx-auto grid gap-6 px-8 md:grid-cols-3">
        {c.features.map((f) => {
          const Icon = ICONS[f.icon];
          return (
            <article
              key={f.title}
              className="rounded-lg border border-border bg-surface-card p-8"
            >
              {Icon ? <Icon size={28} strokeWidth={1.75} className="text-primary" aria-hidden /> : null}
              <h3 className="mt-3 font-heading text-lg font-semibold text-fg">{f.title}</h3>
              <p className="body-sm mt-3 text-hg-charcoal">{f.desc}</p>
            </article>
          );
        })}
      </section>
    </div>
  );
}
