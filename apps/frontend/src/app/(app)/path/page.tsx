import { PathBottleneckCta } from "@/components/path/PathBottleneckCta";
import { PathLanes } from "@/components/path/PathLanes";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";

export const metadata = { title: "Mi Ruta — Human Growth" };

// Mi Ruta: los 6 pilares como carriles, con las 3 primeras learning units
// por pilar desde el backend (TASK lu-refine-B-03 — antes mostraba
// events). El catálogo de events heredado sigue vivo en /eventos.
export default function PathPage() {
  return (
    <div className="mx-auto max-w-app px-6 py-10">
      <Eyebrow className="mb-2">Mi Ruta</Eyebrow>
      <Display className="mb-2 text-4xl">Tu recorrido en 6 dimensiones</Display>
      <p className="mb-8 max-w-prose text-fg-muted">
        Cada carril agrupa tus módulos por dimensión. Empezá por la que más lo necesita.
      </p>
      <PathBottleneckCta />
      <PathLanes />
    </div>
  );
}
