import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";

export const metadata = { title: "Mi Radar — Human Growth" };

// Stub — el Radar interactivo + lista de pilares se construye en FE-v2-08.
export default function RadarPage() {
  return (
    <div className="mx-auto max-w-app px-6 py-10">
      <Eyebrow className="mb-2">Mi Radar</Eyebrow>
      <Display className="text-4xl">Tu radar de crecimiento</Display>
    </div>
  );
}
