import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { getCopy } from "@/lib/i18n";
import { pillarIconSrc } from "@/lib/pillars";

/**
 * Las 6 dimensiones (items 9-11). Cada card muestra el hex icon del pilar como
 * watermark sutil al costado derecho (~3/4 visible). id="dimensiones" es el
 * destino del scroll del hero (web-v2-01).
 */
export default function SixPillars() {
  const c = getCopy("es").sixPillars;
  return (
    <section
      id="dimensiones"
      className="scroll-mt-24 bg-surface-card border-t border-b border-border"
    >
      <div className="max-w-marketing mx-auto px-8 py-32">
        <div className="max-w-[760px] mb-14">
          <Eyebrow accent className="mb-4">
            {c.eyebrow}
          </Eyebrow>
          <Display as="h2" variant="display-2" className="max-w-[720px]">
            {c.title}
          </Display>
          <p className="text-hg-charcoal text-[18px] leading-[1.5] mt-5 max-w-[560px]">
            {c.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {c.items.map((item) => {
            const src = pillarIconSrc(item.code);
            return (
              <article
                key={item.code}
                className="relative overflow-hidden rounded-lg border border-border bg-surface-page p-8 min-h-[240px]"
              >
                {src && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={src}
                    alt=""
                    aria-hidden
                    className="absolute -right-8 -top-4 h-48 w-48 select-none opacity-[0.10] pointer-events-none md:h-56 md:w-56"
                  />
                )}
                <div className="relative z-10">
                  <div className={`h-2 w-12 rounded-full bg-pillar-${item.code.toLowerCase()}`} />
                  <h3 className="mt-4 font-heading text-xl font-semibold text-fg">{item.title}</h3>
                  <p className="body-sm mt-2 max-w-[24rem] text-hg-charcoal">{item.body}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
