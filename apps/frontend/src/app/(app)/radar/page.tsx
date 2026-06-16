import { RadarView } from "@/components/radar/RadarView";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";

export const metadata = { title: "Mi Radar — Human Growth" };

export default function RadarPage() {
  return (
    <div className="mx-auto max-w-app px-6 py-10">
      <Eyebrow className="mb-2">Mi Radar</Eyebrow>
      <Display className="mb-8 text-4xl">Tu radar de crecimiento</Display>
      {/* completed se determinará por user_pillar_states cuando el motor esté listo. */}
      <RadarView />
    </div>
  );
}
