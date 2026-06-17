import { PathLanes } from "@/components/path/PathLanes";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";

export const metadata = { title: "Mi Ruta — Human Growth" };

// Mi Ruta: los 6 pilares como carriles, con los 3 primeros cursos por pilar
// desde el backend. La Biblioteca completa vive en /library.
export default function PathPage() {
  return (
    <div className="mx-auto max-w-app px-6 py-10">
      <Eyebrow className="mb-2">Mi Ruta</Eyebrow>
      <Display className="mb-2 text-4xl">Tu recorrido en 6 dimensiones</Display>
      <p className="mb-8 max-w-prose text-fg-muted">
        Cada carril agrupa tus cursos por dimensión. Empezá por la que más lo necesita.
      </p>
      <PathLanes />
    </div>
  );
}
