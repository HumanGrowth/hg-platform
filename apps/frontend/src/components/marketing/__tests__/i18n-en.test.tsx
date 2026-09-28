import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/",
}));

import MetodoPage from "@/app/(marketing)/metodo/page";
import ContactForm from "@/components/marketing/ContactForm";
import { ForTeamsContent } from "@/components/marketing/ForTeamsContent";
import Footer from "@/components/marketing/Footer";
import Hero from "@/components/marketing/Hero";
import { MarketingLanguageProvider } from "@/components/marketing/LanguageProvider";
import Nav from "@/components/marketing/Nav";
import PathsCatalog from "@/components/marketing/PathsCatalog";
import { PathsHero } from "@/components/marketing/PathsHero";
import { PerspectivasHero } from "@/components/marketing/PerspectivasHero";
import { PlatformLanding } from "@/components/marketing/platform/PlatformLanding";
import PricingTable from "@/components/marketing/PricingTable";
import { ProductStack } from "@/components/marketing/ProductStack";
import SixDimensions from "@/components/marketing/SixDimensions";

// Guardia: en EN no debe quedar español visible (acentos, ¿ ¡) en el DOM.
// Los `value` de <option> son ids que viajan al backend y se ignoran.
const SPANISH = /[áéíóúñ¿¡]/;

const PAGES: Record<string, React.ReactElement> = {
  Hero: <Hero />,
  Nav: <Nav />,
  Footer: <Footer />,
  SixDimensions: <SixDimensions />,
  ProductStack: <ProductStack />,
  Plataforma: <PlatformLanding />,
  Metodo: <MetodoPage />,
  Paths: (
    <>
      <PathsHero />
      <PathsCatalog />
    </>
  ),
  Perspectivas: <PerspectivasHero />,
  ForTeams: <ForTeamsContent />,
  Contact: <ContactForm />,
  Pricing: <PricingTable />,
};

describe("marketing i18n · EN", () => {
  beforeEach(() => {
    // jsdom + Node reciente: localStorage nativo no es funcional → stub en memoria.
    const store: Record<string, string> = { "hg:marketing-lang": "en" };
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => void (store[k] = v),
        removeItem: (k: string) => void delete store[k],
      },
    });
  });

  for (const [name, ui] of Object.entries(PAGES)) {
    it(`${name} has no Spanish text`, async () => {
      const { container } = render(<MarketingLanguageProvider>{ui}</MarketingLanguageProvider>);
      await waitFor(() => expect(document.documentElement.lang).toBe("en"));
      const html = container.innerHTML.replace(/value="[^"]*"/g, "");
      const hit = html.match(new RegExp(`.{0,40}${SPANISH.source}.{0,40}`));
      expect(hit?.[0] ?? null).toBeNull();
    });
  }

  it("hero rotating words follow the language", async () => {
    const { container } = render(
      <MarketingLanguageProvider>
        <Hero />
      </MarketingLanguageProvider>,
    );
    await waitFor(() => expect(container.textContent).toContain("Inner peace"));
    expect(container.textContent).not.toContain("Paz interior");
  });
});
