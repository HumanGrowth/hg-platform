import { MarkdownBody } from "@/components/modulos/blocks/MarkdownBody";
import { QuoteMark } from "@/components/ui/brand";
import { cn } from "@/lib/utils";

import { SourceLine, TemplateEyebrow, type TemplateProps } from "./parts";
import { EMPHASIS } from "./style";

/** Separa las líneas `> cita` (no `>>`) del resto del cuerpo. */
function splitQuoteLines(body: string): { quote: string | null; rest: string } {
  const quoteLines: string[] = [];
  const restLines: string[] = [];
  for (const line of body.split("\n")) {
    if (/^\s*>(?!>)/.test(line)) quoteLines.push(line.replace(/^\s*>\s?/, "").trim());
    else restLines.push(line);
  }
  return {
    quote: quoteLines.length ? quoteLines.join(" ").trim() : null,
    rest: restLines.join("\n").replace(/\n{3,}/g, "\n\n").trim(),
  };
}

/**
 * Quote: QuoteMark grande + la frase en display (Anton) + atribución. La frase sale
 * de `pull_quote` → líneas `> cita` del cuerpo → el cuerpo entero. La frase se
 * renderiza como headline (`>> …`) para reusar el estilo display y que sus marcadores
 * inline (`==`, `**`) sigan funcionando.
 */
export function QuoteTemplate({ block, body, p }: TemplateProps) {
  const pull = block.presentation?.pull_quote;
  const fromBody = pull ? null : splitQuoteLines(body);
  const quoteText = pull?.text ?? fromBody?.quote ?? null;
  const rest = pull ? body : (fromBody?.quote ? fromBody.rest : "");
  const size = EMPHASIS[p.emphasis];
  const showMark = p.motif === "quote";

  return (
    <div className="flex flex-col gap-5">
      <TemplateEyebrow label={block.eyebrow} p={p} />
      {showMark && <QuoteMark size={size.quoteMark} tone={p.accent.quote} />}
      {quoteText ? (
        <MarkdownBody variant={p.t.md} emphasis={p.emphasis} className={size.quote}>
          {`>> ${quoteText.replace(/\s*\n+\s*/g, " ")}`}
        </MarkdownBody>
      ) : (
        <MarkdownBody variant={p.t.md} emphasis={p.emphasis} className={size.body}>
          {body}
        </MarkdownBody>
      )}
      {pull?.attribution && (
        <p className={cn("font-heading text-base font-semibold", p.accent.text)}>— {pull.attribution}</p>
      )}
      {rest && (
        <MarkdownBody variant={p.t.md} emphasis={p.emphasis} className={size.body}>
          {rest}
        </MarkdownBody>
      )}
      <SourceLine block={block} p={p} />
    </div>
  );
}
