import { DocTitle } from "@/components/marketing/LocalizedText";
import { PlatformLanding } from "@/components/marketing/platform/PlatformLanding";

export const metadata = { title: "Plataforma · Human Growth" };

export default function PlataformaPage() {
  return (
    <>
      <DocTitle k="meta.platform" />
      <PlatformLanding />
    </>
  );
}
