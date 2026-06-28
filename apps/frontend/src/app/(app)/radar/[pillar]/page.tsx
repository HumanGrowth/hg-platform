import Link from "next/link";
import { notFound } from "next/navigation";

import { PILLAR_LABEL, type PillarCode } from "@/components/radar/radar-model";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";

const CODES: PillarCode[] = ["P1", "P2", "P3", "P4", "P5", "P6"];

// Stub de detalle por pilar — el contenido por dimensión se conecta al motor luego.
export default function PillarDetailPage({ params }: { params: { pillar: string } }) {
  const code = params.pillar.toUpperCase() as PillarCode;
  if (!CODES.includes(code)) notFound();
  return (
    <div className="mx-auto max-w-app px-6 py-10">
      <Link href="/radar" className="font-sans text-sm font-semibold text-orange-700">
        ← Volver al radar
      </Link>
      <Eyebrow className="mb-2 mt-6">{code}</Eyebrow>
      <Display className="text-4xl">{PILLAR_LABEL[code]}</Display>
    </div>
  );
}
