import { Radar } from "@/components/radar/Radar";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { RadarValues } from "@/components/radar/radar-model";
import { getCopy } from "@/lib/i18n";

// Datos ilustrativos — NO llama al backend (items 23-24).
const SAMPLE: RadarValues = { P1: 62, P2: 78, P3: 55, P4: 70, P5: 48, P6: 65 };

/** Radar de marca (home + /metodo) con datos de ejemplo. */
export default function MarketingRadar() {
  const c = getCopy("es");
  return (
    <section className="max-w-marketing mx-auto px-8 py-20">
      <div className="flex flex-col items-center text-center">
        <Eyebrow accent className="mb-4">
          {c.marketingRadar.eyebrow}
        </Eyebrow>
        <Display as="h2" variant="display-3" className="mb-10">
          {c.marketingRadar.title}
        </Display>
        <Radar values={SAMPLE} state="complete" size="large" />
        <p className="body-sm mt-6 max-w-[420px] text-fg-subtle">{c.marketingRadar.caption}</p>
      </div>
    </section>
  );
}
