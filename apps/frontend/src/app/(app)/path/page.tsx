import Link from "next/link";

import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PILLARS } from "@/lib/pillars";

export const metadata = { title: "Mi Ruta — Human Growth" };

// Mi Ruta: los 6 pilares como carriles. La Biblioteca vive acá como sub-vista
// (antes era destino propio /library). El contenido por carril se conecta luego.
export default function PathPage() {
  return (
    <div className="mx-auto max-w-app px-6 py-10">
      <Eyebrow className="mb-2">Mi Ruta</Eyebrow>
      <Display className="mb-2 text-4xl">Tu recorrido en 6 dimensiones</Display>
      <p className="mb-8 max-w-prose text-fg-muted">
        Cada carril agrupa tus rutas activas por dimensión. Empezá por la que más lo necesita.
      </p>

      <div className="flex flex-col gap-3">
        {PILLARS.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-4 rounded-lg border border-border bg-bg-raised px-5 py-4"
          >
            <span className={`h-3 w-3 shrink-0 rounded-full ${p.dot}`} />
            <div className="min-w-0 flex-1">
              <p className="font-sans text-sm font-semibold text-fg">{p.name}</p>
              <p className="font-sans text-xs text-fg-muted">Sin rutas activas todavía</p>
            </div>
            <span className="font-mono text-xs text-fg-subtle">{p.id}</span>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <Link href="/library" className="font-sans text-sm font-semibold text-orange-700">
          Explorar la biblioteca completa →
        </Link>
      </div>
    </div>
  );
}
