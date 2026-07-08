import { PageBottomIsotype } from "@/components/marketing/PageBottomIsotype";
import PricingTable from "@/components/marketing/PricingTable";

export const metadata = { title: "Precios — Human Growth" };

export default function PricingPage() {
  return (
    <div className="landing-flow">
      <PricingTable />
      <PageBottomIsotype />
    </div>
  );
}
