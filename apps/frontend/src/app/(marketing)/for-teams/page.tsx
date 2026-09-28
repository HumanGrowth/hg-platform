import { DocTitle } from "@/components/marketing/LocalizedText";
import { ForTeamsContent } from "@/components/marketing/ForTeamsContent";

export const metadata = { title: "Para Equipos — Human Growth" };

export default function ForTeamsPage() {
  return (
    <>
      <DocTitle k="meta.forTeams" />
      <ForTeamsContent />
    </>
  );
}
