import { redirect } from "next/navigation";

import { PageBottomIsotype } from "@/components/marketing/PageBottomIsotype";
import PricingTable from "@/components/marketing/PricingTable";
import { showPricing } from "@/lib/flags";

export const metadata = { title: "Precios — Human Growth" };

export default function PricingPage() {
  // Flag off (default) → la ruta redirige a home. El archivo se mantiene para
  // reactivar flippeando NEXT_PUBLIC_SHOW_PRICING, sin recuperar código.
  if (!showPricing()) redirect("/");
  return (
    <div className="landing-flow">
      <PricingTable />
      <PageBottomIsotype />
    </div>
  );
}
